'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { ethers } from 'ethers';
import { useSearchParams } from 'next/navigation'
import AIShareButtons from '@/components/AIShareButtons';


interface SafeHashResult {
  domainHash: string;
  messageHash: string;
  safeTransactionHash: string;
}

interface NestedSafeHashResult extends SafeHashResult {
  nestedDomainHash: string;
  nestedMessageHash: string;
  nestedSafeTransactionHash: string;
}

interface SafeApiResponse {
  count: number;
  results: SafeApiTransaction[];
}

interface SafeApiTransaction {
  to: string;
  data: string;
  value: string;
  operation: number;
  gasToken: string;
  safeTxGas: number;
  baseGas: number;
  gasPrice: string;
  refundReceiver: string;
  nonce: number;
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

// Safe API endpoints based on safe_hashes.sh
const SAFE_API_URLS: { [key: string]: string } = {
  arbitrum: "https://safe-transaction-arbitrum.safe.global",
  avalanche: "https://safe-transaction-avalanche.safe.global",
  base: "https://safe-transaction-base.safe.global",
  ethereum: "https://safe-transaction-mainnet.safe.global",
  linea: "https://safe-transaction-linea.safe.global",
  optimism: "https://safe-transaction-optimism.safe.global",
  polygon: "https://safe-transaction-polygon.safe.global",
  polygonzkevm: "https://safe-transaction-zkevm.safe.global",
  scroll: "https://safe-transaction-scroll.safe.global",
  sepolia: "https://safe-transaction-sepolia.safe.global",
  worldchain: "https://safe-transaction-worldchain.safe.global",
  zksync: "https://safe-transaction-zksync.safe.global",
};

const SAFE_VERSIONS = ['1.4.1', '1.3.0', '1.2.0', '1.1.1', '1.0.0'];

export default function SafeHash() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]"><div className="max-w-2xl mx-auto"><h1 className="text-3xl font-bold mb-8">Safe Wallet Hash Calculator</h1><div className="text-center">Loading...</div></div></div>}>
      <SafeHashPageContent />
    </Suspense>
  )
}

