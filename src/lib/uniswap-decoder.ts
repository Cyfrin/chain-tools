import { AbiCoder } from 'ethers'

export const UNISWAP_ROUTER_COMMANDS: Record<string, { name: string; params: { name: string; type: string; description: string }[] }> = {
  '0': {
    name: 'V3_SWAP_EXACT_IN',
    params: [
      { type: 'address', description: 'The recipient of the output of the trade', name: 'recipient' },
      { type: 'uint256', description: 'The amount of input tokens for the trade', name: 'amountIn' },
      { type: 'uint256', description: 'The minimum amount of output tokens the user wants', name: 'amountOutMin' },
      { type: 'bytes', description: 'The UniswapV3 encoded path to trade along', name: 'path' },
      { type: 'bool', description: 'Whether the input tokens come from msg.sender (through Permit2) or are already in the router', name: 'payerIsUser' },
    ],
  },
  '1': {
    name: 'V3_SWAP_EXACT_OUT',
    params: [
      { type: 'address', description: 'The recipient of the output of the trade', name: 'recipient' },
      { type: 'uint256', description: 'The amount of output tokens to receive', name: 'amountOut' },
      { type: 'uint256', description: 'The maximum number of input tokens that should be spent', name: 'amountInMax' },
      { type: 'bytes', description: 'The UniswapV3 encoded path to trade along', name: 'path' },
      { type: 'bool', description: 'Whether the input tokens come from msg.sender (through Permit2) or are already in the router', name: 'payerIsUser' },
    ],
  },
  '2': {
    name: 'PERMIT2_TRANSFER_FROM',
    params: [
      { type: 'address', description: 'The token to fetch from Permit2', name: 'token' },
      { type: 'address', description: 'The recipient of the tokens fetched', name: 'recipient' },
      { type: 'uint256', description: 'The amount of token to fetch', name: 'amount' },
    ],
  },
  '3': {
    name: 'PERMIT2_PERMIT_BATCH',
    params: [
      { type: 'bytes', description: 'A PermitBatch struct outlining all of the Permit2 permits to execute', name: 'batch' },
      { type: 'bytes', description: 'The signature to provide to Permit2', name: 'data' },
    ],
  },
  '4': {
    name: 'SWEEP',
    params: [
      { type: 'address', description: 'The ERC20 token to sweep (or Constants.ETH for ETH)', name: 'token' },
      { type: 'address', description: 'The recipient of the sweep', name: 'recipient' },
      { type: 'uint256', description: 'The minimum required tokens to receive from the sweep', name: 'amountMin' },
    ],
  },
  '5': {
    name: 'TRANSFER',
    params: [
      { type: 'address', description: 'The ERC20 token to transfer (or Constants.ETH for ETH)', name: 'token' },
      { type: 'address', description: 'The recipient of the transfer', name: 'recipient' },
      { type: 'uint256', description: 'The amount to transfer', name: 'value' },
    ],
  },
  '6': {
    name: 'PAY_PORTION',
    params: [
      { type: 'address', description: 'The ERC20 token to transfer (or Constants.ETH for ETH)', name: 'token' },
      { type: 'address', description: 'The recipient of the transfer', name: 'recipient' },
      { type: 'uint256', description: "In basis points, the percentage of the contract's balance to transfer", name: 'bips' },
    ],
  },
  '8': {
    name: 'V2_SWAP_EXACT_IN',
    params: [
      { type: 'address', description: 'The recipient of the output of the trade', name: 'recipient' },
      { type: 'uint256', description: 'The amount of input tokens for the trade', name: 'amountIn' },
      { type: 'uint256', description: 'The minimum amount of output tokens the user wants', name: 'amountOutMin' },
      { type: 'address[]', description: 'The UniswapV2 token path to trade along', name: 'path' },
      { type: 'bool', description: 'Whether the input tokens come from msg.sender (through Permit2) or are already in the router', name: 'payerIsUser' },
    ],
  },
  '9': {
    name: 'V2_SWAP_EXACT_OUT',
    params: [
      { type: 'address', description: 'The recipient of the output of the trade', name: 'recipient' },
      { type: 'uint256', description: 'The amount of output tokens to receive', name: 'amountOut' },
      { type: 'uint256', description: 'The maximum number of input tokens that should be spent', name: 'amountInMax' },
      { type: 'address[]', description: 'The UniswapV2 token path to trade along', name: 'path' },
      { type: 'bool', description: 'Whether the input tokens come from msg.sender (through Permit2) or are already in the router', name: 'payerIsUser' },
    ],
  },
  '10': {
    name: 'PERMIT2_PERMIT',
    params: [
      { type: 'bytes', description: 'A PermitSingle struct outlining the Permit2 permit to execute', name: 'permitSingle' },
      { type: 'bytes', description: 'The signature to provide to Permit2', name: 'signature' },
    ],
  },
  '11': {
    name: 'WRAP_ETH',
    params: [
      { type: 'address', description: 'The recipient of the WETH', name: 'recipient' },
      { type: 'uint256', description: 'The amount of ETH to wrap', name: 'amountMin' },
    ],
  },
  '12': {
    name: 'UNWRAP_WETH',
    params: [
      { type: 'address', description: 'The recipient of the ETH', name: 'recipient' },
      { type: 'uint256', description: 'The minimum required ETH to receive from the unwrapping', name: 'amountMin' },
    ],
  },
  '13': {
    name: 'PERMIT2_TRANSFER_FROM_BATCH',
    params: [
      { type: 'bytes', description: 'An array of AllowanceTransferDetails structs describing Permit2 transfers to perform', name: 'batchDetails' },
    ],
  },
  '16': {
    name: 'SEAPORT',
    params: [
      { type: 'uint256', description: 'The ETH value to forward to the Seaport contract', name: 'value' },
      { type: 'bytes', description: 'The calldata to use to call the Seaport contract', name: 'data' },
    ],
  },
  '17': {
    name: 'LOOKS_RARE_721',
    params: [
      { type: 'uint256', description: 'The ETH value to forward to the LooksRare contract', name: 'value' },
      { type: 'bytes', description: 'The calldata to use to call the LooksRare contract', name: 'data' },
      { type: 'address', description: 'The recipient of the ERC721', name: 'recipient' },
      { type: 'address', description: 'The ERC721 token address', name: 'token' },
      { type: 'uint256', description: 'The ID of the ERC721', name: 'id' },
    ],
  },
  '18': {
    name: 'NFTX',
    params: [
      { type: 'uint256', description: 'The ETH value to forward to the NFTX contract', name: 'value' },
      { type: 'bytes', description: 'The calldata to use to call the NFTX contract', name: 'data' },
    ],
  },
  '19': {
    name: 'CRYPTOPUNKS',
    params: [
      { type: 'uint256', description: 'The PunkID to purchase', name: 'punkId' },
      { type: 'address', description: 'The recipient for the cryptopunk', name: 'recipient' },
      { type: 'uint256', description: 'The ETH value to forward to the Cryptopunks contract', name: 'value' },
    ],
  },
  '20': {
    name: 'LOOKS_RARE_1155',
    params: [
      { type: 'uint256', description: 'The ETH value to forward to the LooksRare contract', name: 'value' },
      { type: 'bytes', description: 'The calldata to use to call the LooksRare contract', name: 'data' },
      { type: 'address', description: 'The recipient of the ERC1155', name: 'recipient' },
      { type: 'address', description: 'The ERC1155 token address', name: 'token' },
      { type: 'uint256', description: 'The ID of the ERC1155', name: 'id' },
      { type: 'uint256', description: 'The amount of the ERC1155 to transfer', name: 'amount' },
    ],
  },
  '21': {
    name: 'OWNER_CHECK_721',
    params: [
      { type: 'address', description: 'The required owner of the ERC721', name: 'owner' },
      { type: 'address', description: 'The ERC721 token address', name: 'token' },
      { type: 'uint256', description: 'The ID of the ERC721', name: 'id' },
    ],
  },
  '22': {
    name: 'OWNER_CHECK_1155',
    params: [
      { type: 'address', description: 'The required owner of the ERC1155', name: 'owner' },
      { type: 'address', description: 'The ERC1155 token address', name: 'token' },
      { type: 'uint256', description: 'The ID of the ERC1155', name: 'id' },
      { type: 'uint256', description: 'The minimum required amount of the ERC1155', name: 'minBalance' },
    ],
  },
  '23': {
    name: 'SWEEP_ERC721',
    params: [
      { type: 'address', description: 'The ERC721 token address to transfer', name: 'token' },
      { type: 'address', description: 'The recipient of the transfer', name: 'recipient' },
      { type: 'uint256', description: 'The token ID to transfer', name: 'id' },
    ],
  },
  '24': {
    name: 'X2Y2_721',
    params: [
      { type: 'uint256', description: 'The ETH value to forward to the X2Y2 contract', name: 'value' },
      { type: 'bytes', description: 'The calldata to use to call the X2Y2 contract', name: 'data' },
      { type: 'address', description: 'The recipient of the ERC721', name: 'recipient' },
      { type: 'address', description: 'The ERC721 token address', name: 'token' },
      { type: 'uint256', description: 'The ID of the ERC721', name: 'id' },
    ],
  },
  '25': {
    name: 'SUDOSWAP',
    params: [
      { type: 'uint256', description: 'The ETH value to forward to the Sudoswap contract', name: 'value' },
      { type: 'bytes', description: 'The calldata to use to call the Sudoswap contract', name: 'data' },
    ],
  },
  '26': {
    name: 'NFT20',
    params: [
      { type: 'uint256', description: 'The ETH value to forward to the NFT20 contract', name: 'value' },
      { type: 'bytes', description: 'The calldata to use to call the NFT20 contract', name: 'data' },
    ],
  },
  '27': {
    name: 'X2Y2_1155',
    params: [
      { type: 'uint256', description: 'The ETH value to forward to the X2Y2 contract', name: 'value' },
      { type: 'bytes', description: 'The calldata to use to call the X2Y2 contract', name: 'data' },
      { type: 'address', description: 'The recipient of the ERC1155', name: 'recipient' },
      { type: 'address', description: 'The ERC1155 token address', name: 'token' },
      { type: 'uint256', description: 'The ID of the ERC1155', name: 'id' },
      { type: 'uint256', description: 'The amount of the ERC1155 to transfer', name: 'amount' },
    ],
  },
  '28': {
    name: 'FOUNDATION',
    params: [
      { type: 'uint256', description: 'The ETH value to forward to the Foundation contract', name: 'value' },
      { type: 'bytes', description: 'The calldata to use to call the Foundation contract', name: 'data' },
      { type: 'address', description: 'The recipient of the ERC721', name: 'recipient' },
      { type: 'address', description: 'The ERC721 token address', name: 'token' },
      { type: 'uint256', description: 'The ID of the ERC721', name: 'id' },
    ],
  },
  '29': {
    name: 'SWEEP_ERC1155',
    params: [
      { type: 'address', description: 'The ERC1155 token address to sweep', name: 'token' },
      { type: 'address', description: 'The recipient of the sweep', name: 'recipient' },
      { type: 'uint256', description: 'The token ID to sweep', name: 'id' },
      { type: 'uint256', description: 'The minimum required tokens to receive from the sweep', name: 'amount' },
    ],
  },
}

