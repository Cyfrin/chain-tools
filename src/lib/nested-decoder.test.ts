import { describe, it, expect } from 'vitest'
import { AbiCoder } from 'ethers'
import { isUniswapRouterData, decodeUniswapRouterData } from '@/lib/uniswap-decoder'
import { decodeMultiSendData, decodeMultiSendTransactions, decodeAggregate3ValueData, decodeAggregate3ValueCalls, decodeNestedCalldata } from '@/lib/nested-decoder'

// Uniswap execute with deadline calldata: WRAP_ETH + V3_SWAP_EXACT_IN
const UNISWAP_CALLDATA = '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000065f5e10000000000000000000000000000000000000000000000000000000000000000020b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000016345785d8a000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000016345785d8a00000000000000000000000000000000000000000000000000000000000002faf08000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002bc02aaa39b223fe8d0a0e5c4f27ead9083c756cc20001f4a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000'

/**
 * Build a Safe multi-send packed payload.
 *
 * Format per inner tx:
 *   operation (1 byte) + to (20 bytes) + value (32 bytes) + dataLength (32 bytes) + data (variable)
 */
// Real-world Multicall3 aggregate3Value batching two Safe execTransactions
// that each delegatecall Multicall3 again: the first Safe approves the second
// Safe's transaction hash, the second executes a setImplementation call.
const NESTED_SAFE_AGGREGATE3_VALUE_CALLDATA = '0x174dea710000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000440000000000000000000000000c2819dc788505aac350142a7a707bf9d03e3bd0300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000003446a761202000000000000000000000000ca11bde05977b3631167028862be2a173976ca110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000144174dea710000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000005a0aae59d09fccbddb6c6cceb07b7279367c3d2a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000024d4d9bdcdff21287dc91ef8d0d631df016c6d1c3de6ea14b4208d23467c7e874f24f196bc00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041000000000000000000000000ca11bde05977b3631167028862be2a173976ca1100000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005a0aae59d09fccbddb6c6cceb07b7279367c3d2a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000004646a761202000000000000000000000000ca11bde05977b3631167028862be2a173976ca110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e00000000000000000000000000000000000000000000000000000000000000264174dea7100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000010d7b35078d3baabb96dd45a9143b94be65b12cd0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000144b10709570000000000000000000000000000000000000000000000000000000000000001000000000000000000000000e1dffcbe4e22b813f26d2106d943c102e7cab87e000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a4dead000000000000000000000000000000000000000000000000000000000000acc005dcd857b401e4732e6f7837135a22825cfaee018baf058227872540ac60efbd38b023d9dae257b4c29daee99a28e6e86778b499361294c134ea000000000000000000000000000000000000000000000000000000000000def13832bfbef03173e4c49a00ec0dd178817a02d1779ba6e03d8b90de867373db8cf1a58d2f7f006b3a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041000000000000000000000000c2819dc788505aac350142a7a707bf9d03e3bd030000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

/**
 * Build Multicall3 aggregate3Value((address,bool,uint256,bytes)[]) calldata,
 * selector 0x174dea71.
 */
