'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function WeiConverter() {
  const [wei, setWei] = useState<string>('');
  const [gwei, setGwei] = useState<string>('');
  const [eth, setEth] = useState<string>('');
  const [lastChanged, setLastChanged] = useState<'wei' | 'gwei' | 'eth' | null>(null);

  const convertFromWei = (weiValue: string) => {
    if (!weiValue || weiValue === '') return { gwei: '', eth: '' };
    
    const weiNum = parseFloat(weiValue);
    if (isNaN(weiNum)) return { gwei: '', eth: '' };
    
    const gweiValue = weiNum / 1e9;
    const ethValue = weiNum / 1e18;
    
    return {
      gwei: gweiValue.toString(),
      eth: ethValue.toString()
    };
  };

  const convertFromGwei = (gweiValue: string) => {
    if (!gweiValue || gweiValue === '') return { wei: '', eth: '' };
    
    const gweiNum = parseFloat(gweiValue);
    if (isNaN(gweiNum)) return { wei: '', eth: '' };
    
    const weiValue = gweiNum * 1e9;
    const ethValue = gweiNum / 1e9;
    
    return {
      wei: weiValue.toString(),
      eth: ethValue.toString()
    };
  };

  const convertFromEth = (ethValue: string) => {
    if (!ethValue || ethValue === '') return { wei: '', gwei: '' };
    
    const ethNum = parseFloat(ethValue);
    if (isNaN(ethNum)) return { wei: '', gwei: '' };
    
    const weiValue = ethNum * 1e18;
    const gweiValue = ethNum * 1e9;
    
    return {
      wei: weiValue.toString(),
      gwei: gweiValue.toString()
    };
  };

  useEffect(() => {
    if (lastChanged === 'wei') {
      const { gwei: newGwei, eth: newEth } = convertFromWei(wei);
      setGwei(newGwei);
      setEth(newEth);
    } else if (lastChanged === 'gwei') {
      const { wei: newWei, eth: newEth } = convertFromGwei(gwei);
      setWei(newWei);
      setEth(newEth);
    } else if (lastChanged === 'eth') {
      const { wei: newWei, gwei: newGwei } = convertFromEth(eth);
      setWei(newWei);
      setGwei(newGwei);
    }
  }, [wei, gwei, eth, lastChanged]);

  const handleWeiChange = (value: string) => {
    setWei(value);
    setLastChanged('wei');
  };

  const handleGweiChange = (value: string) => {
    setGwei(value);
    setLastChanged('gwei');
  };

  const handleEthChange = (value: string) => {
    setEth(value);
    setLastChanged('eth');
  };

  const clearAll = () => {
    setWei('');
    setGwei('');
    setEth('');
    setLastChanged(null);
  };

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
          >
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-8">Wei Converter</h1>

        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Conversion rates:</strong><br />
              1 ETH = 1,000,000,000 Gwei = 1,000,000,000,000,000,000 Wei
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Wei</label>
            <input
              type="text"
              value={wei}
              onChange={(e) => handleWeiChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 font-mono"
              placeholder="Enter amount in Wei"
            />
            <p className="text-xs text-gray-500 mt-1">Smallest unit of Ether</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Gwei</label>
            <input
              type="text"
              value={gwei}
              onChange={(e) => handleGweiChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 font-mono"
              placeholder="Enter amount in Gwei"
            />
            <p className="text-xs text-gray-500 mt-1">Commonly used for gas prices (1 Gwei = 1,000,000,000 Wei)</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">ETH</label>
            <input
              type="text"
              value={eth}
              onChange={(e) => handleEthChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 font-mono"
              placeholder="Enter amount in ETH"
            />
            <p className="text-xs text-gray-500 mt-1">Standard Ether unit</p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={clearAll}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Quick Reference</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Common Values:</h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  <li>1 ETH = 1,000,000,000 Gwei</li>
                  <li>1 ETH = 10<sup>18</sup> Wei</li>
                  <li>1 Gwei = 10<sup>9</sup> Wei</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Typical Gas Prices:</h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  <li>Slow: ~10-20 Gwei</li>
                  <li>Standard: ~20-50 Gwei</li>
                  <li>Fast: ~50-100+ Gwei</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}