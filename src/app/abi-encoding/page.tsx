'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AbiCoder, FunctionFragment, Interface, keccak256, toUtf8Bytes, getAddress, ParamType } from 'ethers'
import AIShareButtons from '@/components/AIShareButtons'
import { isUniswapRouterData, decodeUniswapRouterData, type UniswapDecodeResult, type UniswapRouterCommand, type UniswapPathPool } from '@/lib/uniswap-decoder'
import { isSendToL1Data, decodeSendToL1Data, type SendToL1DecodeResult, ZKSYNC_L1_MESSENGER_ADDRESS } from '@/lib/sendtol1-decoder'
import { parseSolidityDefinitions, resolveStructToParamType, detectRootStructs, type ParamTypeDescriptor } from '@/lib/solidity-struct-parser'

// Client-side cache for signature lookups
const signatureCache = new Map<string, {
  signatures: string[]
  timestamp: number
}>()

const CACHE_TTL = 60 * 60 * 1000 // 1 hour

type TabType = 'encode' | 'decode'
type DecodeMode = 'function' | 'struct'

interface NestedCall {
  _isNestedCall: true
  function: string
  selector: string
  parameters: Record<string, any>
  raw: string
}

interface MultiSendData {
  _isMultiSend: true
  transactions: Array<{
    operation: number
    to: string
    value: string
    dataLength: number
    data: string
  }>
}

// Type guard functions for specialized decoders
const isUniswapResult = (obj: any): obj is UniswapDecodeResult => {
  return obj && typeof obj === 'object' && obj._isUniswapRouter === true
}

const isSendToL1Result = (obj: any): obj is SendToL1DecodeResult => {
  return obj && typeof obj === 'object' && obj._isSendToL1 === true
}

// Configuration for which bytes parameters should be decoded for specific functions
const FUNCTION_DECODE_CONFIG: Record<string, number[]> = {
  // For execTransaction, only decode the 'data' parameter (index 2), not 'signatures' (index 9)
  'execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)': [2],
  // For multiSend, decode the 'transactions' parameter (index 0)
  'multiSend(bytes)': [0],
  // Add more function configurations as needed
}

function AbiToolsPageContent() {
  const [activeTab, setActiveTab] = useState<TabType>('decode')
  const searchParams = useSearchParams()

  // Check URL parameters and set active tab accordingly
  useEffect(() => {
    const data = searchParams.get('data')
    if (data) {
      setActiveTab('decode')
    }
  }, [searchParams])

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">ABI Encoding</h1>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('decode')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-all duration-200 cursor-pointer ${activeTab === 'decode'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
          >
            Decode
          </button>
          <button
            onClick={() => setActiveTab('encode')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-all duration-200 cursor-pointer ${activeTab === 'encode'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
          >
            Encode
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'decode' && <DecodeTab />}
        {activeTab === 'encode' && <EncodeTab />}

        {/* Attribution */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8">
          Inspired by{' '}
          <a
            href="https://openchain.xyz/tools/abi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            OpenChain
          </a>
        </div>
      </div>
    </div>
  )
}

export default function AbiToolsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]"><div className="max-w-2xl mx-auto"><h1 className="text-3xl font-bold mb-8">ABI Encoding</h1><div className="text-center">Loading...</div></div></div>}>
      <AbiToolsPageContent />
    </Suspense>
  )
}

