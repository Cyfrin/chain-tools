import {
  mainnet,
  arbitrum,
  optimism,
  zkSync,
  worldchain,
  polygonZkEvm,
  linea,
  base,
  unichain,
  scroll,
  abstract,
  soneium
} from 'viem/chains';

export const CHAIN_CONFIG = {
  ethereum: {
    chain: mainnet,
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    name: 'Ethereum',
    logo: '/chains/ethereum.svg'
  },
  arbitrum: {
    chain: arbitrum,
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    name: 'Arbitrum One',
    logo: '/chains/arbitrum.svg'
  },
  optimism: {
    chain: optimism,
    rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    name: 'Optimism',
    logo: '/chains/optimism.svg'
  },
  zksync: {
    chain: zkSync,
    rpcUrl: process.env.ZKSYNC_RPC_URL || 'https://mainnet.era.zksync.io',
    name: 'zkSync Era',
    logo: '/chains/zksync.svg'
  },
  worldchain: {
    chain: worldchain,
    rpcUrl: process.env.WORLDCHAIN_RPC_URL || 'https://worldchain-mainnet.g.alchemy.com/public',
    name: 'World Chain',
    logo: '/chains/worldchain.svg'
  },
  polygonzkevm: {
    chain: polygonZkEvm,
    rpcUrl: process.env.POLYGON_ZKEVM_RPC_URL || 'https://zkevm-rpc.com',
    name: 'Polygon zkEVM',
    logo: '/chains/polygonzkevm.svg'
  },
  linea: {
    chain: linea,
    rpcUrl: process.env.LINEA_RPC_URL || 'https://rpc.linea.build',
    name: 'Linea',
    logo: '/chains/linea.svg'
  },
  base: {
    chain: base,
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    name: 'Base',
    logo: '/chains/base.svg'
  },
  unichain: {
    chain: unichain,
    rpcUrl: process.env.UNICHAIN_RPC_URL || 'https://sepolia.unichain.org',
    name: 'Unichain',
    logo: '/chains/unichain.svg'
  },
  scroll: {
    chain: scroll,
    rpcUrl: process.env.SCROLL_RPC_URL || 'https://rpc.scroll.io',
    name: 'Scroll',
    logo: '/chains/scroll.svg'
  },
  soneium: {
    chain: soneium,
    rpcUrl: process.env.SONEIUM_RPC_URL || 'https://rpc.minato.soneium.org',
    name: 'Soneium',
    logo: '/chains/soneium.svg'
  }
};

export const GAS_PRESETS = {
  transfer: 21000,
  swap: 150000,
  erc20_deploy: 1200000
};