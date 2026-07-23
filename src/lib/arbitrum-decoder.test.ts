import { describe, it, expect } from 'vitest'
import { AbiCoder } from 'ethers'
import {
  ARB_SYS_ADDRESS,
  RETRYABLE_TICKET_MAGIC,
  decodeArbitrumGovernanceData,
  decodeArbitrumRawLeaves,
  formatArbitrumGovernanceResult,
  formatDurationSeconds,
  labelArbitrumAddress,
  type ArbitrumSendTxToL1Call,
  type ArbitrumTimelockSchedule,
  type ArbitrumUpgradeExecutorCall,
} from '@/lib/arbitrum-decoder'
import { decodeNestedCalldata } from '@/lib/nested-decoder'

const coder = AbiCoder.defaultAbiCoder()

const L1_TIMELOCK = '0xE6841D92B0C345144506576eC13ECf5103aC7f49'
const ARB_ONE_INBOX = '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f'
const ARB_ONE_UPGRADE_EXECUTOR = '0xCF57572261c7c2BCF21ffD220ea7d1a27D40A827'
const ARB_TOKEN = '0x912CE59144191C1204E64559FE8253a0e49E6548'

const SEND_TX_TO_L1_SELECTOR = '0x928c169a'
const SCHEDULE_SELECTOR = '0x01d5062a'
const SCHEDULE_BATCH_SELECTOR = '0x8f2a0bb0'
const EXECUTE_SELECTOR = '0x1cff79cd'
const EXECUTE_CALL_SELECTOR = '0xbca8c7b5'

// Real Arbitrum DAO proposal calldata: L2 Core Timelock schedule() targeting
// ArbSys.sendTxToL1 → L1 Timelock scheduleBatch → RETRYABLE_TICKET_MAGIC →
// retryable ticket → Arbitrum One UpgradeExecutor.executeCall → ARB token.
const FULL_PROPOSAL_CALLDATA =
  '0x01d5062a0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a8c0000000000000000000000000000000000000000000000000000000000000003c4928c169a000000000000000000000000e6841d92b0c345144506576ec13ecf5103ac7f49000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000003448f2a0bb000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000000002057286e2d5bc0d7aece5ed0e126215650d99f18f6deeb6e23c97ad06dae48e000000000000000000000000000000000000000000000000000000000003f4800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000a723c008e76e379c55599d2e4d93879beafda79c000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000004dbd4fc535ac27206064b68ffcf827b0a60bab3f000000000000000000000000cf57572261c7c2bcf21ffd220ea7d1a27d40a82700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000a4bca8c7b5000000000000000000000000912ce59144191c1204e64559fe8253a0e49e654800000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000024ec20b526ffffffffffffffffffffffffffffffffffffffffffd5ad352eec3ec51bda416e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

const INNERMOST_ARB_TOKEN_CALLDATA =
  '0xec20b526ffffffffffffffffffffffffffffffffffffffffffd5ad352eec3ec51bda416e'

function encodeSchedule(target: string, value: bigint, payload: string, delay: bigint): string {
  const args = coder.encode(
    ['address', 'uint256', 'bytes', 'bytes32', 'bytes32', 'uint256'],
    [target, value, payload, '0x' + '0'.repeat(64), '0x' + '0'.repeat(64), delay]
  )
  return SCHEDULE_SELECTOR + args.slice(2)
}

function encodeScheduleBatch(targets: string[], values: bigint[], payloads: string[]): string {
  const args = coder.encode(
    ['address[]', 'uint256[]', 'bytes[]', 'bytes32', 'bytes32', 'uint256'],
    [targets, values, payloads, '0x' + '0'.repeat(64), '0x' + '0'.repeat(64), 259200n]
  )
  return SCHEDULE_BATCH_SELECTOR + args.slice(2)
}

function encodeSendTxToL1(destination: string, data: string): string {
  return SEND_TX_TO_L1_SELECTOR + coder.encode(['address', 'bytes'], [destination, data]).slice(2)
}

function encodeRetryablePayload(inbox: string, l2Target: string, data: string): string {
  return coder.encode(
    ['address', 'address', 'uint256', 'uint256', 'uint256', 'bytes'],
    [inbox, l2Target, 0n, 0n, 0n, data]
  )
}