export interface UniswapPathPool {
  firstAddress: string
  tickSpacing: number
  secondAddress: string
}

export interface UniswapRouterCommand {
  name: string
  params: {
    name: string
    type: string
    description: string
    value: any
  }[]
}

export interface UniswapDecodeResult {
  _isUniswapRouter: true
  deadline?: string
  commands: UniswapRouterCommand[]
}

const ADDRESS_LENGTH = 40
const TICK_SPACING_LENGTH = 6

// Known Uniswap Universal Router addresses across chains
export const UNISWAP_UNIVERSAL_ROUTER_ADDRESSES: string[] = [
  // Mainnet
  '0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B',
  '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
  // Arbitrum
  '0x4C60051384bd2d3C01bfc845Cf5F4b44bcbE9de5',
  '0xeC8B0F7Ffe3ae75d7FfAb09429e3675bb63503e4',
  '0x5E325eDA8064b456f4781070C0738d849c824258',
  // Base
  '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
  // Optimism
  '0xb555edF5dcF85f42cEeF1f3630a52A108E55A654',
  '0xCb1355ff08Ab38bBCE60111F1bb2B784bE25D7e8',
  // Polygon
  '0x4C60051384bd2d3C01bfc845Cf5F4b44bcbE9de5',
  '0x643770E279d5D0733F21d6DC03A8efbABf3255B4',
  '0xec7BE89e9d109e7e3Fec59c222CF297125FEFda2',
  // BSC
  '0x5Dc88340E1c5c6366864Ee415d6034cadd1A9897',
  '0x4Dae2f939ACf50408e13d58534Ff8c2776d45265',
  // Avalanche
  '0x82635AF6146972cD6601161c4472ffe97237D292',
  '0x4Dae2f939ACf50408e13d58534Ff8c2776d45265',
].map(a => a.toLowerCase())

