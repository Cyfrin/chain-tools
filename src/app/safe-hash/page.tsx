'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import Link from 'next/link';

interface SafeHashResult {
  domainHash: string;
  messageHash: string;
  safeTransactionHash: string;
}

interface SafeTransaction {
  to: string;
  value: string;
  data: string;
  operation: number;
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
  nonce: string;
}

const CHAIN_IDS: { [key: string]: number } = {
  ethereum: 1,
  sepolia: 11155111,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  polygon: 137,
  scroll: 534352,
  linea: 59144,
  zksync: 324,
  polygonzkevm: 1101,
  worldchain: 480,
  unichain: 1301,
  soneium: 1946,
};

const SAFE_VERSIONS = ['1.4.1', '1.3.0', '1.2.0', '1.1.1', '1.0.0'];

export default function SafeHash() {
  const [transaction, setTransaction] = useState<SafeTransaction>({
    to: '',
    value: '0',
    data: '0x',
    operation: 0,
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: '0x0000000000000000000000000000000000000000',
    refundReceiver: '0x0000000000000000000000000000000000000000',
    nonce: '0',
  });

  const [safeAddress, setSafeAddress] = useState('');
  const [chainId, setChainId] = useState('ethereum');
  const [safeVersion, setSafeVersion] = useState('1.4.1');
  const [result, setResult] = useState<SafeHashResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const calculateSafeHash = async (): Promise<SafeHashResult> => {
    try {
      const selectedChainId = CHAIN_IDS[chainId];
      const [majorVersion, minorVersion] = safeVersion.split('.').map(Number);
      const isVersionGte130 = majorVersion > 1 || (majorVersion === 1 && minorVersion >= 3);

      // Calculate domain hash based on Safe version
      let domainData;
      if (isVersionGte130) {
        domainData = {
          chainId: selectedChainId,
          verifyingContract: safeAddress
        };
      } else {
        domainData = {
          verifyingContract: safeAddress
        };
      }

      const domainHash = ethers.TypedDataEncoder.hashDomain(domainData);

      // Calculate message hash based on Safe version
      const safeTypeName = majorVersion >= 1 ? 'SafeTx' : 'SafeTx';
      const baseGasFieldName = isVersionGte130 ? 'baseGas' : 'dataGas';

      const types = {
        SafeTx: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
          { name: 'operation', type: 'uint8' },
          { name: 'safeTxGas', type: 'uint256' },
          { name: baseGasFieldName, type: 'uint256' },
          { name: 'gasPrice', type: 'uint256' },
          { name: 'gasToken', type: 'address' },
          { name: 'refundReceiver', type: 'address' },
          { name: 'nonce', type: 'uint256' }
        ]
      };

      const message = {
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        operation: transaction.operation,
        safeTxGas: transaction.safeTxGas,
        [baseGasFieldName]: transaction.baseGas,
        gasPrice: transaction.gasPrice,
        gasToken: transaction.gasToken,
        refundReceiver: transaction.refundReceiver,
        nonce: transaction.nonce
      };

      const messageHash = ethers.TypedDataEncoder.hashStruct(safeTypeName, types, message);

      // Calculate final Safe transaction hash
      const safeTransactionHash = ethers.TypedDataEncoder.hash(domainData, types, message);

      return {
        domainHash,
        messageHash,
        safeTransactionHash
      };
    } catch (err) {
      throw new Error(`Failed to calculate Safe hash: ${err}`);
    }
  };

  const handleCalculate = async () => {
    if (!safeAddress || !ethers.isAddress(safeAddress)) {
      setError('Please enter a valid Safe address');
      return;
    }

    if (!transaction.to || !ethers.isAddress(transaction.to)) {
      setError('Please enter a valid "to" address');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const hashResult = await calculateSafeHash();
      setResult(hashResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionChange = (field: keyof SafeTransaction, value: string | number) => {
    setTransaction(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const loadExample = () => {
    setSafeAddress('0x1c694Fc3006D81ff4a56F97E1b99529066a23725');
    setTransaction({
      to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      value: '0',
      data: '0xa9059cbb00000000000000000000000092d0ebaf7eb707f0650f9471e61348f4656c29bc00000000000000000000000000000000000000000000000000000005d21dba00',
      operation: 0,
      safeTxGas: '0',
      baseGas: '0',
      gasPrice: '0',
      gasToken: '0x0000000000000000000000000000000000000000',
      refundReceiver: '0x0000000000000000000000000000000000000000',
      nonce: '63',
    });
    setChainId('ethereum');
    setSafeVersion('1.4.1');
  };

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
          >
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-8">Safe Wallet Hash Calculator</h1>

        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Calculate domain hash, message hash, and Safe transaction hash for Safe wallet transactions.
              Verify these values when signing with your hardware wallet.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Transaction Details</h3>
                <button
                  onClick={loadExample}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium cursor-pointer"
                >
                  Load Example
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Safe Address *
                    </label>
                    <input
                      type="text"
                      value={safeAddress}
                      onChange={(e) => setSafeAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Chain
                    </label>
                    <select
                      value={chainId}
                      onChange={(e) => setChainId(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800"
                    >
                      {Object.keys(CHAIN_IDS).map(chain => (
                        <option key={chain} value={chain}>
                          {chain.charAt(0).toUpperCase() + chain.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Safe Version
                    </label>
                    <select
                      value={safeVersion}
                      onChange={(e) => setSafeVersion(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800"
                    >
                      {SAFE_VERSIONS.map(version => (
                        <option key={version} value={version}>
                          {version}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nonce
                    </label>
                    <input
                      type="number"
                      value={transaction.nonce}
                      onChange={(e) => handleTransactionChange('nonce', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    To Address *
                  </label>
                  <input
                    type="text"
                    value={transaction.to}
                    onChange={(e) => handleTransactionChange('to', e.target.value)}
                    placeholder="0x..."
                    className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 font-mono text-sm"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Value (Wei)
                    </label>
                    <input
                      type="text"
                      value={transaction.value}
                      onChange={(e) => handleTransactionChange('value', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Operation
                    </label>
                    <select
                      value={transaction.operation}
                      onChange={(e) => handleTransactionChange('operation', parseInt(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800"
                    >
                      <option value={0}>Call (0)</option>
                      <option value={1}>DelegateCall (1)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Data
                  </label>
                  <textarea
                    value={transaction.data}
                    onChange={(e) => handleTransactionChange('data', e.target.value)}
                    placeholder="0x..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 font-mono text-sm"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Safe Tx Gas
                    </label>
                    <input
                      type="text"
                      value={transaction.safeTxGas}
                      onChange={(e) => handleTransactionChange('safeTxGas', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Base Gas
                    </label>
                    <input
                      type="text"
                      value={transaction.baseGas}
                      onChange={(e) => handleTransactionChange('baseGas', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Gas Price
                    </label>
                    <input
                      type="text"
                      value={transaction.gasPrice}
                      onChange={(e) => handleTransactionChange('gasPrice', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Gas Token
                    </label>
                    <input
                      type="text"
                      value={transaction.gasToken}
                      onChange={(e) => handleTransactionChange('gasToken', e.target.value)}
                      placeholder="0x0000000000000000000000000000000000000000"
                      className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 font-mono text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Refund Receiver
                  </label>
                  <input
                    type="text"
                    value={transaction.refundReceiver}
                    onChange={(e) => handleTransactionChange('refundReceiver', e.target.value)}
                    placeholder="0x0000000000000000000000000000000000000000"
                    className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 font-mono text-sm"
                  />
                </div>

                <button
                  onClick={handleCalculate}
                  disabled={loading || !safeAddress || !transaction.to}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {loading ? 'Calculating...' : 'Calculate Safe Hash'}
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Results</h3>
              
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                  <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Domain Hash</h4>
                    <p className="font-mono text-xs break-all">
                      {result.domainHash}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Message Hash</h4>
                    <p className="font-mono text-xs break-all">
                      {result.messageHash}  
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Safe Transaction Hash</h4>
                    <p className="font-mono text-xs text-blue-800 dark:text-blue-200 break-all">
                      {result.safeTransactionHash}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                      This is the hash you should verify when signing
                    </p>
                  </div>
                </div>
              )}

              {!result && !error && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <p className="text-sm">Fill in the transaction details and click "Calculate Safe Hash" to see results</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}