describe('decodeArbitrumGovernanceData', () => {
  it('decodes the full L2 → L1 → L2 round trip of a real proposal', () => {
    const result = decodeArbitrumGovernanceData(FULL_PROPOSAL_CALLDATA)
    expect(result).not.toBeNull()
    expect(result!._isArbitrumGovernance).toBe(true)

    // Layer 1: L2 timelock schedule targeting ArbSys with an 8-day delay
    const l2Schedule = result!.root as ArbitrumTimelockSchedule
    expect(l2Schedule.kind).toBe('timelockSchedule')
    expect(l2Schedule.batch).toBe(false)
    expect(l2Schedule.delay).toBe('691200')
    expect(l2Schedule.operations).toHaveLength(1)
    expect(l2Schedule.operations[0].target).toBe(ARB_SYS_ADDRESS)
    expect(l2Schedule.operations[0].targetLabel).toBe('ArbSys precompile')

    // Layer 2: ArbSys.sendTxToL1 to the L1 timelock
    const sendTx = l2Schedule.operations[0].decoded as ArbitrumSendTxToL1Call
    expect(sendTx.kind).toBe('sendTxToL1')
    expect(sendTx.destination).toBe(L1_TIMELOCK)
    expect(sendTx.destinationLabel).toBe('Arbitrum DAO L1 Timelock')

    // Layer 3: L1 timelock scheduleBatch with a 3-day delay and the magic target
    const l1Schedule = sendTx.data as ArbitrumTimelockSchedule
    expect(l1Schedule.kind).toBe('timelockSchedule')
    expect(l1Schedule.batch).toBe(true)
    expect(l1Schedule.delay).toBe('259200')
    expect(l1Schedule.salt).toBe('0x02057286e2d5bc0d7aece5ed0e126215650d99f18f6deeb6e23c97ad06dae48e')
    expect(l1Schedule.operations).toHaveLength(1)
    expect(l1Schedule.operations[0].target).toBe(RETRYABLE_TICKET_MAGIC)

    // Layer 4: the magic payload decodes as a retryable ticket, not calldata
    const ticket = l1Schedule.operations[0].retryableTicket!
    expect(ticket).toBeDefined()
    expect(ticket.inbox).toBe(ARB_ONE_INBOX)
    expect(ticket.inboxLabel).toBe('Arbitrum One Delayed Inbox')
    expect(ticket.l2Target).toBe(ARB_ONE_UPGRADE_EXECUTOR)
    expect(ticket.l2TargetLabel).toBe('Arbitrum One UpgradeExecutor')
    expect(ticket.value).toBe('0')
    expect(ticket.gasLimit).toBe('0')
    expect(ticket.maxFeePerGas).toBe('0')

    // Layer 5: UpgradeExecutor.executeCall (regular call) on the ARB token
    const executor = ticket.data as ArbitrumUpgradeExecutorCall
    expect(executor.kind).toBe('upgradeExecutor')
    expect(executor.method).toBe('executeCall')
    expect(executor.target).toBe(ARB_TOKEN)
    expect(executor.targetLabel).toBe('ARB token')

    // Layer 6: the innermost token call stays a raw leaf
    expect(executor.data.kind).toBe('raw')
    expect((executor.data as any).calldata).toBe(INNERMOST_ARB_TOKEN_CALLDATA)
  })

  it('accepts the proposal calldata without a 0x prefix', () => {
    const result = decodeArbitrumGovernanceData(FULL_PROPOSAL_CALLDATA.slice(2))
    expect(result).not.toBeNull()
    expect(result!.root.kind).toBe('timelockSchedule')
  })

  it('produces a JSON-serializable result (no BigInt values)', () => {
    const result = decodeArbitrumGovernanceData(FULL_PROPOSAL_CALLDATA)
    expect(() => JSON.stringify(result)).not.toThrow()
  })

  it('decodes a bare sendTxToL1 message', () => {
    const inner = encodeScheduleBatch(
      [RETRYABLE_TICKET_MAGIC],
      [0n],
      [encodeRetryablePayload(ARB_ONE_INBOX, ARB_ONE_UPGRADE_EXECUTOR, '0x')]
    )
    const result = decodeArbitrumGovernanceData(encodeSendTxToL1(L1_TIMELOCK, inner))

    expect(result).not.toBeNull()
    const root = result!.root as ArbitrumSendTxToL1Call
    expect(root.kind).toBe('sendTxToL1')
    expect(root.destination).toBe(L1_TIMELOCK)
    expect((root.data as ArbitrumTimelockSchedule).operations[0].retryableTicket).toBeDefined()
  })

  it('decodes a bare L1 scheduleBatch containing the retryable magic', () => {
    const batch = encodeScheduleBatch(
      [RETRYABLE_TICKET_MAGIC],
      [0n],
      [encodeRetryablePayload(ARB_ONE_INBOX, ARB_ONE_UPGRADE_EXECUTOR, '0x12345678')]
    )
    const result = decodeArbitrumGovernanceData(batch)

    expect(result).not.toBeNull()
    const schedule = result!.root as ArbitrumTimelockSchedule
    expect(schedule.batch).toBe(true)
    expect(schedule.operations[0].retryableTicket!.data.kind).toBe('raw')
  })

  it('detects an UpgradeExecutor call against a known Arbitrum address', () => {
    const args = coder.encode(['address', 'bytes'], [ARB_TOKEN, '0x12345678'])
    const result = decodeArbitrumGovernanceData(EXECUTE_SELECTOR + args.slice(2))

    expect(result).not.toBeNull()
    const executor = result!.root as ArbitrumUpgradeExecutorCall
    expect(executor.method).toBe('execute')
    expect(executor.targetLabel).toBe('ARB token')
  })

  it('rejects a generic OZ timelock schedule with no Arbitrum markers', () => {
    const generic = encodeSchedule('0x1111111111111111111111111111111111111111', 0n, '0x12345678', 86400n)
    expect(decodeArbitrumGovernanceData(generic)).toBeNull()
  })

  it('rejects an UpgradeExecutor-shaped call against an unknown address', () => {
    const args = coder.encode(['address', 'bytes'], ['0x2222222222222222222222222222222222222222', '0x12345678'])
    expect(decodeArbitrumGovernanceData(EXECUTE_CALL_SELECTOR + args.slice(2))).toBeNull()
  })

  it('rejects unknown selectors, garbage, and short input', () => {
    expect(decodeArbitrumGovernanceData('0xdeadbeef' + '00'.repeat(32))).toBeNull()
    expect(decodeArbitrumGovernanceData(SCHEDULE_SELECTOR + 'deadbeef')).toBeNull()
    expect(decodeArbitrumGovernanceData('')).toBeNull()
    expect(decodeArbitrumGovernanceData('0x')).toBeNull()
    expect(decodeArbitrumGovernanceData('not hex at all')).toBeNull()
  })

  it('rejects a scheduleBatch with mismatched array lengths', () => {
    // Hand-encode: 1 target (the magic address, so evidence would exist) but 2 values.
    const args = coder.encode(
      ['address[]', 'uint256[]', 'bytes[]', 'bytes32', 'bytes32', 'uint256'],
      [[RETRYABLE_TICKET_MAGIC], [0n, 1n], ['0x'], '0x' + '0'.repeat(64), '0x' + '0'.repeat(64), 0n]
    )
    expect(decodeArbitrumGovernanceData(SCHEDULE_BATCH_SELECTOR + args.slice(2))).toBeNull()
  })

  it('keeps a malformed magic payload as an undecoded operation', () => {
    // Target is the magic sentinel but the payload is not a retryable tuple.
    const batch = encodeScheduleBatch([RETRYABLE_TICKET_MAGIC], [0n], ['0x1234'])
    const result = decodeArbitrumGovernanceData(batch)

    expect(result).not.toBeNull()
    const op = (result!.root as ArbitrumTimelockSchedule).operations[0]
    expect(op.retryableTicket).toBeUndefined()
    expect(op.decoded).toBeUndefined()
    expect(op.payload).toBe('0x1234')
  })

  it('handles an empty operation payload (plain value transfer)', () => {
    const schedule = encodeSchedule(ARB_SYS_ADDRESS, 1000n, '0x', 86400n)
    const result = decodeArbitrumGovernanceData(schedule)

    expect(result).not.toBeNull()
    const op = (result!.root as ArbitrumTimelockSchedule).operations[0]
    expect(op.value).toBe('1000')
    expect(op.decoded).toBeUndefined()
    expect(op.retryableTicket).toBeUndefined()
  })
})

