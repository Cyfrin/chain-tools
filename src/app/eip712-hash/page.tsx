'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import AIShareButtons from '@/components/AIShareButtons';

interface EIP712HashResult {
  domainHash: string;
  messageHash: string;
  eip712Hash: string;
}

export default function EIP712Hash() {
  const [jsonInput, setJsonInput] = useState('');
  const [result, setResult] = useState<EIP712HashResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const calculateEIP712Hash = async (eip712Data: any): Promise<EIP712HashResult> => {
    try {
      const domain = eip712Data.domain;
      const types = { ...eip712Data.types };
      const message = eip712Data.message;
      const primaryType = eip712Data.primaryType;

      // Remove EIP712Domain from types as ethers handles it separately
      delete types.EIP712Domain;

      // Calculate domain hash
      const domainHash = ethers.TypedDataEncoder.hashDomain(domain);

      // Calculate message hash (struct hash of the message)
      const messageHash = ethers.TypedDataEncoder.hashStruct(primaryType, types, message);

      // Calculate EIP-712 digest (the final signing hash)
      const eip712Hash = ethers.TypedDataEncoder.hash(domain, types, message);

      return {
        domainHash,
        messageHash,
        eip712Hash
      };
    } catch (err) {
      throw new Error(`Failed to calculate EIP-712 hash: ${err}`);
    }
  };

  const handleCalculate = async () => {
    if (!jsonInput.trim()) {
      setError('Please enter EIP-712 JSON data');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const eip712Data = JSON.parse(jsonInput);

      // Validate required fields
      if (!eip712Data.types || !eip712Data.domain || !eip712Data.message || !eip712Data.primaryType) {
        throw new Error('Invalid EIP-712 format. Missing required fields: types, domain, message, or primaryType');
      }

      const hashResult = await calculateEIP712Hash(eip712Data);
      setResult(hashResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setJsonInput(content);
      };
      reader.readAsText(file);
    }
  };

  const loadExample = () => {
    const exampleEIP712 = {
      "types": {
        "Person": [
          { "name": "name", "type": "string" },
          { "name": "wallet", "type": "address" }
        ],
        "Mail": [
          { "name": "from", "type": "Person" },
          { "name": "to", "type": "Person" },
          { "name": "contents", "type": "string" }
        ]
      },
      "domain": {
        "name": "Ether Mail",
        "version": "1",
        "chainId": 1,
        "verifyingContract": "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
      },
      "primaryType": "Mail",
      "message": {
        "from": {
          "name": "Cow",
          "wallet": "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"
        },
        "to": {
          "name": "Bob",
          "wallet": "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"
        },
        "contents": "Hello, Bob!"
      }
    };
    setJsonInput(JSON.stringify(exampleEIP712, null, 2));
  };

  const getResultsData = () => {
    if (!result) return '';
    return `EIP-712 Hash Results:

Input JSON:
${jsonInput}

Calculated Hashes:
- Domain Hash: ${result.domainHash}
- Message Hash: ${result.messageHash}
- EIP-712 Digest (Signing Hash): ${result.eip712Hash}`;
  };

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-3xl font-bold mb-8">EIP-712 Hash Calculator</h1>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium">
                  EIP-712 JSON Data
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={loadExample}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium cursor-pointer transition-colors"
                  >
                    Load Example
                  </button>
                  <label className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium cursor-pointer transition-colors">
                    Upload File
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste your EIP-712 JSON data here..."
                className="w-full h-80 p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 font-mono text-sm transition-colors"
              />

              <button
                onClick={handleCalculate}
                disabled={loading || !jsonInput.trim()}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'Calculating...' : 'Calculate Hash'}
              </button>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Results</h3>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                  <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <h4 className="font-medium mb-2 text-sm text-gray-600 dark:text-gray-400">Domain Hash</h4>
                    <p className="font-mono text-sm break-all">
                      {result.domainHash}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <h4 className="font-medium mb-2 text-sm text-gray-600 dark:text-gray-400">Message Hash</h4>
                    <p className="font-mono text-sm break-all">
                      {result.messageHash}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">EIP-712 Digest</h4>
                    <p className="font-mono text-sm text-blue-800 dark:text-blue-200 break-all">
                      {result.eip712Hash}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                      This is the hash that will be signed
                    </p>
                  </div>

                  {/* AI Share Buttons */}
                  <div className="pt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Get AI help understanding these hashes:</p>
                    <AIShareButtons
                      data={getResultsData()}
                      context="EIP-712 Hash Calculator"
                    />
                  </div>
                </div>
              )}

              {!result && !error && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">Enter EIP-712 JSON data and click "Calculate Hash" to see results</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
