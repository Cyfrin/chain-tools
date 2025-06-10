import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { CHAIN_CONFIG } from '@/config/chains';

// Server-side cache (30 seconds)
const cache = new Map<string, { gasPrice: number; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chain = searchParams.get('chain') || 'ethereum';

  try {
    // Check cache first
    const now = Date.now();
    const cached = cache.get(chain);
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return NextResponse.json({ gasPrice: cached.gasPrice });
    }

    const config = CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG];
    if (!config) {
      return NextResponse.json({ gasPrice: 20 }, { status: 400 });
    }

    const client = createPublicClient({
      chain: config.chain,
      transport: http(config.rpcUrl)
    });

    const gasPrice = await client.getGasPrice();
    const gasPriceGwei = Number(gasPrice) / 1e9;

    // For very small gas prices (like zkSync), use more precision
    const formattedGasPrice = gasPriceGwei < 1
      ? Math.round(gasPriceGwei * 1000) / 1000  // 3 decimal places for < 1 Gwei
      : Math.round(gasPriceGwei);               // Round to whole number for >= 1 Gwei

    // Update cache
    cache.set(chain, { gasPrice: formattedGasPrice, timestamp: now });

    return NextResponse.json({ gasPrice: formattedGasPrice });
  } catch (error) {
    console.error('Error fetching gas price:', error);
    return NextResponse.json({ gasPrice: 20 }, { status: 500 });
  }
}