function DecodeTab() {
  const [abiData, setAbiData] = useState('')
  const [signature, setSignature] = useState('')
  const [decodedData, setDecodedData] = useState<any>(null)
  const [showAsJson, setShowAsJson] = useState(false)
  const [isFunction, setIsFunction] = useState(true)
  const [autoDetect, setAutoDetect] = useState(true)
  const [decodeMultiSend, setDecodeMultiSend] = useState(true)
  const [showRawData, setShowRawData] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)
  const [copiedResult, setCopiedResult] = useState(false)
  const [displayContent, setDisplayContent] = useState('')
  const [decodeMode, setDecodeMode] = useState<DecodeMode>('function')
  const [structDefinitions, setStructDefinitions] = useState('')
  const [rootStructName, setRootStructName] = useState('')
  const [detectedRootStructs, setDetectedRootStructs] = useState<string[]>([])
  const searchParams = useSearchParams()

  // Load URL parameters on component mount
  useEffect(() => {
    const data = searchParams.get('data')
    if (data) {
      handleAbiDataChange(data)
    }
  }, [searchParams])

  // Load preferences from localStorage on component mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('abiDecoderPreferences')
    if (savedPreferences) {
      try {
        const prefs = JSON.parse(savedPreferences)
        if (typeof prefs.isFunction === 'boolean') setIsFunction(prefs.isFunction)
        if (typeof prefs.autoDetect === 'boolean') setAutoDetect(prefs.autoDetect)
        if (typeof prefs.decodeMultiSend === 'boolean') setDecodeMultiSend(prefs.decodeMultiSend)
        if (typeof prefs.showRawData === 'boolean') setShowRawData(prefs.showRawData)
        if (prefs.decodeMode === 'function' || prefs.decodeMode === 'struct') setDecodeMode(prefs.decodeMode)
      } catch (e) {
        console.error('Failed to load preferences:', e)
      }
    }
  }, [])

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    const preferences = {
      isFunction,
      autoDetect,
      decodeMultiSend,
      showRawData,
      decodeMode
    }
    localStorage.setItem('abiDecoderPreferences', JSON.stringify(preferences))
  }, [isFunction, autoDetect, decodeMultiSend, showRawData, decodeMode])

  // Auto-detect root structs when definitions change
  useEffect(() => {
    if (!structDefinitions.trim()) {
      setDetectedRootStructs([])
      return
    }
    try {
      const defs = parseSolidityDefinitions(structDefinitions)
      if (defs.structs.size === 0) {
        setDetectedRootStructs([])
        return
      }
      const roots = detectRootStructs(defs)
      setDetectedRootStructs(roots)
      if (roots.length === 1) {
        setRootStructName(roots[0])
      } else if (!roots.includes(rootStructName)) {
        setRootStructName(roots[0] ?? '')
      }
    } catch {
      setDetectedRootStructs([])
    }
  }, [structDefinitions])

  const lookupSignature = async (selector: string) => {
    try {
      setLoading(true)

      // Check client-side cache first
      const cached = signatureCache.get(selector)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        if (cached.signatures.length > 0) {
          setSignature(cached.signatures[0])
        }
        setLoading(false)
        return
      }

      const response = await fetch(`/api/signature-lookup?selector=${selector}`)
      const data = await response.json()

      if (data.signatures && data.signatures.length > 0) {
        // Cache the result
        signatureCache.set(selector, {
          signatures: data.signatures,
          timestamp: Date.now()
        })

        // Use the first (most common) signature
        setSignature(data.signatures[0])
      } else {
        // Cache empty result too
        signatureCache.set(selector, {
          signatures: [],
          timestamp: Date.now()
        })
      }
    } catch (error) {
      console.error('Failed to lookup signature:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAbiDataChange = (value: string) => {
    setAbiData(value)

    if (autoDetect && isFunction && value.length >= 10) {
      const selector = value.startsWith('0x') ? value.substring(0, 10) : '0x' + value.substring(0, 8)
      if (selector.length === 10) {
        lookupSignature(selector)
      }
    }
  }

  const decodeMultiSendData = (data: string): any => {
    try {
      // Remove 0x prefix if present
      let hexData = data.startsWith('0x') ? data.substring(2) : data

      const transactions: any[] = []
      let offset = 0

      while (offset < hexData.length) {
        // Each transaction is packed as:
        // operation (1 byte) + to (20 bytes) + value (32 bytes) + dataLength (32 bytes) + data (variable)

        if (offset + 170 > hexData.length) break // Need at least 85 bytes (170 hex chars) for header

        // Parse operation (1 byte)
        const operation = parseInt(hexData.substring(offset, offset + 2), 16)

        // Validate operation - must be 0 (Call) or 1 (DelegateCall)
        // If not, this is likely not multi-send data
        if (operation !== 0 && operation !== 1) {
          return null
        }

        offset += 2

        // Parse to address (20 bytes)
        const to = '0x' + hexData.substring(offset, offset + 40)
        offset += 40

        // Parse value (32 bytes)
        const valueHex = hexData.substring(offset, offset + 64)
        const value = BigInt('0x' + valueHex).toString()
        offset += 64

        // Parse data length (32 bytes)
        const dataLengthHex = hexData.substring(offset, offset + 64)
        const dataLength = parseInt(dataLengthHex, 16)
        offset += 64

        // Parse data (variable length)
        const txData = dataLength > 0 ? '0x' + hexData.substring(offset, offset + dataLength * 2) : '0x'
        offset += dataLength * 2

        transactions.push({
          operation,
          to,
          value,
          dataLength,
          data: txData
        })
      }

      // Only return multi-send result if we actually found valid transactions
      if (transactions.length > 0) {
        return {
          _isMultiSend: true,
          transactions
        }
      }

      return null
    } catch (e) {
      return null
    }
  }

  const decodeNestedBytes = async (value: string): Promise<any> => {
    if (typeof value === 'string' && value.startsWith('0x') && value.length > 10) {
      try {
        // Try to decode as function call (check if it starts with a function selector)
        if (value.length >= 10) {
          const selector = value.substring(0, 10)

          // Check cache first
          const cached = signatureCache.get(selector)
          let signatures: string[] = []

          if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            signatures = cached.signatures
          } else {
            // Fetch from API
            try {
              const response = await fetch(`/api/signature-lookup?selector=${selector}`)
              const data = await response.json()

              if (data.signatures && data.signatures.length > 0) {
                signatures = data.signatures
                signatureCache.set(selector, {
                  signatures,
                  timestamp: Date.now()
                })
              }
            } catch (e) {
              // Ignore API errors for nested decoding
            }
          }

          if (signatures.length > 0) {
            const sig = signatures[0]
            const fragment = FunctionFragment.from(sig)
            const calldata = value.substring(10)

            try {
              const nestedDecoded = AbiCoder.defaultAbiCoder().decode(fragment.inputs, '0x' + calldata)

              // Recursively decode any nested bytes
              const processedParams: any = {}
              const decodableParams = FUNCTION_DECODE_CONFIG[sig] || null

              for (let i = 0; i < fragment.inputs.length; i++) {
                const param = fragment.inputs[i]
                let paramValue = nestedDecoded[i]

                // Convert BigInt to string
                if (typeof paramValue === 'bigint') {
                  paramValue = paramValue.toString()
                }

                // Recursively decode bytes parameters only if allowed by configuration
                if (param.type === 'bytes' && typeof paramValue === 'string') {
                  // Check if this parameter should be decoded based on function configuration
                  const shouldDecode = decodableParams === null || decodableParams.includes(i)

                  if (shouldDecode) {
                    // First try multi-send decoding if enabled
                    if (decodeMultiSend) {
                      const multiSendResult = decodeMultiSendData(paramValue)
                      if (multiSendResult) {
                        paramValue = multiSendResult
                      } else {
                        paramValue = await decodeNestedBytes(paramValue)
                      }
                    } else {
                      paramValue = await decodeNestedBytes(paramValue)
                    }
                  }
                }

                processedParams[param.name || `param${i}`] = paramValue
              }

              return {
                _isNestedCall: true,
                function: sig,
                selector: selector,
                parameters: processedParams,
                raw: value
              }
            } catch (e) {
              // If decoding fails, just return the raw value
              return value
            }
          }
        }

        // If no function signature found, return the raw value
        return value
      } catch (e) {
        return value
      }
    }

    return value
  }

  const isNestedCall = (obj: any): obj is NestedCall => {
    return obj && typeof obj === 'object' && obj._isNestedCall === true
  }

  const isMultiSend = (obj: any): obj is MultiSendData => {
    return obj && typeof obj === 'object' && obj._isMultiSend === true
  }

  const formatUniswapPath = (path: UniswapPathPool[]): string => {
    if (!path || path.length === 0) return '(empty path)'
    return path.map((pool, i) => {
      if (i === 0) {
        return `${pool.firstAddress} --[${pool.tickSpacing}]--> ${pool.secondAddress}`
      }
      return ` --[${pool.tickSpacing}]--> ${pool.secondAddress}`
    }).join('')
  }

  const formatUniswapCommand = (command: UniswapRouterCommand, indent: number = 0): string => {
    const spaces = '  '.repeat(indent)
    let result = `${spaces}Command: ${command.name}\n`
    result += `${spaces}Parameters:\n`

    for (const param of command.params) {
      if (param.name === 'path' && Array.isArray(param.value)) {
        // Format path specially
        result += `${spaces}  ${param.name}: ${formatUniswapPath(param.value as UniswapPathPool[])}\n`
        result += `${spaces}    (${param.description})\n`
      } else {
        result += `${spaces}  ${param.name}: ${param.value}\n`
        result += `${spaces}    (${param.description})\n`
      }
    }
    return result
  }

  const formatDecodedResult = async (data: any, indent: number = 0, includeRawData: boolean = false): Promise<string> => {
    const spaces = '  '.repeat(indent)

    // Handle Uniswap results
    if (isUniswapResult(data)) {
      let result = `${spaces}Uniswap Universal Router Transaction\n`
      if (data.deadline) {
        const deadlineDate = new Date(parseInt(data.deadline) * 1000)
        result += `${spaces}Deadline: ${data.deadline} (${deadlineDate.toISOString()})\n`
      }
      result += `${spaces}Commands (${data.commands.length}):\n\n`

      for (let i = 0; i < data.commands.length; i++) {
        result += `${spaces}[${i}] ${formatUniswapCommand(data.commands[i], indent + 1)}\n`
      }
      return result
    }

    // Handle sendToL1 results
    if (isSendToL1Result(data)) {
      let result = `${spaces}zkSync sendToL1 Transaction\n`
      result += `${spaces}Executor: ${data.executor}\n`
      result += `${spaces}Salt: ${data.salt}\n`
      result += `${spaces}Operations (${data.operations.length}):\n\n`

      for (let i = 0; i < data.operations.length; i++) {
        const op = data.operations[i]
        result += `${spaces}[${i}] L1 Operation:\n`
        result += `${spaces}  Target: ${op.target}\n`
        result += `${spaces}  Value: ${op.value}\n`
        result += `${spaces}  Calldata: ${op.calldata}\n`

        // Try to decode the nested calldata
        if (op.calldata && op.calldata.length > 10) {
          const nestedDecoded = await decodeNestedBytes(op.calldata)
          if (isNestedCall(nestedDecoded)) {
            result += `${spaces}  Decoded Call:\n`
            result += await formatDecodedResult(nestedDecoded, indent + 2, includeRawData)
          }
        }
        result += '\n'
      }
      return result
    }

    if (isNestedCall(data)) {
      // Format nested function call
      let result = `${spaces}Function: ${data.function}\n`
      result += `${spaces}Selector: ${data.selector}\n`
      result += `${spaces}Parameters:\n`

      for (const [key, value] of Object.entries(data.parameters)) {
        if (isNestedCall(value) || isMultiSend(value)) {
          result += `${spaces}  ${key}:\n`
          result += await formatDecodedResult(value, indent + 2, includeRawData)
        } else {
          result += `${spaces}  ${key}: ${await formatValue(value, includeRawData, indent + 1)}\n`
        }
      }

      if (includeRawData) {
        result += `${spaces}Raw Data: ${data.raw}\n`
      }
      return result
    } else if (isMultiSend(data)) {
      // Format multi-send transactions
      let result = `${spaces}Multi-Send (${data.transactions.length} transactions):\n`

      for (let i = 0; i < data.transactions.length; i++) {
        const tx = data.transactions[i]
        result += `${spaces}  [${i}] Transaction:\n`
        result += `${spaces}    Operation: ${tx.operation} (${tx.operation === 0 ? 'Call' : tx.operation === 1 ? 'DelegateCall' : 'Unknown'})\n`
        result += `${spaces}    To: ${tx.to}\n`
        result += `${spaces}    Value: ${tx.value}\n`
        result += `${spaces}    Data Length: ${tx.dataLength}\n`

        if (tx.data && tx.data !== '0x') {
          // Try to decode the nested transaction data
          const nestedDecoded = await decodeNestedBytes(tx.data)
          if (isNestedCall(nestedDecoded)) {
            result += `${spaces}    Decoded Call:\n`
            result += await formatDecodedResult(nestedDecoded, indent + 3, includeRawData)
          } else {
            result += `${spaces}    Data: ${tx.data}\n`
          }
        } else {
          result += `${spaces}    Data: (empty)\n`
        }
      }

      return result
    } else if (Array.isArray(data)) {
      let result = `${spaces}[\n`
      for (let i = 0; i < data.length; i++) {
        result += `${spaces}  [${i}]: ${await formatValue(data[i], includeRawData, indent + 1)}\n`
      }
      result += `${spaces}]\n`
      return result
    } else {
      return `${spaces}${await formatValue(data, includeRawData, indent)}\n`
    }
  }

  const formatValue = async (value: any, includeRawData: boolean = false, indent: number = 0): Promise<string> => {
    if (isNestedCall(value) || isMultiSend(value)) {
      return '\n' + await formatDecodedResult(value, indent + 1, includeRawData)
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]'
      const spaces = '  '.repeat(indent + 1)
      let result = '\n'
      for (let i = 0; i < value.length; i++) {
        const formatted = await formatValue(value[i], includeRawData, indent + 1)
        result += `${spaces}[${i}]: ${formatted}\n`
      }
      return result.trimEnd()
    }
    if (value !== null && typeof value === 'object') {
      const spaces = '  '.repeat(indent + 1)
      let result = '\n'
      for (const [key, val] of Object.entries(value)) {
        const formatted = await formatValue(val, includeRawData, indent + 1)
        result += `${spaces}${key}: ${formatted}\n`
      }
      return result.trimEnd()
    }
    return String(value)
  }

  const formatJsonAsText = async (data: any, includeRawData: boolean = false): Promise<string> => {
    if (!data) return ''

    if (data.error) {
      return data.error
    }

    // Handle Uniswap results
    if (isUniswapResult(data)) {
      return await formatDecodedResult(data, 0, includeRawData)
    }

    // Handle sendToL1 results
    if (isSendToL1Result(data)) {
      return await formatDecodedResult(data, 0, includeRawData)
    }

    // Handle struct results
    if (data.struct) {
      let result = `Struct: ${data.struct}\nFields:\n`
      for (const [key, value] of Object.entries(data.parameters)) {
        if (isNestedCall(value) || isMultiSend(value)) {
          result += `  ${key}:\n`
          result += await formatDecodedResult(value, 2, includeRawData)
        } else {
          result += `  ${key}: ${await formatValue(value, includeRawData, 1)}\n`
        }
      }
      return result
    }

    // Format the result nicely
    let result = `Function: ${data.function}\nParameters:\n`
    for (const [key, value] of Object.entries(data.parameters)) {
      if (isNestedCall(value) || isMultiSend(value)) {
        result += `  ${key}:\n`
        result += await formatDecodedResult(value, 2, includeRawData)
      } else {
        result += `  ${key}: ${await formatValue(value, includeRawData, 1)}\n`
      }
    }
    return result
  }

  const CopyButton = () => (
    <button
      onClick={async () => {
        const content = showAsJson
          ? JSON.stringify(decodedData, null, 2)
          : await formatJsonAsText(decodedData, showRawData)
        navigator.clipboard.writeText(content)
        setCopiedResult(true)
        setTimeout(() => setCopiedResult(false), 2000)
      }}
      className={`px-3 py-1.5 text-xs text-white rounded-lg transition-colors cursor-pointer ${copiedResult
        ? 'bg-blue-700'
        : 'bg-blue-600 hover:bg-blue-700'
        }`}
    >
      {copiedResult ? 'Copied!' : 'Copy'}
    </button>
  )

  // Update display content when decodedData changes
  useEffect(() => {
    const updateContent = async () => {
      if (!decodedData) {
        setDisplayContent('')
        return
      }

      if (showAsJson) {
        setDisplayContent(JSON.stringify(decodedData, null, 2))
      } else {
        const textContent = await formatJsonAsText(decodedData, showRawData)
        setDisplayContent(textContent)
      }
    }

    updateContent()
  }, [decodedData, showAsJson, showRawData])

  const processDecodedValue = (value: any): any => {
    if (typeof value === 'bigint') {
      return value.toString()
    }
    if (Array.isArray(value)) {
      return value.map(processDecodedValue)
    }
    if (value && typeof value === 'object' && typeof value.toArray === 'function') {
      return value.toArray().map(processDecodedValue)
    }
    return value
  }

  const buildStructResult = (
    decoded: any,
    descriptor: ParamTypeDescriptor
  ): Record<string, any> => {
    const result: Record<string, any> = {}
    const components = descriptor.components ?? []
    for (let i = 0; i < components.length; i++) {
      const comp = components[i]
      let val = decoded[i]
      if (comp.type === 'tuple' && comp.components) {
        val = buildStructResult(val, comp)
      } else if (
        comp.type.startsWith('tuple[') && comp.components
      ) {
        const arr = Array.isArray(val) ? val
          : (val?.toArray ? val.toArray() : [])
        val = arr.map(
          (item: any) => buildStructResult(item, comp)
        )
      } else {
        val = processDecodedValue(val)
      }
      result[comp.name] = val
    }
    return result
  }

  const decodeData = async () => {
    if (!abiData) {
      setDecodedData(null)
      return
    }

    if (decodeMode === 'struct') {
      if (!structDefinitions.trim() || !rootStructName) {
        setDecodedData(null)
        return
      }
      try {
        const defs = parseSolidityDefinitions(structDefinitions)
        const descriptor = resolveStructToParamType(
          rootStructName, defs
        )
        const paramType = ParamType.from(descriptor)

        let data = abiData.trim()
        if (!data.startsWith('0x')) data = '0x' + data

        const decoded = AbiCoder.defaultAbiCoder().decode(
          [paramType], data
        )
        const fields = buildStructResult(
          decoded[0], descriptor
        )

        setDecodedData({
          struct: rootStructName,
          parameters: fields,
        })
      } catch (error) {
        setDecodedData({
          error: `Struct decode error: ${error instanceof Error ? error.message : error}`
        })
      }
      return
    }

    // If auto-detect is enabled, try specialized decoders first
    if (autoDetect && isFunction) {
      // Try Uniswap decoder
      if (isUniswapRouterData(abiData)) {
        try {
          const uniswapResult = decodeUniswapRouterData(abiData)
          if (uniswapResult) {
            setDecodedData(uniswapResult)
            return
          } else {
            setDecodedData({ error: 'Failed to decode Uniswap router data. The data format may be invalid.' })
            return
          }
        } catch (e) {
          setDecodedData({ error: `Uniswap decode error: ${e}` })
          return
        }
      }

      // Try sendToL1 decoder
      if (isSendToL1Data(abiData)) {
        try {
          const sendToL1Result = decodeSendToL1Data(abiData)
          if (sendToL1Result) {
            setDecodedData(sendToL1Result)
            return
          } else {
            setDecodedData({ error: 'Failed to decode sendToL1 data. The data format may be invalid.' })
            return
          }
        } catch (e) {
          setDecodedData({ error: `sendToL1 decode error: ${e}` })
          return
        }
      }
    }

    // Require signature for standard ABI decoding
    if (!signature) {
      setDecodedData(null)
      return
    }

    try {
      let data = abiData.trim()
      if (data.startsWith('0x')) data = data.substring(2)

      // Parse signature
      let fragment: FunctionFragment
      try {
        fragment = FunctionFragment.from(signature)
      } catch (e) {
        setDecodedData({ error: `Error parsing signature: ${e}` })
        return
      }

      // Remove function selector if it's a function call
      if (isFunction && data.length >= 8) {
        data = data.substring(8)
      }

      // Decode the data
      const decoded = AbiCoder.defaultAbiCoder().decode(fragment.inputs, '0x' + data)

      // Process each parameter and decode nested bytes
      const processedResult: any = {}
      const decodableParams = FUNCTION_DECODE_CONFIG[signature] || null

      for (let i = 0; i < fragment.inputs.length; i++) {
        const param = fragment.inputs[i]
        let paramValue = decoded[i]

        // Convert BigInt to string for JSON serialization
        if (typeof paramValue === 'bigint') {
          paramValue = paramValue.toString()
        }

        // Try to decode nested bytes parameters only if allowed by configuration
        if (param.type === 'bytes' && typeof paramValue === 'string') {
          // Check if this parameter should be decoded based on function configuration
          const shouldDecode = decodableParams === null || decodableParams.includes(i)

          if (shouldDecode) {
            // First try multi-send decoding if enabled
            if (decodeMultiSend) {
              const multiSendResult = decodeMultiSendData(paramValue)
              if (multiSendResult) {
                paramValue = multiSendResult
              } else {
                paramValue = await decodeNestedBytes(paramValue)
              }
            } else {
              paramValue = await decodeNestedBytes(paramValue)
            }
          }
        }

        processedResult[param.name || `param${i}`] = paramValue
      }

      // Store as JSON structure
      const result = {
        function: signature,
        parameters: processedResult
      }

      setDecodedData(result)
    } catch (error) {
      setDecodedData({ error: `Decoding error: ${error}` })
    }
  }

  // Auto-decode when inputs change
  useEffect(() => {
    decodeData()
  }, [abiData, signature, isFunction, decodeMultiSend, autoDetect, decodeMode, structDefinitions, rootStructName])

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>ABI Decoder:</strong> {decodeMode === 'function'
            ? 'Decode ABI-encoded data from smart contract function calls. The tool can automatically detect function signatures using the 4byte directory and recursively decode nested bytes parameters.'
            : 'Decode raw ABI-encoded struct data by providing Solidity struct and enum definitions.'}
        </p>
      </div>

      {/* ABI Data Input */}
      <div>
        <label htmlFor="abi-data" className="block text-sm font-medium mb-2">
          ABI Data
        </label>
        <textarea
          id="abi-data"
          value={abiData}
          onChange={(e) => handleAbiDataChange(e.target.value)}
          placeholder="0x095ea7b3000000000000000000000000..."
          className="w-full h-32 p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 font-mono text-sm transition-colors"
        />
        <p className="text-xs text-gray-500 mt-1">Raw ABI-encoded data (with or without 0x prefix)</p>
      </div>

      {/* Options */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl space-y-3">
        {/* Decode Mode Toggle */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">Mode:</span>
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setDecodeMode('function')}
              className={`px-3 py-1 text-xs rounded-md transition-all cursor-pointer ${decodeMode === 'function'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Function
            </button>
            <button
              onClick={() => setDecodeMode('struct')}
              className={`px-3 py-1 text-xs rounded-md transition-all cursor-pointer ${decodeMode === 'struct'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Struct
            </button>
          </div>
        </div>

        {decodeMode === 'function' && (
          <>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isFunction}
                onChange={(e) => setIsFunction(e.target.checked)}
                className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm">Data includes function selector</span>
            </label>

            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoDetect}
                onChange={(e) => {
                  const newValue = e.target.checked
                  setAutoDetect(newValue)
                  if (newValue) {
                    setSignature('')
                  }
                }}
                className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm">Auto-lookup signature</span>
            </label>

            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={decodeMultiSend}
                onChange={(e) => setDecodeMultiSend(e.target.checked)}
                className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm">Decode multi-send transactions</span>
            </label>
          </>
        )}

        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showRawData}
            onChange={(e) => setShowRawData(e.target.checked)}
            className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
          />
          <span className="text-sm">Show raw data in decoded results</span>
        </label>
      </div>

      {/* Signature / Struct Definitions Input */}
      {decodeMode === 'function' ? (
        <div>
          <label htmlFor="signature" className="block text-sm font-medium mb-2">
            Function Signature {loading && <span className="text-blue-500 animate-pulse">(Loading...)</span>}
          </label>
          <input
            id="signature"
            type="text"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="transfer(address,uint256)"
            disabled={autoDetect}
            className="w-full p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 font-mono text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          />
          <p className="text-xs text-gray-500 mt-1">Function signature or full ABI JSON</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="struct-definitions" className="block text-sm font-medium mb-2">
              Struct Definitions (Solidity)
            </label>
            <textarea
              id="struct-definitions"
              value={structDefinitions}
              onChange={(e) => setStructDefinitions(e.target.value)}
              placeholder={`struct MyStruct {\n    address owner;\n    uint256 amount;\n    string name;\n}\n\nenum Status { Active, Paused }`}
              className="w-full h-48 p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 font-mono text-sm transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">
              Paste Solidity struct and enum definitions. Comments and pragmas are stripped automatically.
            </p>
          </div>

          {detectedRootStructs.length > 0 && (
            <div>
              <label htmlFor="root-struct" className="block text-sm font-medium mb-2">
                Root Struct
              </label>
              <select
                id="root-struct"
                value={rootStructName}
                onChange={(e) => setRootStructName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 text-sm transition-colors cursor-pointer"
              >
                {detectedRootStructs.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {detectedRootStructs.length === 1
                  ? 'Auto-detected as the top-level struct'
                  : 'Select which struct to decode the data as'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-4">
            <label htmlFor="results" className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Decoded Result
            </label>
            {decodedData && (
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
                <button
                  onClick={() => setShowAsJson(false)}
                  className={`px-3 py-1 text-xs rounded-md transition-all cursor-pointer ${!showAsJson
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  Text
                </button>
                <button
                  onClick={() => setShowAsJson(true)}
                  className={`px-3 py-1 text-xs rounded-md transition-all cursor-pointer ${showAsJson
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  JSON
                </button>
              </div>
            )}
          </div>
          {decodedData && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const url = new URL(window.location.href)
                  url.searchParams.set('data', abiData)
                  navigator.clipboard.writeText(url.toString())
                  setCopiedShare(true)
                  setTimeout(() => setCopiedShare(false), 2000)
                }}
                className={`px-3 py-1.5 text-xs text-white rounded-lg transition-colors cursor-pointer ${copiedShare
                  ? 'bg-green-700'
                  : 'bg-green-600 hover:bg-green-700'
                  }`}
              >
                {copiedShare ? 'Copied!' : 'Share'}
              </button>
              <CopyButton />
              <button
                onClick={() => {
                  const url = new URL(window.location.origin + '/safe-hash')
                  url.searchParams.set('data', abiData)
                  window.open(url.toString(), '_blank')
                }}
                className="px-3 py-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
              >
                Send to Safe Hash Calculator ↗
              </button>
            </div>
          )}
        </div>
        <textarea
          id="results"
          value={displayContent}
          readOnly
          className="w-full h-48 p-3 border border-blue-200 dark:border-blue-700 rounded-xl bg-white dark:bg-gray-800 font-mono text-sm"
        />

        {/* AI Share Buttons */}
        {decodedData && !decodedData.error && (
          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Get AI help understanding this data:</p>
            <AIShareButtons
              data={displayContent}
              context="ABI Decoder"
            />
          </div>
        )}
      </div>

      {/* Example section */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Examples</h3>
        <div className="space-y-4 text-sm">
          {decodeMode === 'function' ? (
            <>
              <div>
                <span className="font-medium">Multi-Send Transaction:</span>
                <button
                  onClick={() => {
                    setAbiData('0x8d80ff0a000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000f200a1f75f491f630037c4ccaa2bfa22363cec05a66100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044e2a9d5540000000000000000000000000000000000000000000000000000001b000000000000000000000000000000000000000000000000000000000000000068218e6000123450011cb3166a63d4523b2496ecc1fea665bb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004eafb2ef30000000000000000000000000000')
                    setSignature('multiSend(bytes)')
                    setIsFunction(true)
                    setAutoDetect(true)
                    setDecodeMultiSend(true)
                  }}
                  className="ml-2 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Try Example
                </button>
                <div className="text-gray-600 dark:text-gray-400 mt-1">
                  <p>Safe wallet multi-send transaction with 2 batched calls.</p>
                </div>
              </div>

              <div>
                <span className="font-medium">Safe Wallet execTransaction:</span>
                <button
                  onClick={() => {
                    setAbiData('0x6a76120200000000000000000000000078e30497a3c7527d953c6b1e3541b021a98ac43c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000084617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041000000000000000000000000F8Cade19b26a2B970F2dEF5eA9ECcF1bda3d118600000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000')
                    setSignature('execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)')
                    setIsFunction(true)
                    setAutoDetect(true)
                    setDecodeMultiSend(true)
                  }}
                  className="ml-2 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Try Example
                </button>
                <div className="text-gray-600 dark:text-gray-400 mt-1">
                  <p>Safe wallet transaction with nested function call (supply).</p>
                </div>
              </div>

              <div>
                <span className="font-medium">Uniswap Universal Router:</span>
                <button
                  onClick={() => {
                    setAbiData('0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000065f5e10000000000000000000000000000000000000000000000000000000000000000020b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000016345785d8a000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000016345785d8a00000000000000000000000000000000000000000000000000000000000002faf08000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002bc02aaa39b223fe8d0a0e5c4f27ead9083c756cc20001f4a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000')
                    setSignature('')
                    setIsFunction(true)
                    setAutoDetect(true)
                  }}
                  className="ml-2 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Try Example
                </button>
                <div className="text-gray-600 dark:text-gray-400 mt-1">
                  <p>Uniswap V3 swap (WETH → USDC) with automatic command decoding.</p>
                </div>
              </div>

              <div className="text-gray-600 dark:text-gray-400">
                <p>Enable &ldquo;Auto-lookup signature&rdquo; to automatically detect and decode Uniswap transactions.</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="font-medium">AgreementDetailsV1 Struct:</span>
                <button
                  onClick={() => {
                    setStructDefinitions(`struct AgreementDetailsV1 {
    string protocolName;
    Contact[] contactDetails;
    Chain[] chains;
    BountyTerms bountyTerms;
    string agreementURI;
}

struct Contact {
    string name;
    string contact;
}

struct Chain {
    address assetRecoveryAddress;
    Account[] accounts;
    uint256 id;
}

struct Account {
    address accountAddress;
    ChildContractScope childContractScope;
    bytes signature;
}

enum ChildContractScope {
    None,
    ExistingOnly,
    All
}

struct BountyTerms {
    uint256 bountyPercentage;
    uint256 bountyCapUSD;
    bool retainable;
    IdentityRequirements identity;
    string diligenceRequirements;
}

enum IdentityRequirements {
    Anonymous,
    Pseudonymous,
    Named
}`)
                    setRootStructName('AgreementDetailsV1')
                    setAbiData('0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000070000000000000000000000000000000000000000000000000000000000000007e0000000000000000000000000000000000000000000000000000000000000000953616e64636c6f636b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000001673656375726974794073616e64636c6f636b2e6f726700000000000000000000000000000000000000000000000000000000000000000000000000000000000953616e64636c6f636b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000006cf38285fdfaf8d67205ca444a899025b5b18e8300000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000700000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000026000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000036000000000000000000000000000000000000000000000000000000000000003e00000000000000000000000004c406c068106375724275cbff028770c544a1333000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000096697720056886b905d0deb0f06affb8e4665e5000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000db369eeb33fcfdcd1557e354ddee7d6cf3146a11000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000237ecdf745d2a0052aeaf6f027ce82f77431871e0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000fc97657b67c7e7bd4100c72851d0377da14b47000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016f3cda06743a58bdde123687f99e80dcbc28d140000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a36f9565c6fb862509ad8d148941968344a55d8000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000044e6f6e6500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005f68747470733a2f2f62616679626569616b78767973647673767570716369626b70696675677a77636e6c6c7a743275646a6b336c3479686369783764717878717970342e697066732e7733732e6c696e6b2f61677265656d656e742e70646600')
                  }}
                  className="ml-2 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Try Example
                </button>
                <div className="text-gray-600 dark:text-gray-400 mt-1">
                  <p>Seal 911 agreement struct with nested contacts, chains, accounts, and bounty terms.</p>
                </div>
              </div>

              <div className="text-gray-600 dark:text-gray-400">
                <p>Paste Solidity struct and enum definitions, then provide the raw ABI-encoded data (no function selector).</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function EncodeTab() {
  const [signature, setSignature] = useState('')
  const [jsonData, setJsonData] = useState('')
  const [encodedResult, setEncodedResult] = useState('')

  const normalizeAddresses = (data: any[], fragment: FunctionFragment): any[] => {
    return data.map((value, index) => {
      const param = fragment.inputs[index]
      if (param && param.type === 'address' && typeof value === 'string') {
        try {
          // Normalize address checksum
          return getAddress(value.toLowerCase())
        } catch (e) {
          // If it's not a valid address, return as is and let ethers handle the error
          return value
        }
      }
      return value
    })
  }

  const encodeData = () => {
    if (!signature || !jsonData) {
      setEncodedResult('')
      return
    }

    try {
      // Parse the JSON data
      const parsedData = JSON.parse(jsonData)

      // Parse the function signature
      const fragment = FunctionFragment.from(signature)

      // Normalize addresses in the data
      const normalizedData = normalizeAddresses(parsedData, fragment)

      // Encode the data
      const encoded = AbiCoder.defaultAbiCoder().encode(fragment.inputs, normalizedData)

      // Add function selector
      const result = fragment.selector + encoded.substring(2)
      setEncodedResult(result)
    } catch (error) {
      setEncodedResult(`Encoding error: ${error}`)
    }
  }

  // Auto-encode when inputs change
  useEffect(() => {
    encodeData()
  }, [signature, jsonData])

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>ABI Encoder:</strong> Encode function parameters into ABI format for smart contract interactions.
          Provide the function signature and parameters as a JSON array.
        </p>
      </div>

      {/* Function Signature Input */}
      <div>
        <label htmlFor="signature" className="block text-sm font-medium mb-2">
          Function Signature
        </label>
        <input
          id="signature"
          type="text"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="transfer(address,uint256)"
          className="w-full p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 font-mono text-sm transition-colors"
        />
        <p className="text-xs text-gray-500 mt-1">Function signature (e.g., transfer(address,uint256))</p>
      </div>

      {/* JSON Data Input */}
      <div>
        <label htmlFor="json-data" className="block text-sm font-medium mb-2">
          Parameters (JSON Array)
        </label>
        <textarea
          id="json-data"
          value={jsonData}
          onChange={(e) => setJsonData(e.target.value)}
          placeholder='["0x742d35Cc6634C0532925a3b8D9c99fE6e8d8A2A9", "1000000000000000000"]'
          className="w-full h-32 p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 font-mono text-sm transition-colors"
        />
        <p className="text-xs text-gray-500 mt-1">Parameters as JSON array matching the function signature</p>
      </div>

      {/* Results */}
      <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
        <label htmlFor="encoded-result" className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
          Encoded Result
        </label>
        <textarea
          id="encoded-result"
          value={encodedResult}
          readOnly
          className="w-full h-32 p-3 border border-blue-200 dark:border-blue-700 rounded-xl bg-white dark:bg-gray-800 font-mono text-sm"
        />
      </div>

      {/* Example section */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Example</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Function:</span>
            <code className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded">transfer(address,uint256)</code>
          </div>
          <div>
            <span className="font-medium">Parameters:</span>
            <code className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs">["0x742d35Cc6634C0532925a3b8D9c99fE6e8d8A2A9", "1000000000000000000"]</code>
          </div>
        </div>
      </div>
    </div>
  )
}
