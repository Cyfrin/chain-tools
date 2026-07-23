/*
 * Chain Tools - Ethereum utilities for developers
 * Copyright (C) 2025
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { AbiCoder } from 'ethers'
import type { DecodedNestedResult } from './nested-decoder'

// ArbSys precompile on Arbitrum chains: sendTxToL1 posts an L2 → L1 message.
export const ARB_SYS_ADDRESS = '0x0000000000000000000000000000000000000064'

// Sentinel constant in the L1ArbitrumTimelock. An operation whose target is
// this address is never called; its payload is instead ABI-decoded as
// (inbox, l2Target, value, gasLimit, maxFeePerGas, data) and turned into a
// retryable ticket that executes back on L2.
export const RETRYABLE_TICKET_MAGIC = '0xa723C008e76E379c55599D2E4d93879BeaFDa79C'

const SEND_TX_TO_L1_SELECTOR = '0x928c169a' // sendTxToL1(address,bytes)
const SCHEDULE_SELECTOR = '0x01d5062a' // schedule(address,uint256,bytes,bytes32,bytes32,uint256)
const SCHEDULE_BATCH_SELECTOR = '0x8f2a0bb0' // scheduleBatch(address[],uint256[],bytes[],bytes32,bytes32,uint256)
const EXECUTE_SELECTOR = '0x1cff79cd' // execute(address,bytes) — UpgradeExecutor delegatecall
const EXECUTE_CALL_SELECTOR = '0xbca8c7b5' // executeCall(address,bytes) — UpgradeExecutor call

// Layers strip at least a selector per step, so recursion always terminates;
// the cap just bounds pathological hand-crafted inputs.
const MAX_DEPTH = 8

const ZERO_BYTES32 = '0x' + '0'.repeat(64)

// Canonical Arbitrum DAO governance contracts, keyed by lowercase address.
// Matching any of these counts as evidence that calldata is an Arbitrum
// governance proposal rather than a generic OpenZeppelin timelock call.
export const ARBITRUM_KNOWN_ADDRESSES: Record<string, string> = {
  '0x0000000000000000000000000000000000000064': 'ArbSys precompile',
  '0xa723c008e76e379c55599d2e4d93879beafda79c': 'RETRYABLE_TICKET_MAGIC',
  '0x34d45e99f7d8c45ed05b5ca72d54bbd1fb3f98f0': 'Arbitrum DAO L2 Core Timelock',
  '0xe6841d92b0c345144506576ec13ecf5103ac7f49': 'Arbitrum DAO L1 Timelock',
  '0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f': 'Arbitrum One Delayed Inbox',
  '0xc4448b71118c9071bcb9734a0eac55d18a153949': 'Arbitrum Nova Delayed Inbox',
  '0xcf57572261c7c2bcf21ffd220ea7d1a27d40a827': 'Arbitrum One UpgradeExecutor',
  '0x86a02dd71363c440b21f4c0e5b2ad01ffe1a7482': 'Arbitrum Nova UpgradeExecutor',
  '0x3fffbadaf827559da092217e474760e2b2c3cedd': 'Arbitrum L1 UpgradeExecutor',
  '0x912ce59144191c1204e64559fe8253a0e49e6548': 'ARB token',
  '0xf07ded9dc292157749b6fd268e37df6ea38395b9': 'Arbitrum Core Governor',
  '0x789fc99093b09ad01c34dc7251d0c89ce743e5a4': 'Arbitrum Treasury Governor',
  '0xbfc1feca8b09a5c5d3effe7429ebe24b9c09ef58': 'Arbitrum DAO L2 Treasury Timelock',
  '0xf3fc178157fb3c87548baa86f9d24ba38e649b58': 'Arbitrum DAO Treasury',
  '0x423552c0f05baccac5bfa91c6dcf1dc53a0a1641': 'Security Council (Emergency, Arbitrum One)',
  '0xadd68bcb0f66878ab9d37a447c7b9067c5dfa941': 'Security Council (Non-Emergency, Arbitrum One)',
  '0xf06e95ef589d9c38af242a8aaee8375f14023f85': 'Security Council (Emergency, Ethereum L1)',
  '0xc232ee726e3c51b86778bb4dbe61c52cc07a60f3': 'Security Council (Emergency, Arbitrum Nova)',
  '0x1d62ffeb72e4c360ccbbacf7c965153b00260417': 'Arbitrum DAO Constitution',
}

export function labelArbitrumAddress(address: string): string | undefined {
  return ARBITRUM_KNOWN_ADDRESSES[address.toLowerCase()]
}

export interface ArbitrumRawCall {
  kind: 'raw'
  calldata: string
  // Filled in by decodeArbitrumRawLeaves with the generic nested-decoder
  // result for calldata the Arbitrum layers don't recognize.
  decoded?: DecodedNestedResult
}

export interface ArbitrumSendTxToL1Call {
  kind: 'sendTxToL1'
  destination: string
  destinationLabel?: string
  data: ArbitrumDecodedData
}

export interface ArbitrumUpgradeExecutorCall {
  kind: 'upgradeExecutor'
  // execute() delegatecalls into an "action" contract; executeCall() is a
  // regular call to the target.
  method: 'execute' | 'executeCall'
  target: string
  targetLabel?: string
  data: ArbitrumDecodedData
}

export interface ArbitrumRetryableTicket {
  inbox: string
  inboxLabel?: string
  l2Target: string
  l2TargetLabel?: string
  value: string
  gasLimit: string
  maxFeePerGas: string
  data: ArbitrumDecodedData
}

export interface ArbitrumTimelockOperation {
  target: string
  targetLabel?: string
  value: string
  payload: string
  // Set when target is RETRYABLE_TICKET_MAGIC and the payload decodes as a
  // retryable ticket instruction.
  retryableTicket?: ArbitrumRetryableTicket
  // Set for every other non-empty payload.
  decoded?: ArbitrumDecodedData
}

export interface ArbitrumTimelockSchedule {
  kind: 'timelockSchedule'
  batch: boolean
  operations: ArbitrumTimelockOperation[]
  predecessor: string
  salt: string
  delay: string
}

export type ArbitrumDecodedData =
  | ArbitrumTimelockSchedule
  | ArbitrumSendTxToL1Call
  | ArbitrumUpgradeExecutorCall
  | ArbitrumRawCall

export interface ArbitrumGovernanceDecodeResult {
  _isArbitrumGovernance: true
  root: ArbitrumDecodedData
}

function coder() {
  return AbiCoder.defaultAbiCoder()
}

function decodeRetryableTicket(payload: string, depth: number): ArbitrumRetryableTicket | null {
  try {
    const [inbox, l2Target, value, gasLimit, maxFeePerGas, data] = coder().decode(
      ['address', 'address', 'uint256', 'uint256', 'uint256', 'bytes'],
      payload
    )
    return {
      inbox,
      inboxLabel: labelArbitrumAddress(inbox),
      l2Target,
      l2TargetLabel: labelArbitrumAddress(l2Target),
      value: value.toString(),
      gasLimit: gasLimit.toString(),
      maxFeePerGas: maxFeePerGas.toString(),
      data: decodeCalldataNode(data, depth + 1),
    }
  } catch {
    return null
  }
}

function buildTimelockOperation(
  target: string,
  value: bigint,
  payload: string,
  depth: number
): ArbitrumTimelockOperation {
  const operation: ArbitrumTimelockOperation = {
    target,
    targetLabel: labelArbitrumAddress(target),
    value: value.toString(),
    payload,
  }

  if (target.toLowerCase() === RETRYABLE_TICKET_MAGIC.toLowerCase()) {
    const ticket = decodeRetryableTicket(payload, depth)
    if (ticket) {
      operation.retryableTicket = ticket
      return operation
    }
  }

  if (payload.length > 10) {
    operation.decoded = decodeCalldataNode(payload, depth + 1)
  }
  return operation
}

function decodeScheduleNode(args: string, depth: number): ArbitrumTimelockSchedule {
  const [target, value, payload, predecessor, salt, delay] = coder().decode(
    ['address', 'uint256', 'bytes', 'bytes32', 'bytes32', 'uint256'],
    args
  )
  return {
    kind: 'timelockSchedule',
    batch: false,
    operations: [buildTimelockOperation(target, value, payload, depth)],
    predecessor,
    salt,
    delay: delay.toString(),
  }
}

function decodeScheduleBatchNode(args: string, depth: number): ArbitrumTimelockSchedule {
  const [targets, values, payloads, predecessor, salt, delay] = coder().decode(
    ['address[]', 'uint256[]', 'bytes[]', 'bytes32', 'bytes32', 'uint256'],
    args
  )
  if (targets.length === 0 || targets.length !== values.length || targets.length !== payloads.length) {
    throw new Error('scheduleBatch arrays are empty or of mismatched lengths')
  }
  const operations: ArbitrumTimelockOperation[] = []
  for (let i = 0; i < targets.length; i++) {
    operations.push(buildTimelockOperation(targets[i], values[i], payloads[i], depth))
  }
  return {
    kind: 'timelockSchedule',
    batch: true,
    operations,
    predecessor,
    salt,
    delay: delay.toString(),
  }
}

function decodeSendTxToL1Node(args: string, depth: number): ArbitrumSendTxToL1Call {
  const [destination, data] = coder().decode(['address', 'bytes'], args)
  return {
    kind: 'sendTxToL1',
    destination,
    destinationLabel: labelArbitrumAddress(destination),
    data: decodeCalldataNode(data, depth + 1),
  }
}

function decodeUpgradeExecutorNode(
  selector: string,
  args: string,
  depth: number
): ArbitrumUpgradeExecutorCall {
  const [target, data] = coder().decode(['address', 'bytes'], args)
  return {
    kind: 'upgradeExecutor',
    method: selector === EXECUTE_SELECTOR ? 'execute' : 'executeCall',
    target,
    targetLabel: labelArbitrumAddress(target),
    data: decodeCalldataNode(data, depth + 1),
  }
}

function decodeCalldataNode(data: string, depth: number): ArbitrumDecodedData {
  if (depth > MAX_DEPTH || data.length < 10) {
    return { kind: 'raw', calldata: data }
  }
  const selector = data.substring(0, 10).toLowerCase()
  const args = '0x' + data.substring(10)
  try {
    if (selector === SEND_TX_TO_L1_SELECTOR) return decodeSendTxToL1Node(args, depth)
    if (selector === SCHEDULE_SELECTOR) return decodeScheduleNode(args, depth)
    if (selector === SCHEDULE_BATCH_SELECTOR) return decodeScheduleBatchNode(args, depth)
    if (selector === EXECUTE_SELECTOR || selector === EXECUTE_CALL_SELECTOR) {
      return decodeUpgradeExecutorNode(selector, args, depth)
    }
  } catch {
    // Structurally invalid for the recognized selector: fall through to raw so
    // the generic 4byte path can still take a shot at it.
  }
  return { kind: 'raw', calldata: data }
}

/**
 * True when the decoded tree contains something distinctly Arbitrum: an ArbSys
 * L2 → L1 message, a retryable-ticket sentinel operation, or a known Arbitrum
 * governance address. schedule/scheduleBatch alone is just an OpenZeppelin
 * TimelockController call that any protocol might make.
 */
