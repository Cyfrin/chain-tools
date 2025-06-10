# Gas Tools

## About

Gas Tools is a Next.js application that provides essential Ethereum utilities for developers and users. It features a gas estimator for calculating transaction costs across multiple chains and a wei converter for seamless unit conversions between Wei, Gwei, and ETH.

**Features:**
- **Gas Estimator**: Calculate transaction costs with real-time ETH prices and gas prices across Ethereum, Arbitrum, Optimism, and zkSync Era
- **Wei Converter**: Convert between Wei, Gwei, and ETH with real-time calculations and helpful reference guides

## Getting Started

### Requirements

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Quickstart

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory (optional - defaults provided):
```bash
# RPC URLs for different chains
ETHEREUM_RPC_URL=https://eth.llamarpc.com
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
OPTIMISM_RPC_URL=https://mainnet.optimism.io
ZKSYNC_RPC_URL=https://mainnet.era.zksync.io
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Gas Estimator (`/gas-estimator`)
- **ETH Price**: Automatically fetched from CoinGecko API with 5-minute caching
- **Chain Selection**: Choose between Ethereum, Arbitrum, Optimism, or zkSync Era
- **Gas Price**: Automatically fetched from the selected chain's RPC
- **Gas Amount**: Enter custom amount or select from presets:
  - Transfer ETH (~21,000)
  - Swap on Uniswap (~150,000)
  - Deploy ERC20 (~1,200,000)
- View estimated costs in both ETH and USD

### Wei Converter (`/wei-converter`)
- Enter values in any unit (Wei, Gwei, or ETH)
- Real-time conversion between all units
- Quick reference guide with common values and gas price ranges
- Clear all functionality for easy reset

## Thank You

Thank you for using Gas Tools! This project aims to make Ethereum development and usage more accessible by providing essential calculation tools. Feel free to contribute or report issues to help improve the application.
