import { describe, it, expect } from 'vitest'
import { AbiCoder } from 'ethers'
import {
  isUniswapRouterData,
  decodeUniswapRouterData,
  formatUniswapCommand,
  formatUniswapPath,
  UNISWAP_ROUTER_COMMANDS,
  type UniswapRouterCommand,
} from '@/lib/uniswap-decoder'

// Exact hex from the page example (execute with deadline)
const EXAMPLE_TX = '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000065f5e10000000000000000000000000000000000000000000000000000000000000000020b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000016345785d8a000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000016345785d8a00000000000000000000000000000000000000000000000000000000000002faf08000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002bc02aaa39b223fe8d0a0e5c4f27ead9083c756cc20001f4a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000'

describe('isUniswapRouterData', () => {
  it('detects execute with deadline selector', () => {
    expect(isUniswapRouterData('0x3593564c0000')).toBe(true)
  })

  it('detects execute without deadline selector', () => {
    expect(isUniswapRouterData('0x24856bc30000')).toBe(true)
  })

  it('rejects non-uniswap selectors', () => {
    expect(isUniswapRouterData('0x095ea7b30000')).toBe(false)
  })

  it('rejects empty/short data', () => {
    expect(isUniswapRouterData('')).toBe(false)
    expect(isUniswapRouterData('0x3593')).toBe(false)
  })
})

describe('UNISWAP_ROUTER_COMMANDS', () => {
  it('has all expected swap commands', () => {
    expect(UNISWAP_ROUTER_COMMANDS['0'].name).toBe('V3_SWAP_EXACT_IN')
    expect(UNISWAP_ROUTER_COMMANDS['1'].name).toBe('V3_SWAP_EXACT_OUT')
    expect(UNISWAP_ROUTER_COMMANDS['8'].name).toBe('V2_SWAP_EXACT_IN')
    expect(UNISWAP_ROUTER_COMMANDS['9'].name).toBe('V2_SWAP_EXACT_OUT')
  })

  it('has NFT marketplace commands', () => {
    expect(UNISWAP_ROUTER_COMMANDS['16'].name).toBe('SEAPORT')
    expect(UNISWAP_ROUTER_COMMANDS['17'].name).toBe('LOOKS_RARE_721')
    expect(UNISWAP_ROUTER_COMMANDS['19'].name).toBe('CRYPTOPUNKS')
    expect(UNISWAP_ROUTER_COMMANDS['29'].name).toBe('SWEEP_ERC1155')
  })

  it('does not have commands 7, 14, 15 (reserved)', () => {
    expect(UNISWAP_ROUTER_COMMANDS['7']).toBeUndefined()
    expect(UNISWAP_ROUTER_COMMANDS['14']).toBeUndefined()
    expect(UNISWAP_ROUTER_COMMANDS['15']).toBeUndefined()
  })
})