function hasArbitrumEvidence(node: ArbitrumDecodedData): boolean {
  switch (node.kind) {
    case 'raw':
      return false
    case 'sendTxToL1':
      return true
    case 'upgradeExecutor':
      return node.targetLabel !== undefined || hasArbitrumEvidence(node.data)
    case 'timelockSchedule':
      return node.operations.some(
        (op) =>
          op.retryableTicket !== undefined ||
          op.targetLabel !== undefined ||
          (op.decoded !== undefined && hasArbitrumEvidence(op.decoded))
      )
  }
}

/**
 * Decode calldata as an Arbitrum governance proposal (the L2 timelock →
 * ArbSys.sendTxToL1 → L1 timelock → retryable ticket → UpgradeExecutor round
 * trip, entered at any layer). Returns null when the data doesn't decode as
 * one of those layers or carries no Arbitrum-specific evidence, so generic
 * timelock calldata falls through to signature-based decoding.
 */
export function decodeArbitrumGovernanceData(data: string): ArbitrumGovernanceDecodeResult | null {
  if (typeof data !== 'string') return null
  let hex = data.trim()
  if (!hex.startsWith('0x')) hex = '0x' + hex
  if (hex.length < 10) return null

  const root = decodeCalldataNode(hex, 0)
  if (root.kind === 'raw') return null
  if (!hasArbitrumEvidence(root)) return null
  return { _isArbitrumGovernance: true, root }
}

