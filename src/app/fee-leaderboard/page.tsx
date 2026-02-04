'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import AIShareButtons from '@/components/AIShareButtons';

interface ChainData {
  chainKey: string;
  name: string;
  logo: string;
  gasPrice: number;
  transferCostETH: number;
  swapCostETH: number;
  transferCostGwei: number;
  swapCostGwei: number;
  transferCostUSD: number;
  swapCostUSD: number;
}

export default function FeeLeaderboard() {
  const [chainData, setChainData] = useState<ChainData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const oneMinute = 60 * 1000; // 1 minute cache

        // Check cache
        const cacheKey = 'fee-leaderboard-cache';
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < oneMinute) {
            setChainData(data);
            setLoading(false);
            return;
          }
        }

        // Fetch fresh data
        const response = await fetch('/api/fee-leaderboard');
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }

        const data = await response.json();
        setChainData(data);

        // Update cache
        localStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now()
        }));

        setLoading(false);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load fee leaderboard');
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getResultsData = () => {
    if (chainData.length === 0) return '';

    let data = `Fee Leaderboard - Gas Costs Comparison

Ranked by cheapest to most expensive (Transfer ETH cost):

`;
    chainData.forEach((chain, index) => {
      data += `#${index + 1}. ${chain.name}
   Gas Price: ${chain.gasPrice} Gwei
   Transfer ETH: $${chain.transferCostUSD.toFixed(6)} (${chain.transferCostGwei.toLocaleString()} Gwei)
   Swap Tokens: $${chain.swapCostUSD.toFixed(6)} (${chain.swapCostGwei.toLocaleString()} Gwei)

`;
    });

    data += `Notes:
• Transfer costs based on 21,000 gas (standard ETH transfer)
• Swap costs based on 150,000 gas (typical DEX swap)`;

    return data;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
          Loading fee leaderboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600 bg-red-50 dark:bg-red-900/20 px-6 py-4 rounded-xl border border-red-200 dark:border-red-800">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-3xl font-bold mb-4">Fee Leaderboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Compare gas costs across different chains (sorted by cheapest to most expensive)
        </p>

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Chain
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Transfer ETH Cost
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Swap Tokens Cost
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                {chainData.map((chain, index) => (
                  <tr
                    key={chain.chainKey}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                      index === 0 ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                        index === 0
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                          : index === 1
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                          : index === 2
                          ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Image
                          src={chain.logo}
                          alt={chain.name}
                          width={32}
                          height={32}
                          className="w-8 h-8 object-contain rounded-full"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {chain.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {chain.gasPrice} Gwei
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                        ${chain.transferCostUSD.toFixed(6)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {chain.transferCostGwei.toLocaleString()} Gwei
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                        ${chain.swapCostUSD.toFixed(6)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {chain.swapCostGwei.toLocaleString()} Gwei
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Share Buttons */}
        {chainData.length > 0 && (
          <div className="mt-6 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Get AI help analyzing these gas costs:</p>
            <AIShareButtons
              data={getResultsData()}
              context="Fee Leaderboard"
            />
          </div>
        )}

        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <p>• Transfer costs based on 21,000 gas (standard ETH transfer)</p>
          <p>• Swap costs based on 150,000 gas (typical DEX swap)</p>
          <p>• Data updates every 30 seconds</p>
        </div>

        <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Powered by{' '}
          <a
            href="https://www.coingecko.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            CoinGecko
          </a>
        </div>
      </div>
    </div>
  );
}
