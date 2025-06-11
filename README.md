# Chain Tools

## About

Chain Tools is a Next.js application that provides essential Ethereum utilities for developers and users. It features comprehensive tools for gas estimation, unit conversion, ABI encoding/decoding, cryptographic hashing, and fee comparison across multiple blockchain networks.

**Features:**
- **Gas Estimator**: Calculate transaction costs with real-time ETH prices and gas prices across Ethereum, Arbitrum, Optimism, and zkSync Era
- **Wei Converter**: Convert between Wei, Gwei, and ETH with real-time calculations and helpful reference guides  
- **ABI Encoding**: Encode and decode ABI data for smart contract interactions with nested decoding support
- **Fee Leaderboard**: Compare gas costs across different chains, ranked from cheapest to most expensive
- **EIP-712 Hash**: Generate EIP-712 structured data hashes for typed data signing
- **Safe Wallet Hash**: Calculate Safe wallet transaction hashes for multi-signature operations

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

### ABI Encoding (`/abi-encoding`)
- **Decode Tab**: Decode ABI-encoded data from smart contract function calls
  - Auto-detection of function signatures using 4byte directory
  - Manual signature input support
  - Nested decoding for `bytes` parameters (multicalls, proxy calls, etc.)
  - Human-readable formatted output with emojis and indentation
  - Copy functionality for easy sharing
- **Encode Tab**: Encode function parameters into ABI format
  - Function signature input with validation
  - JSON parameter array input
  - Real-time encoding with error handling
  - Example templates for common use cases

### Fee Leaderboard (`/fee-leaderboard`)
- Compare transaction costs across multiple blockchain networks
- Real-time gas prices fetched from each chain's RPC
- Ranked display from cheapest to most expensive
- Shows costs for common operations:
  - ETH transfers (~21,000 gas)
  - Token swaps (~150,000 gas)
- Data cached for 1 minute for optimal performance

### EIP-712 Hash (`/eip712-hash`)
- Generate EIP-712 structured data hashes
- Support for typed data signing
- Domain separator configuration
- Message type definitions
- Compliant with EIP-712 standard

### Safe Wallet Hash (`/safe-hash`)
- Calculate Safe wallet transaction hashes
- Multi-signature transaction preparation
- Safe-specific hash generation
- Support for Safe transaction parameters

## Thank You

Thank you for using Chain Tools! This project aims to make Ethereum development and usage more accessible by providing essential calculation tools. Feel free to contribute or report issues to help improve the application.