export type ArbitrumLeafDecoder = (calldata: string) => Promise<DecodedNestedResult>

async function decodeLeaves(node: ArbitrumDecodedData, decodeLeaf: ArbitrumLeafDecoder): Promise<void> {
  switch (node.kind) {
    case 'raw': {
      if (node.calldata.length > 10) {
        try {
          const decoded = await decodeLeaf(node.calldata)
          if (decoded !== node.calldata) {
            node.decoded = decoded
          }
        } catch {
          // A failed lookup just leaves the raw calldata in place.
        }
      }
      return
    }
    case 'sendTxToL1':
    case 'upgradeExecutor':
      return decodeLeaves(node.data, decodeLeaf)
    case 'timelockSchedule':
      for (const op of node.operations) {
        if (op.retryableTicket) {
          await decodeLeaves(op.retryableTicket.data, decodeLeaf)
        } else if (op.decoded) {
          await decodeLeaves(op.decoded, decodeLeaf)
        }
      }
  }
}

/**
 * Run the generic nested decoder over every raw calldata leaf in a decoded
 * proposal (e.g. the innermost token call), attaching results in place. Passed
 * as a callback to avoid a runtime dependency cycle with nested-decoder.
 */
export async function decodeArbitrumRawLeaves(
  result: ArbitrumGovernanceDecodeResult,
  decodeLeaf: ArbitrumLeafDecoder
): Promise<void> {
  await decodeLeaves(result.root, decodeLeaf)
}

