'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading fee leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
          >
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-8">Fee Leaderboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Compare gas costs across different chains (sorted by cheapest to most expensive)
        </p>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Chain
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Transfer ETH Cost
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Swap Tokens Cost
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {chainData.map((chain, index) => (
                  <tr key={chain.chainKey} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                          {index + 1}
                        </span>
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
                      <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        ${chain.transferCostUSD.toFixed(6)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {chain.transferCostGwei.toLocaleString()} Gwei
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
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

        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>• Transfer costs based on 21,000 gas (standard ETH transfer)</p>
          <p>• Swap costs based on 150,000 gas (typical DEX swap)</p>
          <p>• Data updates every 30 seconds</p>
        </div>
      </div>
    </div>
  );
}