// Uniswap execute function selectors
const EXECUTE_WITH_DEADLINE_SELECTOR = '0x3593564c' // execute(bytes,bytes[],uint256)
const EXECUTE_SELECTOR = '0x24856bc3' // execute(bytes,bytes[])

function decodeUniswapPath(rawPath: string): UniswapPathPool[] {
  const pools: UniswapPathPool[] = []
  let remainingData = rawPath.startsWith('0x') ? rawPath.substring(2) : rawPath
  let currentPool: Partial<UniswapPathPool> = {}
  let isParsingAddress = true

  while (remainingData.length >= (isParsingAddress ? ADDRESS_LENGTH : TICK_SPACING_LENGTH)) {
    if (isParsingAddress) {
      const address = '0x' + remainingData.slice(0, ADDRESS_LENGTH)

      if (currentPool.firstAddress) {
        currentPool.secondAddress = address
        pools.push(currentPool as UniswapPathPool)
        currentPool = { firstAddress: address }
      } else {
        currentPool.firstAddress = address
      }

      remainingData = remainingData.slice(ADDRESS_LENGTH)
    } else {
      currentPool.tickSpacing = parseInt(remainingData.slice(0, TICK_SPACING_LENGTH), 16)
      remainingData = remainingData.slice(TICK_SPACING_LENGTH)
    }

    isParsingAddress = !isParsingAddress
  }

  return pools
}

