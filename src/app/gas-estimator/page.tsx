'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CHAIN_CONFIG, GAS_PRESETS } from '@/config/chains';

export default function GasEstimator() {
  const [ethPrice, setEthPrice] = useState<string>('');
  const [gasPrice, setGasPrice] = useState<string>('');
  const [gasAmount, setGasAmount] = useState<string>('');
  const [selectedChain, setSelectedChain] = useState<string>('ethereum');
  const [gasPreset, setGasPreset] = useState<string>('transfer');
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const totalCostUSD = ethPrice && gasPrice && gasAmount
    ? (parseFloat(ethPrice) * (parseFloat(gasPrice) * parseFloat(gasAmount)) / 1e9).toFixed(4)
    : '0';

  const totalCostETH = gasPrice && gasAmount
    ? ((parseFloat(gasPrice) * parseFloat(gasAmount)) / 1e9).toFixed(9)
    : '0';

  useEffect(() => {
    // Set initial gas amount based on default preset
    handleGasPresetChange('transfer');
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const oneMinute = 60 * 1000; // 1 minute cache

        // Check cache for ETH price
        const ethCacheKey = 'eth-price-cache';
        const ethCached = localStorage.getItem(ethCacheKey);
        
        if (ethCached) {
          const { price, timestamp } = JSON.parse(ethCached);
          if (Date.now() - timestamp < oneMinute) {
            setEthPrice(price.toString());
          } else {
            // Cache expired, fetch new price
            const response = await fetch('/api/eth-price');
            const data = await response.json();
            setEthPrice(data.price.toString());
            localStorage.setItem(ethCacheKey, JSON.stringify({
              price: data.price,
              timestamp: Date.now()
            }));
          }
        } else {
          // No cache, fetch new price
          const response = await fetch('/api/eth-price');
          const data = await response.json();
          setEthPrice(data.price.toString());
          localStorage.setItem(ethCacheKey, JSON.stringify({
            price: data.price,
            timestamp: Date.now()
          }));
        }
        
        // Check cache for gas price (per chain)
        const gasCacheKey = `gas-price-cache-${selectedChain}`;
        const gasCached = localStorage.getItem(gasCacheKey);
        
        if (gasCached) {
          const { gasPrice, timestamp } = JSON.parse(gasCached);
          if (Date.now() - timestamp < oneMinute) {
            setGasPrice(gasPrice.toString());
          } else {
            // Cache expired, fetch new gas price
            const gasResponse = await fetch(`/api/gas-price?chain=${selectedChain}`);
            const gasData = await gasResponse.json();
            setGasPrice(gasData.gasPrice.toString());
            localStorage.setItem(gasCacheKey, JSON.stringify({
              gasPrice: gasData.gasPrice,
              timestamp: Date.now()
            }));
          }
        } else {
          // No cache, fetch new gas price
          const gasResponse = await fetch(`/api/gas-price?chain=${selectedChain}`);
          const gasData = await gasResponse.json();
          setGasPrice(gasData.gasPrice.toString());
          localStorage.setItem(gasCacheKey, JSON.stringify({
            gasPrice: gasData.gasPrice,
            timestamp: Date.now()
          }));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setEthPrice('3000');
        setGasPrice('20');
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedChain]);

  const handleGasPresetChange = (preset: string) => {
    setGasPreset(preset);
    if (preset !== 'custom' && GAS_PRESETS[preset as keyof typeof GAS_PRESETS]) {
      setGasAmount(GAS_PRESETS[preset as keyof typeof GAS_PRESETS].toString());
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading current prices...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-2xl mx-auto">

        <h1 className="text-3xl font-bold mb-8">Gas Estimator</h1>

        <div className="space-y-6">

          <div>
            <label className="block text-sm font-medium mb-2">ETH Price (USD)</label>
            <input
              type="number"
              value={ethPrice}
              onChange={(e) => setEthPrice(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800"
              placeholder="Current ETH price in USD"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              Chain (Optional)
              <div className="relative group">
                <svg 
                  className="w-4 h-4 text-gray-400 cursor-help" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-20">
                  Chain selection fetches current gas price. Manual gas price input will override this.
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </label>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 flex items-center justify-between bg-white dark:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={CHAIN_CONFIG[selectedChain as keyof typeof CHAIN_CONFIG].logo}
                    alt={CHAIN_CONFIG[selectedChain as keyof typeof CHAIN_CONFIG].name}
                    width={24}
                    height={24}
                    className="w-6 h-6 object-contain rounded-full"
                  />
                  <span>{CHAIN_CONFIG[selectedChain as keyof typeof CHAIN_CONFIG].name}</span>
                </div>
                <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10">
                  {Object.entries(CHAIN_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedChain(key);
                        setDropdownOpen(false);
                      }}
                      className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                    >
                      <Image
                        src={config.logo}
                        alt={config.name}
                        width={24}
                        height={24}
                        className="w-6 h-6 object-contain rounded-full"
                      />
                      <span>{config.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>



          <div>
            <label className="block text-sm font-medium mb-2">Gas Price (Gwei)</label>
            <input
              type="number"
              value={gasPrice}
              onChange={(e) => setGasPrice(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800"
              placeholder="Gas price in Gwei"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Gas Amount</label>
            <div className="space-y-3">
              <select
                value={gasPreset}
                onChange={(e) => handleGasPresetChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800"
              >
                <option value="custom">Custom</option>
                <option value="transfer">Transfer ETH (~{GAS_PRESETS.transfer.toLocaleString()})</option>
                <option value="swap">Swap on Uniswap (~{GAS_PRESETS.swap.toLocaleString()})</option>
                <option value="erc20_deploy">Deploy ERC20 (~{GAS_PRESETS.erc20_deploy.toLocaleString()})</option>
              </select>
              <input
                type="number"
                value={gasAmount}
                onChange={(e) => setGasAmount(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800"
                placeholder="Gas amount"
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Estimated Cost</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Cost in ETH:</span>
                <span className="font-mono">{totalCostETH} ETH</span>
              </div>
              <div className="flex justify-between">
                <span>Cost in USD:</span>
                <span className="font-mono">${totalCostUSD}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
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
    </div>
  );
}