describe('decodeArbitrumRawLeaves', () => {
  it('runs the leaf decoder on the innermost raw calldata', async () => {
    const result = decodeArbitrumGovernanceData(FULL_PROPOSAL_CALLDATA)!
    const seen: string[] = []
    await decodeArbitrumRawLeaves(result, async (calldata) => {
      seen.push(calldata)
      return { _isNestedCall: true, function: 'stub()', selector: calldata.slice(0, 10), parameters: {}, raw: calldata }
    })

    expect(seen).toEqual([INNERMOST_ARB_TOKEN_CALLDATA])

    const schedule = result.root as ArbitrumTimelockSchedule
    const sendTx = schedule.operations[0].decoded as ArbitrumSendTxToL1Call
    const l1Schedule = sendTx.data as ArbitrumTimelockSchedule
    const executor = l1Schedule.operations[0].retryableTicket!.data as ArbitrumUpgradeExecutorCall
    expect((executor.data as any).decoded._isNestedCall).toBe(true)
  })

  it('leaves the raw calldata untouched when the decoder returns it unchanged or throws', async () => {
    const result = decodeArbitrumGovernanceData(FULL_PROPOSAL_CALLDATA)!
    await decodeArbitrumRawLeaves(result, async (calldata) => calldata)

    const unchanged = decodeArbitrumGovernanceData(FULL_PROPOSAL_CALLDATA)!
    await decodeArbitrumRawLeaves(unchanged, async () => { throw new Error('API down') })

    for (const r of [result, unchanged]) {
      const schedule = r.root as ArbitrumTimelockSchedule
      const sendTx = schedule.operations[0].decoded as ArbitrumSendTxToL1Call
      const l1Schedule = sendTx.data as ArbitrumTimelockSchedule
      const executor = l1Schedule.operations[0].retryableTicket!.data as ArbitrumUpgradeExecutorCall
      expect((executor.data as any).decoded).toBeUndefined()
    }
  })
})