/** Render seconds as a rough human duration, e.g. 259200 → "3 days". */
export function formatDurationSeconds(seconds: string): string {
  let remaining = BigInt(seconds)
  if (remaining === 0n) return '0 seconds'
  const units: [bigint, string][] = [
    [86400n, 'day'],
    [3600n, 'hour'],
    [60n, 'minute'],
    [1n, 'second'],
  ]
  const parts: string[] = []
  for (const [size, name] of units) {
    const count = remaining / size
    if (count > 0n) {
      parts.push(`${count} ${name}${count === 1n ? '' : 's'}`)
      remaining -= count * size
    }
    if (parts.length === 2) break
  }
  return parts.join(' ')
}

export interface ArbitrumFormatOptions {
  indent?: number
  includeRaw?: boolean
  // Renders a raw leaf's generic decode (NestedCall, multi-send, …) so the
  // caller controls how non-Arbitrum layers appear.
  formatLeaf?: (decoded: DecodedNestedResult, indent: number) => Promise<string> | string
}

function labeled(address: string, label: string | undefined): string {
  return label ? `${address} (${label})` : address
}

function formatBytes32(value: string): string {
  return value === ZERO_BYTES32 ? `${value} (none)` : value
}

async function formatNode(
  node: ArbitrumDecodedData,
  indent: number,
  options: ArbitrumFormatOptions
): Promise<string> {
  const sp = '  '.repeat(indent)
  switch (node.kind) {
    case 'raw': {
      if (node.decoded !== undefined && options.formatLeaf) {
        return await options.formatLeaf(node.decoded, indent)
      }
      return `${sp}Calldata: ${node.calldata}\n`
    }
    case 'sendTxToL1': {
      let out = `${sp}L2 → L1 message: ArbSys.sendTxToL1\n`
      out += `${sp}  (executable on L1 after the ~1 week challenge period)\n`
      out += `${sp}  L1 Destination: ${labeled(node.destination, node.destinationLabel)}\n`
      out += `${sp}  L1 Call:\n`
      out += await formatNode(node.data, indent + 2, options)
      return out
    }
    case 'upgradeExecutor': {
      const how = node.method === 'execute' ? 'delegatecall' : 'call'
      let out = `${sp}UpgradeExecutor.${node.method} (${how})\n`
      out += `${sp}  Target: ${labeled(node.target, node.targetLabel)}\n`
      out += `${sp}  Call:\n`
      out += await formatNode(node.data, indent + 2, options)
      return out
    }
    case 'timelockSchedule':
      return formatTimelockSchedule(node, indent, options)
  }
}

