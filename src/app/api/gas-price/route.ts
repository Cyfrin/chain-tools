import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { mainnet, arbitrum, optimism, zkSync } from 'viem/chains';

const CHAIN_CONFIG = {
  ethereum: {
    chain: mainnet,
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'
  },
  arbitrum: {
    chain: arbitrum,
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
  },
  optimism: {
    chain: optimism,
    rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io'
  },
  zksync: {
    chain: zkSync,
    rpcUrl: process.env.ZKSYNC_RPC_URL || 'https://mainnet.era.zksync.io'
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chain = searchParams.get('chain') || 'ethereum';

  try {
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

    return NextResponse.json({ gasPrice: formattedGasPrice });
  } catch (error) {
    console.error('Error fetching gas price:', error);
    return NextResponse.json({ gasPrice: 20 }, { status: 500 });
  }
}