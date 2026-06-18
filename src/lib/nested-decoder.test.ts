import { describe, it, expect } from 'vitest'
import { AbiCoder } from 'ethers'
import { isUniswapRouterData, decodeUniswapRouterData } from '@/lib/uniswap-decoder'
import { decodeMultiSendData, decodeNestedCalldata } from '@/lib/nested-decoder'

// Uniswap execute with deadline calldata: WRAP_ETH + V3_SWAP_EXACT_IN
const UNISWAP_CALLDATA = '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000065f5e10000000000000000000000000000000000000000000000000000000000000000020b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000016345785d8a000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000016345785d8a00000000000000000000000000000000000000000000000000000000000002faf08000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002bc02aaa39b223fe8d0a0e5c4f27ead9083c756cc20001f4a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000'

/**
 * Build a Safe multi-send packed payload.
 *
 * Format per inner tx:
 *   operation (1 byte) + to (20 bytes) + value (32 bytes) + dataLength (32 bytes) + data (variable)
 */
function buildMultiSendData(transactions: { operation: number; to: string; value: bigint; data: string }[]): string {
  let packed = ''
  for (const tx of transactions) {
    const op = tx.operation.toString(16).padStart(2, '0')
    const to = tx.to.replace('0x', '').toLowerCase().padStart(40, '0')
    const value = tx.value.toString(16).padStart(64, '0')
    const rawData = tx.data.startsWith('0x') ? tx.data.slice(2) : tx.data
    const dataLength = (rawData.length / 2).toString(16).padStart(64, '0')
    packed += op + to + value + dataLength + rawData
  }
  return '0x' + packed
}

describe('decodeMultiSendData', () => {
  it('parses a multi-send payload with a simple ETH transfer', () => {
    const packed = buildMultiSendData([
      { operation: 0, to: '0x1234567890abcdef1234567890abcdef12345678', value: 1000000000000000n, data: '0x' },
    ])

    const result = decodeMultiSendData(packed)
    expect(result).not.toBeNull()
    expect(result!._isMultiSend).toBe(true)
    expect(result!.transactions).toHaveLength(1)
    expect(result!.transactions[0].operation).toBe(0)
    expect(result!.transactions[0].to).toBe('0x1234567890abcdef1234567890abcdef12345678')
  })

  it('parses multi-send with embedded Uniswap calldata', () => {
    const UNISWAP_ROUTER = '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD'
    const packed = buildMultiSendData([
      { operation: 0, to: '0x1111111111111111111111111111111111111111', value: 0n, data: '0x' },
      { operation: 0, to: UNISWAP_ROUTER, value: 100000000000000000n, data: UNISWAP_CALLDATA },
    ])

    const result = decodeMultiSendData(packed)
    expect(result).not.toBeNull()
    expect(result!._isMultiSend).toBe(true)
    expect(result!.transactions).toHaveLength(2)

    // The second transaction should contain the Uniswap calldata
    const uniswapTx = result!.transactions[1]
    expect(uniswapTx.data).toBe(UNISWAP_CALLDATA)
    expect(isUniswapRouterData(uniswapTx.data)).toBe(true)
  })
})