describe('decodeUniswapRouterData', () => {
  it('decodes the example execute-with-deadline tx', () => {
    const result = decodeUniswapRouterData(EXAMPLE_TX)

    expect(result).not.toBeNull()
    expect(result!._isUniswapRouter).toBe(true)
    expect(result!.deadline).toBeDefined()
    // 0x65f5e100 = 1710612736
    expect(result!.deadline).toBe('1710612736')
    expect(result!.commands).toHaveLength(2)
    expect(result!.commands[0].name).toBe('WRAP_ETH')
    expect(result!.commands[1].name).toBe('V3_SWAP_EXACT_IN')
  })

  it('decodes a well-formed WRAP_ETH + V3_SWAP_EXACT_IN tx', () => {
    // Build a minimal valid execute(bytes,bytes[],uint256) with
    // WRAP_ETH (0x0b) and V3_SWAP_EXACT_IN (0x00) commands
    const coder = AbiCoder.defaultAbiCoder()

    const wrapInput = coder.encode(
      ['address', 'uint256'],
      ['0x0000000000000000000000000000000000000002', '100000000000000000']
    )
    const path = '0x' +
      'c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' +
      '0001f4' +
      'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    const swapInput = coder.encode(
      ['address', 'uint256', 'uint256', 'bytes', 'bool'],
      ['0x0000000000000000000000000000000000000002', '100000000000000000', '50000000', path, true]
    )

    const commands = '0x0b00'
    const calldata = coder.encode(
      ['bytes', 'bytes[]', 'uint256'],
      [commands, [wrapInput, swapInput], '1710612736']
    )
    const tx = '0x3593564c' + calldata.substring(2)

    const result = decodeUniswapRouterData(tx)
    expect(result).not.toBeNull()
    expect(result!.commands).toHaveLength(2)
    expect(result!.commands[0].name).toBe('WRAP_ETH')
    expect(result!.commands[0].params[0].name).toBe('recipient')
    expect(result!.commands[1].name).toBe('V3_SWAP_EXACT_IN')

    const pathParam = result!.commands[1].params.find(
      p => p.name === 'path'
    )
    expect(pathParam).toBeDefined()
    expect(Array.isArray(pathParam!.value)).toBe(true)

    const pool = pathParam!.value[0]
    expect(pool.firstAddress.toLowerCase()).toContain(
      'c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    )
    expect(pool.secondAddress.toLowerCase()).toContain(
      'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    )
    expect(pool.tickSpacing).toBe(500)
  })

  it('returns null for empty or too-short data', () => {
    expect(decodeUniswapRouterData('')).toBeNull()
    expect(decodeUniswapRouterData('0x')).toBeNull()
    expect(decodeUniswapRouterData('0x3593564c0000')).toBeNull()
  })

  it('handles data without 0x prefix', () => {
    const withoutPrefix = EXAMPLE_TX.substring(2)
    const result = decodeUniswapRouterData(withoutPrefix)
    expect(result).not.toBeNull()
    expect(result!._isUniswapRouter).toBe(true)
  })

  it('decodes a V2_SWAP_EXACT_IN command with address[] path', () => {
    const coder = AbiCoder.defaultAbiCoder()

    const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

    const v2SwapInput = coder.encode(
      ['address', 'uint256', 'uint256', 'address[]', 'bool'],
      ['0x0000000000000000000000000000000000000001', '500000000000000000', '1000000', [WETH, USDC], true]
    )

    const commands = '0x08' // V2_SWAP_EXACT_IN
    const calldata = coder.encode(
      ['bytes', 'bytes[]', 'uint256'],
      [commands, [v2SwapInput], '1999999999']
    )
    const tx = '0x3593564c' + calldata.substring(2)

    const result = decodeUniswapRouterData(tx)
    expect(result).not.toBeNull()
    expect(result!.commands).toHaveLength(1)
    expect(result!.commands[0].name).toBe('V2_SWAP_EXACT_IN')

    const pathParam = result!.commands[0].params.find(p => p.name === 'path')
    expect(pathParam).toBeDefined()
    expect(pathParam!.type).toBe('address[]')
    expect(Array.isArray(pathParam!.value)).toBe(true)
    expect(pathParam!.value[0].toLowerCase()).toContain('c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
    expect(pathParam!.value[1].toLowerCase()).toContain('a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')
  })

  it('decodes a V2_SWAP_EXACT_OUT command', () => {
    const coder = AbiCoder.defaultAbiCoder()

    const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F'

    const v2SwapOutput = coder.encode(
      ['address', 'uint256', 'uint256', 'address[]', 'bool'],
      ['0x0000000000000000000000000000000000000001', '1000000000000000000', '600000000000000000', [WETH, DAI], false]
    )

    const commands = '0x09' // V2_SWAP_EXACT_OUT
    const calldata = coder.encode(
      ['bytes', 'bytes[]', 'uint256'],
      [commands, [v2SwapOutput], '1999999999']
    )
    const tx = '0x3593564c' + calldata.substring(2)

    const result = decodeUniswapRouterData(tx)
    expect(result).not.toBeNull()
    expect(result!.commands[0].name).toBe('V2_SWAP_EXACT_OUT')
    expect(result!.commands[0].params.find(p => p.name === 'path')!.type).toBe('address[]')
  })

  it('decodes execute without deadline (selector 0x24856bc3)', () => {
    const coder = AbiCoder.defaultAbiCoder()

    const unwrapInput = coder.encode(
      ['address', 'uint256'],
      ['0x0000000000000000000000000000000000000001', '200000000000000000']
    )

    const commands = '0x0c' // UNWRAP_WETH
    const calldata = coder.encode(
      ['bytes', 'bytes[]'],
      [commands, [unwrapInput]]
    )
    const tx = '0x24856bc3' + calldata.substring(2)

    const result = decodeUniswapRouterData(tx)
    expect(result).not.toBeNull()
    expect(result!._isUniswapRouter).toBe(true)
    expect(result!.deadline).toBeUndefined()
    expect(result!.commands).toHaveLength(1)
    expect(result!.commands[0].name).toBe('UNWRAP_WETH')
  })
})

describe('formatUniswapPath', () => {
  it('renders an empty path placeholder', () => {
    expect(formatUniswapPath([])).toBe('(empty path)')
  })

  it('renders a multi-hop V3 path as a fee-tier chain', () => {
    const formatted = formatUniswapPath([
      { firstAddress: '0xAAA', tickSpacing: 500, secondAddress: '0xBBB' },
      { firstAddress: '0xBBB', tickSpacing: 3000, secondAddress: '0xCCC' },
    ])
    expect(formatted).toBe('0xAAA --[500]--> 0xBBB --[3000]--> 0xCCC')
  })
})

describe('formatUniswapCommand', () => {
  const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
  const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

  it('renders a V2 address[] path as an arrow-joined token list', () => {
    const command: UniswapRouterCommand = {
      name: 'V2_SWAP_EXACT_IN',
      params: [
        { name: 'path', type: 'address[]', description: 'The UniswapV2 token path', value: [WETH, USDC] },
      ],
    }

    const result = formatUniswapCommand(command)
    expect(result).toContain(`path: ${WETH} → ${USDC}`)
    // The V2 branch must not fall through to the V3 hop-chain formatting.
    expect(result).not.toContain('--[')
  })

  it('renders a V3 bytes path as a hop chain, not an arrow list', () => {
    const command: UniswapRouterCommand = {
      name: 'V3_SWAP_EXACT_IN',
      params: [
        {
          name: 'path',
          type: 'bytes',
          description: 'The UniswapV3 encoded path',
          value: [{ firstAddress: WETH, tickSpacing: 500, secondAddress: USDC }],
        },
      ],
    }

    const result = formatUniswapCommand(command)
    expect(result).toContain(`path: ${WETH} --[500]--> ${USDC}`)
    expect(result).not.toContain(' → ')
  })

  it('renders non-path params as plain key/value lines', () => {
    const command: UniswapRouterCommand = {
      name: 'WRAP_ETH',
      params: [
        { name: 'recipient', type: 'address', description: 'The recipient of the WETH', value: WETH },
        { name: 'amountMin', type: 'uint256', description: 'The amount of ETH to wrap', value: '1000' },
      ],
    }

    const result = formatUniswapCommand(command)
    expect(result).toContain('Command: WRAP_ETH')
    expect(result).toContain(`recipient: ${WETH}`)
    expect(result).toContain('amountMin: 1000')
  })
})