function SafeHashPageContent() {
  const searchParams = useSearchParams();
  const [copiedUrl, setCopiedUrl] = useState(false);

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

  // Nested safe state
  const [isNestedSafe, setIsNestedSafe] = useState(false);
  const [nestedSafeAddress, setNestedSafeAddress] = useState('');
  const [nestedSafeNonce, setNestedSafeNonce] = useState('0');
  const [nestedResult, setNestedResult] = useState<NestedSafeHashResult | null>(null);

  // API fetch state
  const [apiError, setApiError] = useState('');
  const [apiLoading, setApiLoading] = useState(false);
  const [apiFieldsError, setApiFieldsError] = useState<{ to?: boolean; data?: boolean }>({});

  // Ref for scrolling to results
  const resultsRef = useRef<HTMLDivElement>(null);

  // on mount (or whenever the URL changes), populate your form from ?-params
  useEffect(() => {
    if (!searchParams) return;

    // Safe address
    const safe = searchParams.get('safeAddress');
    if (safe && ethers.isAddress(safe)) {
      setSafeAddress(safe);
    }

    // Chain
    const chain = searchParams.get('chainId');
    if (chain && CHAIN_IDS[chain]) {
      setChainId(chain);
    }

    // Safe version
    const version = searchParams.get('safeVersion');
    if (version && SAFE_VERSIONS.includes(version)) {
      setSafeVersion(version);
    }

    // Transaction fields
    const txUpdate: Partial<SafeTransaction> = {};
    const to = searchParams.get('to');
    if (to && ethers.isAddress(to)) txUpdate.to = to;
    if (searchParams.get('value')) txUpdate.value = searchParams.get('value')!;
    if (searchParams.get('data')) txUpdate.data = searchParams.get('data')!;
    const operationParam = searchParams.get('operation');
    if (operationParam && !isNaN(Number(operationParam))) {
      txUpdate.operation = Number(operationParam);
    }
    if (searchParams.get('safeTxGas')) txUpdate.safeTxGas = searchParams.get('safeTxGas')!;
    if (searchParams.get('baseGas')) txUpdate.baseGas = searchParams.get('baseGas')!;
    if (searchParams.get('gasPrice')) txUpdate.gasPrice = searchParams.get('gasPrice')!;
    if (searchParams.get('gasToken')) txUpdate.gasToken = searchParams.get('gasToken')!;
    if (searchParams.get('refundReceiver'))
      txUpdate.refundReceiver = searchParams.get('refundReceiver')!;
    if (searchParams.get('nonce')) txUpdate.nonce = searchParams.get('nonce')!;
    setTransaction(prev => ({ ...prev, ...txUpdate }));

    // Nested-safe fields
    const nestedAddr = searchParams.get('nestedSafeAddress');
    if (nestedAddr && ethers.isAddress(nestedAddr)) {
      setIsNestedSafe(true);
      setNestedSafeAddress(nestedAddr);
    }
    const nestedNonceParam = searchParams.get('nestedSafeNonce');
    if (nestedNonceParam) {
      setNestedSafeNonce(nestedNonceParam);
    }
  }, [searchParams]);

  // Copy current form into a shareable URL
  const copyShareableUrl = () => {
    const url = new URL(window.location.href);
    url.search = ''; // clear any old params
    const params: Record<string, string> = {
      safeAddress,
      chainId,
      safeVersion,
      nonce: transaction.nonce,
      to: transaction.to,
      value: transaction.value,
      data: transaction.data,
      operation: transaction.operation.toString(),
      safeTxGas: transaction.safeTxGas,
      baseGas: transaction.baseGas,
      gasPrice: transaction.gasPrice,
      gasToken: transaction.gasToken,
      refundReceiver: transaction.refundReceiver,
    };
    if (isNestedSafe) {
      params.nestedSafeAddress = nestedSafeAddress;
      params.nestedSafeNonce = nestedSafeNonce;
    }
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
    navigator.clipboard.writeText(url.toString());
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 1000);
  };

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

  const calculateNestedSafeHash = async (mainTxHash: string): Promise<NestedSafeHashResult> => {
    try {
      const selectedChainId = CHAIN_IDS[chainId];
      const [majorVersion, minorVersion] = safeVersion.split('.').map(Number);
      const isVersionGte130 = majorVersion > 1 || (majorVersion === 1 && minorVersion >= 3);

      // First, calculate the main transaction hash (already done)
      const mainResult = await calculateSafeHash();

      // Create nested transaction data
      // The nested transaction calls approveHash(bytes32) with the main tx hash
      // Function selector for approveHash(bytes32) is 0xd4d9bdcd
      const approveHashData = '0xd4d9bdcd' + mainTxHash.slice(2); // Remove 0x prefix from hash

      const nestedTransaction = {
        to: safeAddress, // Nested transaction targets the main safe
        value: '0',
        data: approveHashData,
        operation: 0, // CALL operation
        safeTxGas: '0',
        baseGas: '0',
        gasPrice: '0',
        gasToken: '0x0000000000000000000000000000000000000000',
        refundReceiver: '0x0000000000000000000000000000000000000000',
        nonce: nestedSafeNonce
      };

      // Calculate nested domain hash
      let nestedDomainData;
      if (isVersionGte130) {
        nestedDomainData = {
          chainId: selectedChainId,
          verifyingContract: nestedSafeAddress
        };
      } else {
        nestedDomainData = {
          verifyingContract: nestedSafeAddress
        };
      }

      const nestedDomainHash = ethers.TypedDataEncoder.hashDomain(nestedDomainData);

      // Calculate nested message hash
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

      const nestedMessage = {
        to: nestedTransaction.to,
        value: nestedTransaction.value,
        data: nestedTransaction.data,
        operation: nestedTransaction.operation,
        safeTxGas: nestedTransaction.safeTxGas,
        [baseGasFieldName]: nestedTransaction.baseGas,
        gasPrice: nestedTransaction.gasPrice,
        gasToken: nestedTransaction.gasToken,
        refundReceiver: nestedTransaction.refundReceiver,
        nonce: nestedTransaction.nonce
      };

      const nestedMessageHash = ethers.TypedDataEncoder.hashStruct('SafeTx', types, nestedMessage);
      const nestedSafeTransactionHash = ethers.TypedDataEncoder.hash(nestedDomainData, types, nestedMessage);

      return {
        ...mainResult,
        nestedDomainHash,
        nestedMessageHash,
        nestedSafeTransactionHash
      };
    } catch (err) {
      throw new Error(`Failed to calculate nested Safe hash: ${err}`);
    }
  };

  const fetchSafeTransactionData = async () => {
    if (!safeAddress || !ethers.isAddress(safeAddress)) {
      setApiError('Please enter a valid Safe address');
      return;
    }

    if (!transaction.nonce) {
      setApiError('Please enter a nonce');
      return;
    }

    const apiUrl = SAFE_API_URLS[chainId];
    if (!apiUrl) {
      setApiError(`Safe API not available for ${chainId} network`);
      return;
    }

    setApiLoading(true);
    setApiError('');
    setApiFieldsError({});

    try {
      const endpoint = `${apiUrl}/api/v1/safes/${safeAddress}/multisig-transactions/?nonce=${transaction.nonce}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: SafeApiResponse = await response.json();

      if (data.count === 0) {
        setApiError(`No transaction found for nonce ${transaction.nonce}`);
        setApiFieldsError({ to: true, data: true });
        return;
      }

      // Use the first result (index 0)
      const apiTransaction = data.results[0];

      // Update the form with API data
      setTransaction(prev => ({
        ...prev,
        to: apiTransaction.to,
        data: apiTransaction.data,
        value: apiTransaction.value,
        operation: apiTransaction.operation,
        safeTxGas: apiTransaction.safeTxGas.toString(),
        baseGas: apiTransaction.baseGas.toString(),
        gasPrice: apiTransaction.gasPrice,
        gasToken: apiTransaction.gasToken,
        refundReceiver: apiTransaction.refundReceiver,
      }));

      setApiError('');
      setApiFieldsError({});
    } catch (err) {
      setApiError(`Failed to fetch transaction data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setApiFieldsError({ to: true, data: true });
    } finally {
      setApiLoading(false);
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

    if (isNestedSafe) {
      if (!nestedSafeAddress || !ethers.isAddress(nestedSafeAddress)) {
        setError('Please enter a valid nested Safe address');
        return;
      }
    }

    setLoading(true);
    setError('');
    setResult(null);
    setNestedResult(null);

    try {
      const hashResult = await calculateSafeHash();
      setResult(hashResult);

      // If nested safe is enabled, calculate nested hash
      if (isNestedSafe) {
        const nestedHashResult = await calculateNestedSafeHash(hashResult.safeTransactionHash);
        setNestedResult(nestedHashResult);
      }

      // Scroll to results after successful calculation
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
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

    // Clear API field errors when user manually fills the fields
    if (field === 'to' && value && apiFieldsError.to) {
      setApiFieldsError(prev => ({ ...prev, to: false }));
    }
    if (field === 'data' && value && apiFieldsError.data) {
      setApiFieldsError(prev => ({ ...prev, data: false }));
    }
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

  const getResultsData = () => {
    if (!result) return '';

    let data = `Safe Wallet Hash Calculator Results:

Safe Address: ${safeAddress}
Chain: ${chainId} (Chain ID: ${CHAIN_IDS[chainId]})
Safe Version: ${safeVersion}

Transaction Details:
- To: ${transaction.to}
- Value: ${transaction.value} wei
- Data: ${transaction.data}
- Operation: ${transaction.operation === 0 ? 'Call' : 'DelegateCall'}
- Nonce: ${transaction.nonce}

Calculated Hashes:
- Domain Hash: ${result.domainHash}
- Message Hash: ${result.messageHash}
- Safe Transaction Hash: ${result.safeTransactionHash}`;

    if (nestedResult) {
      data += `

Nested Safe Results:
- Nested Safe Address: ${nestedSafeAddress}
- Nested Safe Nonce: ${nestedSafeNonce}
- Nested Domain Hash: ${nestedResult.nestedDomainHash}
- Nested Message Hash: ${nestedResult.nestedMessageHash}
- Nested Safe Transaction Hash: ${nestedResult.nestedSafeTransactionHash}`;
    }

    return data;
  };

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-6xl mx-auto">

        <h1 className="text-3xl font-bold mb-8">Safe Wallet Hash Calculator</h1>

        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Calculate domain hash, message hash, and Safe transaction hash for Safe wallet transactions.
              Verify these values when signing with your hardware wallet.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Transaction Details</h3>
                <div className="flex gap-2">
                  <button
                    onClick={copyShareableUrl}
                    className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer transition-colors"
                  >
                    {copiedUrl ? 'Copied!' : 'Copy Shareable URL'}
                  </button>
                  <button
                    onClick={loadExample}
                    className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer transition-colors"
                  >
                    Load Example
                  </button>
                </div>
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
                      className="w-full p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 font-mono text-sm transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Chain
                    </label>
                    <select
                      value={chainId}
                      onChange={(e) => setChainId(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 cursor-pointer transition-colors"
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
                      className="w-full p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 cursor-pointer transition-colors"
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
                      className="w-full p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 transition-colors"
                    />
                  </div>
                </div>

                {/* Safe API Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold">Transaction Data from Safe API</h4>
                    <button
                      onClick={fetchSafeTransactionData}
                      disabled={apiLoading || !safeAddress || !transaction.nonce}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed cursor-pointer"
                    >
                      {apiLoading ? 'Fetching...' : 'Fetch from API'}
                    </button>
                  </div>

                  {apiError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
                      <p className="text-red-800 dark:text-red-200 text-sm">{apiError}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        To Address *
                      </label>
                      <input
                        type="text"
                        value={transaction.to}
                        onChange={(e) => handleTransactionChange('to', e.target.value)}
                        placeholder="0x... (will be filled by API or enter manually)"
                        className={`w-full p-3 border rounded-xl dark:bg-gray-800 font-mono text-sm transition-colors ${apiFieldsError.to
                          ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                          : 'border-gray-300 dark:border-gray-600'
                          }`}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium">
                          Data
                        </label>
                        {transaction.data && transaction.data !== '0x' && (
                          <button
                            onClick={() => {
                              const url = new URL(window.location.origin + '/abi-encoding')
                              url.searchParams.set('data', transaction.data)
                              window.open(url.toString(), '_blank')
                            }}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                          >
                            Decode Data
                          </button>
                        )}
                      </div>
                      <textarea
                        value={transaction.data}
                        onChange={(e) => handleTransactionChange('data', e.target.value)}
                        placeholder="0x... (will be filled by API or enter manually)"
                        rows={3}
                        className={`w-full p-3 border rounded-xl dark:bg-gray-800 font-mono text-sm transition-colors ${apiFieldsError.data
                          ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                          : 'border-gray-300 dark:border-gray-600'
                          }`}
                      />
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                    <p>• If fields are empty, click "Fetch from API" to auto-fill transaction data</p>
                    <p>• If API fails, fields will be highlighted in red for manual entry</p>
                    <p>• Requires valid Safe address and nonce</p>
                  </div>
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
                      className="w-full p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Operation
                    </label>
                    <select
                      value={transaction.operation}
                      onChange={(e) => handleTransactionChange('operation', parseInt(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 cursor-pointer transition-colors"
                    >
                      <option value={0}>Call (0)</option>
                      <option value={1}>DelegateCall (1)</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-md font-semibold mb-4">Additional Transaction Parameters</h4>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Safe Tx Gas
                      </label>
                      <input
                        type="text"
                        value={transaction.safeTxGas}
                        onChange={(e) => handleTransactionChange('safeTxGas', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 transition-colors"
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
                        className="w-full p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 transition-colors"
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
                        className="w-full p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 transition-colors"
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
                        className="w-full p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 font-mono text-sm transition-colors"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">
                      Refund Receiver
                    </label>
                    <input
                      type="text"
                      value={transaction.refundReceiver}
                      onChange={(e) => handleTransactionChange('refundReceiver', e.target.value)}
                      placeholder="0x0000000000000000000000000000000000000000"
                      className="w-full p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 font-mono text-sm transition-colors"
                    />
                  </div>
                </div>

                {/* Nested Safe Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="nested-safe"
                      checked={isNestedSafe}
                      onChange={(e) => setIsNestedSafe(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="nested-safe" className="text-sm font-medium cursor-pointer">
                      Nested Safe?
                    </label>
                  </div>

                  {isNestedSafe && (
                    <div className="space-y-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4 rounded-xl">
                      <div className="text-sm text-purple-800 dark:text-purple-200 mb-4">
                        <p><strong>Note:</strong> Nested safe functionality calculates a wrapper transaction that calls <code className="bg-purple-100 dark:bg-purple-800/50 px-1 rounded">approveHash()</code> on the outer safe.</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Nested Safe Address *
                          </label>
                          <input
                            type="text"
                            value={nestedSafeAddress}
                            onChange={(e) => setNestedSafeAddress(e.target.value)}
                            placeholder="0x..."
                            className="w-full p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 font-mono text-sm transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Nested Safe Nonce
                          </label>
                          <input
                            type="number"
                            value={nestedSafeNonce}
                            onChange={(e) => setNestedSafeNonce(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl dark:border-gray-600 dark:bg-gray-800 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCalculate}
                  disabled={loading || !safeAddress || !transaction.to}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? 'Calculating...' : 'Calculate Safe Hash'}
                </button>
              </div>
            </div>

            <div ref={resultsRef}>
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
                    <p className="font-mono text-xs break-all">
                      {result.domainHash}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <h4 className="font-medium mb-2 text-sm text-gray-600 dark:text-gray-400">Message Hash</h4>
                    <p className="font-mono text-xs break-all">
                      {result.messageHash}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Safe Transaction Hash</h4>
                    <p className="font-mono text-xs text-blue-800 dark:text-blue-200 break-all">
                      {result.safeTransactionHash}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                      This is the hash you should verify when signing
                    </p>
                  </div>

                  {/* AI Share Buttons for main results */}
                  <div className="pt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Get AI help verifying this hash:</p>
                    <AIShareButtons
                      data={getResultsData()}
                      context="Safe Wallet Hash Calculator"
                    />
                  </div>
                </div>
              )}

              {nestedResult && (
                <div className="mt-8 space-y-4">
                  <h4 className="text-lg font-semibold text-purple-800 dark:text-purple-200 border-t border-purple-200 dark:border-purple-800 pt-4">
                    Nested Safe Transaction Results
                  </h4>

                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                    <h5 className="font-medium mb-2 text-sm text-purple-600 dark:text-purple-400">Nested Domain Hash</h5>
                    <p className="font-mono text-xs break-all">
                      {nestedResult.nestedDomainHash}
                    </p>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                    <h5 className="font-medium mb-2 text-sm text-purple-600 dark:text-purple-400">Nested Message Hash</h5>
                    <p className="font-mono text-xs break-all">
                      {nestedResult.nestedMessageHash}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/10 border border-purple-300 dark:border-purple-700 rounded-xl p-4">
                    <h5 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Nested Safe Transaction Hash</h5>
                    <p className="font-mono text-xs text-purple-800 dark:text-purple-200 break-all">
                      {nestedResult.nestedSafeTransactionHash}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-300 mt-2">
                      This hash is for the outer safe to approve the inner safe's transaction
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <h5 className="font-medium mb-2 text-sm">Nested Transaction Details</h5>
                    <div className="text-xs space-y-1">
                      <p><span className="font-medium">To:</span> <span className="font-mono break-all">{safeAddress}</span> (inner safe)</p>
                      <p><span className="font-medium">Data:</span> <span className="font-mono text-xs break-all">0xd4d9bdcd{result?.safeTransactionHash.slice(2)}</span></p>
                      <p><span className="font-medium">Function:</span> approveHash(bytes32)</p>
                    </div>
                  </div>
                </div>
              )}

              {!result && !error && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-sm">Fill in the transaction details and click "Calculate Safe Hash" to see results</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}
