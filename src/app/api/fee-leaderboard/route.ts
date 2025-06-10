import { NextResponse } from 'next/server';
import { CHAIN_CONFIG, GAS_PRESETS } from '@/config/chains';

// Server-side cache (2 minutes)
let cachedData: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

async function getGasPriceForChain(chainKey: string): Promise<number> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/gas-price?chain=${chainKey}`);
    const data = await response.json();
    return data.gasPrice;
  } catch (error) {
    console.error(`Error fetching gas price for ${chainKey}:`, error);
    return 20; // fallback
  }
}

export async function GET() {
  try {
    // Check cache
    const now = Date.now();
    if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json(cachedData);
    }

    // Fetch gas prices for all chains
    const chainData = await Promise.all(
      Object.entries(CHAIN_CONFIG).map(async ([chainKey, config]) => {
        const gasPrice = await getGasPriceForChain(chainKey);
        
        // Calculate costs in Gwei
        const transferCostGwei = gasPrice * GAS_PRESETS.transfer;
        const swapCostGwei = gasPrice * GAS_PRESETS.swap;
        
        // Convert to ETH (Gwei to ETH = divide by 1e9)
        const transferCostETH = transferCostGwei / 1e9;
        const swapCostETH = swapCostGwei / 1e9;

        return {
          chainKey,
          name: config.name,
          logo: config.logo,
          gasPrice,
          transferCostETH,
          swapCostETH,
          transferCostGwei,
          swapCostGwei
        };
      })
    );

    // Sort by transfer cost (cheapest first)
    const sortedData = chainData.sort((a, b) => a.transferCostETH - b.transferCostETH);

    // Update cache
    cachedData = sortedData;
    cacheTimestamp = now;

    return NextResponse.json(sortedData);
  } catch (error) {
    console.error('Error fetching fee leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch fee leaderboard' }, { status: 500 });
  }
}