function decodeUniswapCommand(commandByte: string, input: string): UniswapRouterCommand | undefined {
  const commandValue = parseInt(commandByte, 16)
  const commandIndex = commandValue & 0b11111

  const data = UNISWAP_ROUTER_COMMANDS[String(commandIndex)]

  if (!data) {
    return undefined
  }

  try {
    const types = data.params.map(param => param.type)
    const abiCoder = AbiCoder.defaultAbiCoder()
    const values = abiCoder.decode(types, input)

    const params = data.params.map((param, index) => {
      let value = values[index]

      // Convert BigInt to string
      if (typeof value === 'bigint') {
        value = value.toString()
      }

      // Decode path for V3 swaps
      if (param.name === 'path' && param.type === 'bytes') {
        value = decodeUniswapPath(value)
      }

      // Convert address arrays
      if (Array.isArray(value)) {
        value = value.map(v => typeof v === 'bigint' ? v.toString() : v)
      }

      return {
        name: param.name,
        type: param.type,
        description: param.description,
        value,
      }
    })

    return {
      name: data.name,
      params,
    }
  } catch (e) {
    console.error('Failed to decode Uniswap command:', e)
    return undefined
  }
}

export function isUniswapRouterData(data: string): boolean {
  if (!data || data.length < 10) return false
  const selector = data.substring(0, 10).toLowerCase()
  return selector === EXECUTE_WITH_DEADLINE_SELECTOR || selector === EXECUTE_SELECTOR
}

export function decodeUniswapRouterData(transactionData: string): UniswapDecodeResult | null {
  if (!transactionData || transactionData.length < 10) {
    return null
  }

  let hex = transactionData.startsWith('0x') ? transactionData.substring(2) : transactionData
  if (hex.length % 2 !== 0) hex += '0'
  const data = '0x' + hex

  const selector = data.substring(0, 10).toLowerCase()
  const hasDeadline = selector === EXECUTE_WITH_DEADLINE_SELECTOR

  try {
    const abiCoder = AbiCoder.defaultAbiCoder()
    const calldata = '0x' + data.substring(10)

    const types = hasDeadline
      ? ['bytes', 'bytes[]', 'uint256']
      : ['bytes', 'bytes[]']
    const decoded = abiCoder.decode(types, calldata)

    const commands = decoded[0] as string
    const inputs = decoded[1] as string[]
    const deadline = hasDeadline ? decoded[2].toString() : undefined

    const commandBytes = (commands.startsWith('0x') ? commands.slice(2) : commands).match(/.{1,2}/g) || []

    const decodedCommands = commandBytes
      .map((commandByte, i) => decodeUniswapCommand(commandByte, inputs[i]))
      .filter((command): command is UniswapRouterCommand => command !== undefined)

    return {
      _isUniswapRouter: true,
      deadline,
      commands: decodedCommands,
    }
  } catch (e) {
    console.error('Failed to decode Uniswap router data:', e)
    return null
  }
}