function buildAggregate3ValueData(calls: { target: string; allowFailure: boolean; value: bigint; callData: string }[]): string {
  const encoded = AbiCoder.defaultAbiCoder().encode(
    ['tuple(address,bool,uint256,bytes)[]'],
    [calls.map((call) => [call.target, call.allowFailure, call.value, call.callData])]
  )
  return '0x174dea71' + encoded.slice(2)
}

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

  it('tolerates trailing zero padding (ABI right-padding of the bytes value)', () => {
    const packed = buildMultiSendData([
      { operation: 0, to: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', value: 0n, data: '0x12345678' },
    ])

    // A real Safe multiSend(bytes) carries the packed payload right-padded to a
    // 32-byte boundary; a hand-extracted payload keeps those trailing zero bytes.
    const result = decodeMultiSendData(packed + '00'.repeat(12))
    expect(result).not.toBeNull()
    expect(result!.transactions).toHaveLength(1)
    expect(result!.transactions[0].data).toBe('0x12345678')
  })

  it('tolerates up to 31 zero-padding bytes but rejects a full padding word', () => {
    const packed = buildMultiSendData([
      { operation: 0, to: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', value: 0n, data: '0x' },
    ])

    expect(decodeMultiSendData(packed + '00'.repeat(31))).not.toBeNull()
    expect(decodeMultiSendData(packed + '00'.repeat(32))).toBeNull()
  })

  it('rejects short non-zero trailing bytes', () => {
    const packed = buildMultiSendData([
      { operation: 0, to: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', value: 0n, data: '0x' },
    ])

    // A non-zero leftover is not padding, even when it is short.
    expect(decodeMultiSendData(packed + '00000001')).toBeNull()
  })
})

describe('decodeMultiSendTransactions', () => {
  const noopResolver = async () => [] as string[]

  it('returns null for data that is not a packed multi-send', async () => {
    const result = await decodeMultiSendTransactions(UNISWAP_CALLDATA, noopResolver, { decodeMultiSend: true })
    expect(result).toBeNull()
  })

  it('decodes a bare packed multi-send (with trailing padding) and its inner calls', async () => {
    const UNISWAP_ROUTER = '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD'
    const packed = buildMultiSendData([
      { operation: 0, to: UNISWAP_ROUTER, value: 0n, data: UNISWAP_CALLDATA },
    ])

    // Mirrors a payload pasted without its multiSend(bytes) wrapper, with the
    // bytes value's trailing ABI zero-padding still attached.
    const result = await decodeMultiSendTransactions(packed + '00'.repeat(12), noopResolver, { decodeMultiSend: true })

    expect(result).not.toBeNull()
    expect(result!._isMultiSend).toBe(true)
    expect(result!.transactions).toHaveLength(1)

    const inner = result!.transactions[0].decodedData as any
    expect(inner._isUniswapRouter).toBe(true)
    expect(inner.commands[0].name).toBe('WRAP_ETH')
  })
})

describe('decodeAggregate3ValueData', () => {
  it('parses aggregate3Value calldata into named calls', () => {
    const calldata = buildAggregate3ValueData([
      { target: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', allowFailure: false, value: 100000000000000000n, callData: '0xd0e30db0' },
      { target: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', allowFailure: true, value: 0n, callData: '0x' },
    ])

    const result = decodeAggregate3ValueData(calldata)
    expect(result).not.toBeNull()
    expect(result!._isAggregate3Value).toBe(true)
    expect(result!.calls).toHaveLength(2)

    expect(result!.calls[0].target).toBe('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
    expect(result!.calls[0].allowFailure).toBe(false)
    expect(result!.calls[0].value).toBe('100000000000000000')
    expect(result!.calls[0].callData).toBe('0xd0e30db0')

    expect(result!.calls[1].allowFailure).toBe(true)
    expect(result!.calls[1].value).toBe('0')
    expect(result!.calls[1].callData).toBe('0x')
  })

  it('accepts calldata without a 0x prefix', () => {
    const calldata = buildAggregate3ValueData([
      { target: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', allowFailure: false, value: 0n, callData: '0x' },
    ])

    const result = decodeAggregate3ValueData(calldata.slice(2))
    expect(result).not.toBeNull()
    expect(result!.calls).toHaveLength(1)
  })

  it('matches the selector case-insensitively', () => {
    const calldata = buildAggregate3ValueData([
      { target: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', allowFailure: false, value: 0n, callData: '0x' },
    ])

    const upper = '0x' + calldata.slice(2).toUpperCase()
    expect(decodeAggregate3ValueData(upper)).not.toBeNull()
  })

  it('parses an empty calls array', () => {
    const result = decodeAggregate3ValueData(buildAggregate3ValueData([]))
    expect(result).not.toBeNull()
    expect(result!.calls).toHaveLength(0)
  })

  it('returns null for a different selector', () => {
    expect(decodeAggregate3ValueData(UNISWAP_CALLDATA)).toBeNull()
    expect(decodeAggregate3ValueData('0x')).toBeNull()
    expect(decodeAggregate3ValueData('')).toBeNull()
  })

  it('returns null when the body does not decode as Call3Value[]', () => {
    expect(decodeAggregate3ValueData('0x174dea71deadbeef')).toBeNull()
  })
})

describe('decodeAggregate3ValueCalls', () => {
  const noopResolver = async () => [] as string[]

  it('returns null for data that is not an aggregate3Value call', async () => {
    expect(await decodeAggregate3ValueCalls(UNISWAP_CALLDATA, noopResolver)).toBeNull()
  })

  it('recursively decodes inner calls (generic and specialized)', async () => {
    const coder = AbiCoder.defaultAbiCoder()
    const approveParams = coder.encode(
      ['address', 'uint256'],
      ['0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', '100000000000000000']
    )
    const approveCalldata = '0x095ea7b3' + approveParams.slice(2)

    const calldata = buildAggregate3ValueData([
      { target: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', allowFailure: false, value: 0n, callData: approveCalldata },
      { target: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', allowFailure: false, value: 100000000000000000n, callData: UNISWAP_CALLDATA },
    ])

    const resolver = async (selector: string) => {
      if (selector === '0x095ea7b3') return ['approve(address,uint256)']
      return []
    }

    const result = await decodeAggregate3ValueCalls(calldata, resolver)
    expect(result).not.toBeNull()

    const approveInner = result!.calls[0].decodedData as any
    expect(approveInner._isNestedCall).toBe(true)
    expect(approveInner.function).toBe('approve(address,uint256)')

    const uniswapInner = result!.calls[1].decodedData as any
    expect(uniswapInner._isUniswapRouter).toBe(true)
    expect(uniswapInner.commands[0].name).toBe('WRAP_ETH')
  })

  it('leaves empty and unresolvable callData undecoded', async () => {
    const calldata = buildAggregate3ValueData([
      { target: '0x1111111111111111111111111111111111111111', allowFailure: false, value: 1000000000000000000n, callData: '0x' },
      { target: '0x2222222222222222222222222222222222222222', allowFailure: false, value: 0n, callData: '0xdeadbeef00000000000000000000000000000000000000000000000000000000' },
    ])

    const result = await decodeAggregate3ValueCalls(calldata, noopResolver)
    expect(result).not.toBeNull()
    expect(result!.calls[0].decodedData).toBeUndefined()
    expect(result!.calls[1].decodedData).toBeUndefined()
  })
})

describe('decodeNestedCalldata with aggregate3Value', () => {
  const noopResolver = async () => [] as string[]

  it('routes aggregate3Value calldata to the specialized decoder', async () => {
    const calldata = buildAggregate3ValueData([
      { target: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', allowFailure: false, value: 100000000000000000n, callData: UNISWAP_CALLDATA },
    ])

    const result = await decodeNestedCalldata(calldata, noopResolver)

    expect(typeof result).toBe('object')
    expect((result as any)._isAggregate3Value).toBe(true)
    expect((result as any).calls[0].decodedData._isUniswapRouter).toBe(true)
  })

  it('decodes aggregate3Value found inside multi-send transactions', async () => {
    const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11'
    const aggregateCalldata = buildAggregate3ValueData([
      { target: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', allowFailure: true, value: 0n, callData: UNISWAP_CALLDATA },
    ])
    const packed = buildMultiSendData([
      { operation: 0, to: MULTICALL3, value: 0n, data: aggregateCalldata },
    ])

    const result = await decodeNestedCalldata(packed, noopResolver, { decodeMultiSend: true })

    expect((result as any)._isMultiSend).toBe(true)
    const inner = (result as any).transactions[0].decodedData
    expect(inner._isAggregate3Value).toBe(true)
    expect(inner.calls[0].allowFailure).toBe(true)
    expect(inner.calls[0].decodedData._isUniswapRouter).toBe(true)
  })

  it('falls back to the raw string for corrupt aggregate3Value calldata', async () => {
    const corrupt = '0x174dea71' + 'ff'.repeat(32)

    const result = await decodeNestedCalldata(corrupt, noopResolver)

    expect(result).toBe(corrupt)
  })

  it('decodes a real-world nested Safe flow: aggregate3Value → execTransaction → aggregate3Value', async () => {
    const resolver = async (selector: string) => {
      const known: Record<string, string[]> = {
        '0x6a761202': ['execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)'],
        '0xd4d9bdcd': ['approveHash(bytes32)'],
        '0xb1070957': ['setImplementation(uint32,address,bytes)'],
      }
      return known[selector] ?? []
    }
    const options = {
      decodeMultiSend: true,
      decodableParams: {
        'execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)': [2],
      },
    }

    const result = await decodeNestedCalldata(NESTED_SAFE_AGGREGATE3_VALUE_CALLDATA, resolver, options)

    expect((result as any)._isAggregate3Value).toBe(true)
    const calls = (result as any).calls
    expect(calls).toHaveLength(2)

    // Call 0: Safe execTransaction delegatecalling Multicall3, which wraps an
    // approveHash on the second Safe.
    // The bare 4byte signature carries no parameter names, so the Safe `data`
    // field decodes as param2 and `signatures` as param9.
    const exec0 = calls[0].decodedData
    expect(exec0._isNestedCall).toBe(true)
    expect(exec0.selector).toBe('0x6a761202')
    const innerAggregate0 = exec0.parameters.param2
    expect(innerAggregate0._isAggregate3Value).toBe(true)
    expect(innerAggregate0.calls).toHaveLength(1)
    expect(innerAggregate0.calls[0].decodedData.function).toBe('approveHash(bytes32)')

    // The signatures parameter (index 9) must stay raw per decodableParams.
    expect(typeof exec0.parameters.param9).toBe('string')

    // Call 1: second Safe executes the actual setImplementation call, again
    // through a nested aggregate3Value.
    const exec1 = calls[1].decodedData
    expect(exec1._isNestedCall).toBe(true)
    const innerAggregate1 = exec1.parameters.param2
    expect(innerAggregate1._isAggregate3Value).toBe(true)
    expect(innerAggregate1.calls[0].decodedData.function).toBe('setImplementation(uint32,address,bytes)')
  })
})