describe('decodeNestedCalldata integration', () => {
  const noopResolver = async () => [] as string[]

  it('detects an Arbitrum proposal in nested calldata', async () => {
    const result = await decodeNestedCalldata(FULL_PROPOSAL_CALLDATA, noopResolver)

    expect(typeof result).toBe('object')
    expect((result as any)._isArbitrumGovernance).toBe(true)
  })

  it('decodes the innermost token call through the signature resolver', async () => {
    const resolver = async (selector: string) => {
      if (selector === '0xec20b526') return ['setMintBudget(int256)']
      return []
    }
    const result = (await decodeNestedCalldata(FULL_PROPOSAL_CALLDATA, resolver)) as any

    const executor = result.root.operations[0].decoded.data.operations[0].retryableTicket.data
    expect(executor.kind).toBe('upgradeExecutor')
    expect(executor.data.decoded._isNestedCall).toBe(true)
    expect(executor.data.decoded.function).toBe('setMintBudget(int256)')
  })

  it('decodes an Arbitrum proposal wrapped in a Safe execTransaction', async () => {
    const execArgs = coder.encode(
      ['address', 'uint256', 'bytes', 'uint8', 'uint256', 'uint256', 'uint256', 'address', 'address', 'bytes'],
      [
        '0x34d45e99f7D8c45ed05B5cA72D54bbD1fb3F98f0',
        0n,
        FULL_PROPOSAL_CALLDATA,
        0n,
        0n,
        0n,
        0n,
        '0x0000000000000000000000000000000000000000',
        '0x0000000000000000000000000000000000000000',
        '0x',
      ]
    )
    const execSig = 'execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)'
    const resolver = async (selector: string) => {
      if (selector === '0x6a761202') return [execSig]
      return []
    }
    const result = (await decodeNestedCalldata('0x6a761202' + execArgs.slice(2), resolver, {
      decodableParams: { [execSig]: [2] },
    })) as any

    expect(result._isNestedCall).toBe(true)
    expect(result.parameters.param2._isArbitrumGovernance).toBe(true)
  })

  it('falls back to generic decoding for a non-Arbitrum schedule call', async () => {
    const generic = encodeSchedule('0x1111111111111111111111111111111111111111', 0n, '0x12345678', 86400n)
    const scheduleSig = 'schedule(address,uint256,bytes,bytes32,bytes32,uint256)'
    const resolver = async (selector: string) => {
      if (selector === '0x01d5062a') return [scheduleSig]
      return []
    }
    const result = (await decodeNestedCalldata(generic, resolver)) as any

    expect(result._isArbitrumGovernance).toBeUndefined()
    expect(result._isNestedCall).toBe(true)
    expect(result.function).toBe(scheduleSig)
  })
})