async function formatTimelockOperation(
  op: ArbitrumTimelockOperation,
  index: number,
  indent: number,
  options: ArbitrumFormatOptions
): Promise<string> {
  const sp = '  '.repeat(indent)
  let out = `${sp}[${index}] Target: ${labeled(op.target, op.targetLabel)}\n`
  if (op.target.toLowerCase() === RETRYABLE_TICKET_MAGIC.toLowerCase()) {
    out += `${sp}    (sentinel, not a contract — tells the L1 timelock to create a retryable ticket)\n`
  }
  out += `${sp}    Value: ${op.value}\n`
  if (options.includeRaw) {
    out += `${sp}    Raw Payload: ${op.payload}\n`
  }

  if (op.retryableTicket) {
    const ticket = op.retryableTicket
    out += `${sp}    Retryable ticket → L2:\n`
    out += `${sp}      Inbox: ${labeled(ticket.inbox, ticket.inboxLabel)}\n`
    out += `${sp}      L2 Target: ${labeled(ticket.l2Target, ticket.l2TargetLabel)}\n`
    out += `${sp}      Value: ${ticket.value}\n`
    out += `${sp}      Gas Limit: ${ticket.gasLimit}\n`
    out += `${sp}      Max Fee Per Gas: ${ticket.maxFeePerGas}\n`
    if (ticket.gasLimit === '0' || ticket.maxFeePerGas === '0') {
      out += `${sp}      (zero gas params — the ticket must be redeemed manually on L2)\n`
    }
    out += `${sp}      L2 Call:\n`
    out += await formatNode(ticket.data, indent + 4, options)
  } else if (op.decoded) {
    out += await formatNode(op.decoded, indent + 2, options)
  } else {
    out += `${sp}    Payload: ${op.payload}\n`
  }
  return out
}

async function formatTimelockSchedule(
  node: ArbitrumTimelockSchedule,
  indent: number,
  options: ArbitrumFormatOptions
): Promise<string> {
  const sp = '  '.repeat(indent)
  const fn = node.batch ? 'scheduleBatch' : 'schedule'
  let out = `${sp}Timelock ${fn}\n`
  out += `${sp}  Delay: ${node.delay} seconds (${formatDurationSeconds(node.delay)})\n`
  out += `${sp}  Predecessor: ${formatBytes32(node.predecessor)}\n`
  out += `${sp}  Salt: ${formatBytes32(node.salt)}\n`
  out += `${sp}  Operations (${node.operations.length}):\n`
  for (let i = 0; i < node.operations.length; i++) {
    out += await formatTimelockOperation(node.operations[i], i, indent + 1, options)
  }
  return out
}

/**
 * Render a decoded Arbitrum governance proposal as indented text, mirroring
 * the layout of the other specialized decoders in the ABI tool.
 */
export async function formatArbitrumGovernanceResult(
  result: ArbitrumGovernanceDecodeResult,
  options: ArbitrumFormatOptions = {}
): Promise<string> {
  const indent = options.indent ?? 0
  const sp = '  '.repeat(indent)
  let out = `${sp}Arbitrum Governance Proposal\n`
  out += await formatNode(result.root, indent, options)
  return out
}
