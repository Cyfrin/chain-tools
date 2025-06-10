import { NextResponse } from 'next/server';

let cachedPrice: { price: number; timestamp: number } | null = null;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export async function GET() {
  try {
    if (cachedPrice && Date.now() - cachedPrice.timestamp < CACHE_DURATION) {
      return NextResponse.json({ price: cachedPrice.price });
    }

    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const data = await response.json();

    const price = data.ethereum.usd;
    cachedPrice = { price, timestamp: Date.now() };

    return NextResponse.json({ price });
  } catch (error) {
    console.error('Error fetching ETH price:', error);
    return NextResponse.json({ price: 3000 }, { status: 500 });
  }
}