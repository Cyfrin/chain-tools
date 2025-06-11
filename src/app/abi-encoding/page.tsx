'use client'

import { useState, useEffect } from 'react'
import { AbiCoder, FunctionFragment, Interface, keccak256, toUtf8Bytes } from 'ethers'

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

export default function AbiToolsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('decode')

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">ABI Encoding</h1>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-600 mb-6">
          <button
            onClick={() => setActiveTab('decode')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'decode'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            Decode
          </button>
          <button
            onClick={() => setActiveTab('encode')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'encode'
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

function DecodeTab() {
  const [abiData, setAbiData] = useState('')
  const [signature, setSignature] = useState('')
  const [decodedResult, setDecodedResult] = useState('')
  const [isFunction, setIsFunction] = useState(true)
  const [autoDetect, setAutoDetect] = useState(true)
  const [loading, setLoading] = useState(false)

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
              for (let i = 0; i < fragment.inputs.length; i++) {
                const param = fragment.inputs[i]
                let paramValue = nestedDecoded[i]
                
                // Convert BigInt to string
                if (typeof paramValue === 'bigint') {
                  paramValue = paramValue.toString()
                }
                
                // Recursively decode bytes parameters
                if (param.type === 'bytes' && typeof paramValue === 'string') {
                  paramValue = await decodeNestedBytes(paramValue)
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

  const formatDecodedResult = (data: any, indent: number = 0): string => {
    const spaces = '  '.repeat(indent)
    
    if (isNestedCall(data)) {
      // Format nested function call
      let result = `${spaces}📞 Function: ${data.function}\n`
      result += `${spaces}🔍 Selector: ${data.selector}\n`
      result += `${spaces}📋 Parameters:\n`
      
      for (const [key, value] of Object.entries(data.parameters)) {
        if (isNestedCall(value)) {
          result += `${spaces}  ${key}:\n`
          result += formatDecodedResult(value, indent + 2)
        } else {
          result += `${spaces}  ${key}: ${formatValue(value)}\n`
        }
      }
      
      result += `${spaces}🔤 Raw Data: ${data.raw}\n`
      return result
    } else if (Array.isArray(data)) {
      let result = `${spaces}[\n`
      for (let i = 0; i < data.length; i++) {
        result += `${spaces}  [${i}]: ${formatValue(data[i])}\n`
      }
      result += `${spaces}]\n`
      return result
    } else {
      return `${spaces}${formatValue(data)}\n`
    }
  }

  const formatValue = (value: any): string => {
    if (isNestedCall(value)) {
      return '\n' + formatDecodedResult(value, 1)
    } else {
      return String(value)
    }
  }

  const decodeData = async () => {
    if (!abiData || !signature) {
      setDecodedResult('')
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
        setDecodedResult(`Error parsing signature: ${e}`)
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
      for (let i = 0; i < fragment.inputs.length; i++) {
        const param = fragment.inputs[i]
        let paramValue = decoded[i]
        
        // Convert BigInt to string for JSON serialization
        if (typeof paramValue === 'bigint') {
          paramValue = paramValue.toString()
        }
        
        // Try to decode nested bytes parameters
        if (param.type === 'bytes' && typeof paramValue === 'string') {
          paramValue = await decodeNestedBytes(paramValue)
        }
        
        processedResult[param.name || `param${i}`] = paramValue
      }
      
      // Format the result nicely
      let result = `📞 Function: ${signature}\n📋 Parameters:\n`
      for (const [key, value] of Object.entries(processedResult)) {
        if (isNestedCall(value)) {
          result += `  ${key}:\n`
          result += formatDecodedResult(value, 2)
        } else {
          result += `  ${key}: ${formatValue(value)}\n`
        }
      }
      
      setDecodedResult(result)
    } catch (error) {
      setDecodedResult(`Decoding error: ${error}`)
    }
  }

  // Auto-decode when inputs change
  useEffect(() => {
    decodeData()
  }, [abiData, signature, isFunction])

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
            onChange={(e) => setAutoDetect(e.target.checked)}
            className="mr-2 cursor-pointer"
          />
          <span className="text-sm">Auto-lookup signature</span>
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
          <label htmlFor="results" className="block text-sm font-medium">
            Decoded Result
          </label>
          {decodedResult && (
            <button
              onClick={() => navigator.clipboard.writeText(decodedResult)}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Copy
            </button>
          )}
        </div>
        <textarea
          id="results"
          value={decodedResult}
          readOnly
          className="w-full h-48 p-3 border border-gray-300 rounded-lg dark:border-gray-600 bg-gray-50 dark:bg-gray-800 font-mono text-sm"
        />
      </div>
    </div>
  )
}

function EncodeTab() {
  const [signature, setSignature] = useState('')
  const [jsonData, setJsonData] = useState('')
  const [encodedResult, setEncodedResult] = useState('')

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
      
      // Encode the data
      const encoded = AbiCoder.defaultAbiCoder().encode(fragment.inputs, parsedData)
      
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