describe('decodeNestedCalldata', () => {
  const noopResolver = async () => [] as string[]

  it('detects and decodes Uniswap router data in nested calldata', async () => {
    const result = await decodeNestedCalldata(UNISWAP_CALLDATA, noopResolver)

    // Should use the specialized Uniswap decoder
    expect(result).not.toBe(UNISWAP_CALLDATA) // not returned as raw string
    expect(typeof result).toBe('object')
    expect((result as any)._isUniswapRouter).toBe(true)
    expect((result as any).commands).toHaveLength(2)
    expect((result as any).commands[0].name).toBe('WRAP_ETH')
    expect((result as any).commands[1].name).toBe('V3_SWAP_EXACT_IN')
  })

  it('decodes Uniswap call found inside multi-send transactions', async () => {
    const UNISWAP_ROUTER = '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD'
    const packed = buildMultiSendData([
      { operation: 0, to: '0x1111111111111111111111111111111111111111', value: 0n, data: '0x' },
      { operation: 0, to: UNISWAP_ROUTER, value: 100000000000000000n, data: UNISWAP_CALLDATA },
    ])

    const result = await decodeNestedCalldata(packed, noopResolver, { decodeMultiSend: true })

    // Should detect as multi-send
    expect(typeof result).toBe('object')
    expect((result as any)._isMultiSend).toBe(true)

    const transactions = (result as any).transactions
    expect(transactions).toHaveLength(2)

    // The second inner transaction's data should be decoded as Uniswap
    const uniswapInner = transactions[1].decodedData
    expect(uniswapInner).toBeDefined()
    expect(uniswapInner._isUniswapRouter).toBe(true)
    expect(uniswapInner.commands[0].name).toBe('WRAP_ETH')
    expect(uniswapInner.commands[1].name).toBe('V3_SWAP_EXACT_IN')
  })

  it('falls back to generic decode for non-specialized calldata', async () => {
    // approve(address,uint256) - selector 0x095ea7b3
    const coder = AbiCoder.defaultAbiCoder()
    const params = coder.encode(
      ['address', 'uint256'],
      ['0x1234567890abcdef1234567890abcdef12345678', '1000000000000000000']
    )
    const calldata = '0x095ea7b3' + params.slice(2)

    // Provide a resolver that returns the approve signature
    const resolver = async (selector: string) => {
      if (selector === '0x095ea7b3') return ['approve(address,uint256)']
      return []
    }

    const result = await decodeNestedCalldata(calldata, resolver)

    expect(typeof result).toBe('object')
    expect((result as any)._isNestedCall).toBe(true)
    expect((result as any).function).toBe('approve(address,uint256)')
    expect((result as any).parameters.param0.toLowerCase()).toBe('0x1234567890abcdef1234567890abcdef12345678')
  })

  it('returns raw string when no decoder matches and no signatures found', async () => {
    const unknownCalldata = '0xdeadbeef0000000000000000000000000000000000000000000000000000000000000001'

    const result = await decodeNestedCalldata(unknownCalldata, noopResolver)

    expect(result).toBe(unknownCalldata)
  })

  it('decodes multi-send with multiple Uniswap calls', async () => {
    const packed = buildMultiSendData([
      { operation: 0, to: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', value: 100000000000000000n, data: UNISWAP_CALLDATA },
      { operation: 0, to: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', value: 200000000000000000n, data: UNISWAP_CALLDATA },
    ])

    const result = await decodeNestedCalldata(packed, noopResolver, { decodeMultiSend: true })

    expect((result as any)._isMultiSend).toBe(true)
    const txs = (result as any).transactions
    expect(txs).toHaveLength(2)

    // Both should be decoded as Uniswap
    expect(txs[0].decodedData._isUniswapRouter).toBe(true)
    expect(txs[1].decodedData._isUniswapRouter).toBe(true)
  })

  it('decodes multi-send with mixed transaction types', async () => {
    // approve(address,uint256) calldata
    const coder = AbiCoder.defaultAbiCoder()
    const approveParams = coder.encode(
      ['address', 'uint256'],
      ['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '1000000000000000000']
    )
    const approveCalldata = '0x095ea7b3' + approveParams.slice(2)

    const packed = buildMultiSendData([
      { operation: 0, to: '0x1111111111111111111111111111111111111111', value: 1000000000000000000n, data: '0x' },          // ETH transfer
      { operation: 0, to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', value: 0n, data: approveCalldata },                // approve
      { operation: 0, to: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', value: 100000000000000000n, data: UNISWAP_CALLDATA }, // Uniswap swap
    ])

    const resolver = async (selector: string) => {
      if (selector === '0x095ea7b3') return ['approve(address,uint256)']
      return []
    }

    const result = await decodeNestedCalldata(packed, resolver, { decodeMultiSend: true })

    expect((result as any)._isMultiSend).toBe(true)
    const txs = (result as any).transactions
    expect(txs).toHaveLength(3)

    // Tx 0: no data, no decoded
    expect(txs[0].decodedData).toBeUndefined()

    // Tx 1: approve, generic decode
    expect(txs[1].decodedData._isNestedCall).toBe(true)
    expect(txs[1].decodedData.function).toBe('approve(address,uint256)')

    // Tx 2: Uniswap, specialized decode
    expect(txs[2].decodedData._isUniswapRouter).toBe(true)
    expect(txs[2].decodedData.commands[0].name).toBe('WRAP_ETH')
  })

  it('does not crash on malformed calldata inside multi-send', async () => {
    const packed = buildMultiSendData([
      { operation: 0, to: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', value: 0n, data: '0x3593564cDEAD' }, // truncated Uniswap
      { operation: 0, to: '0x1111111111111111111111111111111111111111', value: 0n, data: '0xffffffff' },       // unknown selector, too short
    ])

    const result = await decodeNestedCalldata(packed, noopResolver, { decodeMultiSend: true })

    // Should still parse as multi-send without crashing
    expect((result as any)._isMultiSend).toBe(true)
    expect((result as any).transactions).toHaveLength(2)
  })

  it('returns raw string for empty or too-short input', async () => {
    expect(await decodeNestedCalldata('', noopResolver)).toBe('')
    expect(await decodeNestedCalldata('0x', noopResolver)).toBe('0x')
    expect(await decodeNestedCalldata('0x1234', noopResolver)).toBe('0x1234')
    expect(await decodeNestedCalldata('not hex at all', noopResolver)).toBe('not hex at all')
  })

  it('does not decode multi-send when option is disabled', async () => {
    const packed = buildMultiSendData([
      { operation: 0, to: '0x1111111111111111111111111111111111111111', value: 0n, data: '0x' },
      { operation: 0, to: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', value: 100000000000000000n, data: UNISWAP_CALLDATA },
    ])

    const result = await decodeNestedCalldata(packed, noopResolver)

    expect(typeof result).toBe('string')
  })

  it('handles resolver that throws errors gracefully', async () => {
    const brokenResolver = async () => { throw new Error('API down') }
    const calldata = '0xdeadbeef0000000000000000000000000000000000000000000000000000000000000001'

    const result = await decodeNestedCalldata(calldata, brokenResolver)

    expect(result).toBe(calldata)
  })
})

describe('decodeMultiSendData edge cases', () => {
  it('returns null for invalid operation byte', () => {
    // operation = 5 (invalid, only 0 and 1 are valid)
    const invalid = '0x' + '05' + '1111111111111111111111111111111111111111'
      + '0'.repeat(64) + '0'.repeat(64)

    expect(decodeMultiSendData(invalid)).toBeNull()
  })

  it('returns null for data too short for header', () => {
    expect(decodeMultiSendData('0x0011')).toBeNull()
    expect(decodeMultiSendData('0x')).toBeNull()
    expect(decodeMultiSendData('')).toBeNull()
  })

  it('parses DelegateCall operations (operation = 1)', () => {
    const packed = buildMultiSendData([
      { operation: 1, to: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', value: 0n, data: '0x12345678' },
    ])

    const result = decodeMultiSendData(packed)
    expect(result).not.toBeNull()
    expect(result!.transactions[0].operation).toBe(1)
  })

  it('handles multi-send with zero-value and zero-data transactions', () => {
    const packed = buildMultiSendData([
      { operation: 0, to: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', value: 0n, data: '0x' },
      { operation: 0, to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', value: 0n, data: '0x' },
      { operation: 0, to: '0xcccccccccccccccccccccccccccccccccccccccc', value: 0n, data: '0x' },
    ])

    const result = decodeMultiSendData(packed)
    expect(result).not.toBeNull()
    expect(result!.transactions).toHaveLength(3)
  })

  it('returns null when a declared data length exceeds the buffer', () => {
    // Header declares 100 bytes of data (0x64) but carries none.
    const overrun = '0x' + '00' + '0'.repeat(40) + '0'.repeat(64) + '64'.padStart(64, '0')

    expect(decodeMultiSendData(overrun)).toBeNull()
  })

  it('returns null when trailing bytes remain after the last transaction', () => {
    const packed = buildMultiSendData([
      { operation: 0, to: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', value: 0n, data: '0x' },
    ])

    // Append junk that is too short to form another transaction header.
    expect(decodeMultiSendData(packed + 'dead')).toBeNull()
  })
})
