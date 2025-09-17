'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AbiCoder, FunctionFragment, Interface, keccak256, toUtf8Bytes, getAddress } from 'ethers'

// Client-side cache for signature lookups
const signatureCache = new Map<string, {
  signatures: string[]
  timestamp: number
}>()

const CACHE_TTL = 60 * 60 * 1000 // 1 hour

type TabType = 'encode' | 'decode'

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
        <div className="flex border-b border-gray-200 dark:border-gray-600 mb-6">
          <button
            onClick={() => setActiveTab('decode')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${activeTab === 'decode'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
          >
            Decode
          </button>
          <button
            onClick={() => setActiveTab('encode')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${activeTab === 'encode'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
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
  const [loading, setLoading] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)
  const [copiedResult, setCopiedResult] = useState(false)
  const searchParams = useSearchParams()

  // Load URL parameters on component mount
  useEffect(() => {
    const data = searchParams.get('data')
    if (data) {
      handleAbiDataChange(data)
    }
  }, [searchParams])

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

  const formatDecodedResult = async (data: any, indent: number = 0): Promise<string> => {
    const spaces = '  '.repeat(indent)

    if (isNestedCall(data)) {
      // Format nested function call
      let result = `${spaces}📞 Function: ${data.function}\n`
      result += `${spaces}🔍 Selector: ${data.selector}\n`
      result += `${spaces}📋 Parameters:\n`

      for (const [key, value] of Object.entries(data.parameters)) {
        if (isNestedCall(value) || isMultiSend(value)) {
          result += `${spaces}  ${key}:\n`
          result += await formatDecodedResult(value, indent + 2)
        } else {
          result += `${spaces}  ${key}: ${await formatValue(value)}\n`
        }
      }

      result += `${spaces}🔤 Raw Data: ${data.raw}\n`
      return result
    } else if (isMultiSend(data)) {
      // Format multi-send transactions
      let result = `${spaces}📦 Multi-Send (${data.transactions.length} transactions):\n`

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
            result += await formatDecodedResult(nestedDecoded, indent + 3)
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
        result += `${spaces}  [${i}]: ${await formatValue(data[i])}\n`
      }
      result += `${spaces}]\n`
      return result
    } else {
      return `${spaces}${await formatValue(data)}\n`
    }
  }

  const formatValue = async (value: any): Promise<string> => {
    if (isNestedCall(value) || isMultiSend(value)) {
      return '\n' + await formatDecodedResult(value, 1)
    } else {
      return String(value)
    }
  }

  const formatJsonAsText = async (data: any): Promise<string> => {
    if (!data) return ''

    if (data.error) {
      return data.error
    }

    // Format the result nicely
    let result = `📞 Function: ${data.function}\n📋 Parameters:\n`
    for (const [key, value] of Object.entries(data.parameters)) {
      if (isNestedCall(value) || isMultiSend(value)) {
        result += `  ${key}:\n`
        result += await formatDecodedResult(value, 2)
      } else {
        result += `  ${key}: ${await formatValue(value)}\n`
      }
    }
    return result
  }

  const CopyButton = () => (
    <button
      onClick={async () => {
        const content = showAsJson
          ? JSON.stringify(decodedData, null, 2)
          : await formatJsonAsText(decodedData)
        navigator.clipboard.writeText(content)
        setCopiedResult(true)
        setTimeout(() => setCopiedResult(false), 2000)
      }}
      className={`px-3 py-1 text-xs text-white rounded transition-colors cursor-pointer w-16 whitespace-nowrap ${copiedResult
        ? 'bg-green-700'
        : 'bg-green-600 hover:bg-green-700'
        }`}
    >
      {copiedResult ? 'Copied!' : 'Copy'}
    </button>
  )

  const DisplayArea = () => {
    const [displayContent, setDisplayContent] = useState('')

    useEffect(() => {
      const updateContent = async () => {
        if (!decodedData) {
          setDisplayContent('')
          return
        }

        if (showAsJson) {
          setDisplayContent(JSON.stringify(decodedData, null, 2))
        } else {
          const textContent = await formatJsonAsText(decodedData)
          setDisplayContent(textContent)
        }
      }

      updateContent()
    }, [decodedData, showAsJson])

    return (
      <textarea
        id="results"
        value={displayContent}
        readOnly
        className="w-full h-48 p-3 border border-gray-300 rounded-lg dark:border-gray-600 bg-gray-50 dark:bg-gray-800 font-mono text-sm"
      />
    )
  }

  const decodeData = async () => {
    if (!abiData || !signature) {
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
  }, [abiData, signature, isFunction, decodeMultiSend])

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>ABI Decoder:</strong> Decode ABI-encoded data from smart contract function calls.
          The tool can automatically detect function signatures using the 4byte directory and recursively decode nested bytes parameters.
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
          className="w-full h-32 p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">Raw ABI-encoded data (with or without 0x prefix)</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isFunction}
            onChange={(e) => setIsFunction(e.target.checked)}
            className="mr-2 cursor-pointer"
          />
          <span className="text-sm">Data includes function selector</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={autoDetect}
            onChange={(e) => {
              const newValue = e.target.checked
              setAutoDetect(newValue)
              // Clear signature when toggling auto-detect
              if (newValue) {
                setSignature('') // Clear manual signature when enabling auto-detect
              }
            }}
            className="mr-2 cursor-pointer"
          />
          <span className="text-sm">Auto-lookup signature</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={decodeMultiSend}
            onChange={(e) => setDecodeMultiSend(e.target.checked)}
            className="mr-2 cursor-pointer"
          />
          <span className="text-sm">Decode multi-send transactions</span>
        </label>
      </div>

      {/* Signature Input */}
      <div>
        <label htmlFor="signature" className="block text-sm font-medium mb-2">
          Function Signature {loading && <span className="text-blue-500">(Loading...)</span>}
        </label>
        <input
          id="signature"
          type="text"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="transfer(address,uint256)"
          disabled={autoDetect}
          className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 font-mono text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700"
        />
        <p className="text-xs text-gray-500 mt-1">Function signature or full ABI JSON</p>
      </div>

      {/* Results */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-4">
            <label htmlFor="results" className="block text-sm font-medium">
              Decoded Result
            </label>
            {decodedData && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAsJson(false)}
                  className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer ${!showAsJson
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                >
                  Text
                </button>
                <button
                  onClick={() => setShowAsJson(true)}
                  className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer ${showAsJson
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
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
                className={`px-3 py-1 text-xs text-white rounded transition-colors cursor-pointer w-32 whitespace-nowrap ${copiedShare
                  ? 'bg-green-700'
                  : 'bg-green-600 hover:bg-green-700'
                  }`}
              >
                {copiedShare ? 'Copied!' : 'Share Decoded Data'}
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
        <DisplayArea />
      </div>

      {/* Example section */}
      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Examples</h3>
        <div className="space-y-4 text-sm">
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
              className="ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer"
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
              className="ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Try Example
            </button>
            <div className="text-gray-600 dark:text-gray-400 mt-1">
              <p>Safe wallet transaction with nested function call (supply).</p>
            </div>
          </div>

          <div className="text-gray-600 dark:text-gray-400">
            <p>Enable "Decode multi-send transactions" to see nested transaction parsing.</p>
          </div>
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
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
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
          className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 font-mono text-sm"
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
          className="w-full h-32 p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">Parameters as JSON array matching the function signature</p>
      </div>

      {/* Results */}
      <div>
        <label htmlFor="encoded-result" className="block text-sm font-medium mb-2">
          Encoded Result
        </label>
        <textarea
          id="encoded-result"
          value={encodedResult}
          readOnly
          className="w-full h-32 p-3 border border-gray-300 rounded-lg dark:border-gray-600 bg-gray-50 dark:bg-gray-800 font-mono text-sm"
        />
      </div>

      {/* Example section */}
      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Example</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Function:</span>
            <code className="ml-2 text-blue-600 dark:text-blue-400">transfer(address,uint256)</code>
          </div>
          <div>
            <span className="font-medium">Parameters:</span>
            <code className="ml-2 text-blue-600 dark:text-blue-400">["0x742d35Cc6634C0532925a3b8D9c99fE6e8d8A2A9", "1000000000000000000"]</code>
          </div>
        </div>
      </div>
    </div>
  )
}