describe('formatArbitrumGovernanceResult', () => {
  it('renders the full proposal with labels, durations, and notes', async () => {
    const result = decodeArbitrumGovernanceData(FULL_PROPOSAL_CALLDATA)!
    const text = await formatArbitrumGovernanceResult(result)

    expect(text).toContain('Arbitrum Governance Proposal')
    expect(text).toContain('Timelock schedule')
    expect(text).toContain('Delay: 691200 seconds (8 days)')
    expect(text).toContain('ArbSys precompile')
    expect(text).toContain('L2 → L1 message: ArbSys.sendTxToL1')
    expect(text).toContain('Arbitrum DAO L1 Timelock')
    expect(text).toContain('Timelock scheduleBatch')
    expect(text).toContain('Delay: 259200 seconds (3 days)')
    expect(text).toContain('sentinel, not a contract')
    expect(text).toContain('Retryable ticket → L2:')
    expect(text).toContain('Arbitrum One Delayed Inbox')
    expect(text).toContain('the ticket must be redeemed manually on L2')
    expect(text).toContain('UpgradeExecutor.executeCall (call)')
    expect(text).toContain('ARB token')
    expect(text).toContain(`Calldata: ${INNERMOST_ARB_TOKEN_CALLDATA}`)
  })

  it('uses the leaf formatter for decoded raw leaves', async () => {
    const result = decodeArbitrumGovernanceData(FULL_PROPOSAL_CALLDATA)!
    await decodeArbitrumRawLeaves(result, async (calldata) => ({
      _isNestedCall: true,
      function: 'setMintBudget(int256)',
      selector: calldata.slice(0, 10),
      parameters: {},
      raw: calldata,
    }))

    const text = await formatArbitrumGovernanceResult(result, {
      formatLeaf: (decoded) => `LEAF:${(decoded as any).function}\n`,
    })

    expect(text).toContain('LEAF:setMintBudget(int256)')
    expect(text).not.toContain(`Calldata: ${INNERMOST_ARB_TOKEN_CALLDATA}`)
  })

  it('includes raw payloads only when includeRaw is set', async () => {
    const result = decodeArbitrumGovernanceData(FULL_PROPOSAL_CALLDATA)!

    const withoutRaw = await formatArbitrumGovernanceResult(result)
    const withRaw = await formatArbitrumGovernanceResult(result, { includeRaw: true })

    expect(withoutRaw).not.toContain('Raw Payload:')
    expect(withRaw).toContain('Raw Payload:')
  })
})

describe('helpers', () => {
  it('formatDurationSeconds renders common governance delays', () => {
    expect(formatDurationSeconds('0')).toBe('0 seconds')
    expect(formatDurationSeconds('45')).toBe('45 seconds')
    expect(formatDurationSeconds('3600')).toBe('1 hour')
    expect(formatDurationSeconds('90060')).toBe('1 day 1 hour')
    expect(formatDurationSeconds('259200')).toBe('3 days')
    expect(formatDurationSeconds('691200')).toBe('8 days')
  })

  it('labelArbitrumAddress is case-insensitive and returns undefined for unknowns', () => {
    expect(labelArbitrumAddress(RETRYABLE_TICKET_MAGIC)).toBe('RETRYABLE_TICKET_MAGIC')
    expect(labelArbitrumAddress(RETRYABLE_TICKET_MAGIC.toUpperCase().replace('0X', '0x'))).toBe('RETRYABLE_TICKET_MAGIC')
    expect(labelArbitrumAddress('0x0000000000000000000000000000000000000001')).toBeUndefined()
  })
})
