import { describe, it, expect } from 'vitest'
import {
  isUniswapRouterData,
  decodeUniswapRouterData,
  UNISWAP_ROUTER_COMMANDS,
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
    const { AbiCoder: Coder } = require('ethers')
    const coder = Coder.defaultAbiCoder()

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
})
