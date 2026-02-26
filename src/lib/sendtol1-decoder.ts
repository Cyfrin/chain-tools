/*
 * Chain Tools - Ethereum utilities for developers
 * Copyright (C) 2025
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { Interface } from 'ethers'

// zkSync's L1Messenger precompile address
export const ZKSYNC_L1_MESSENGER_ADDRESS = '0x0000000000000000000000000000000000008008'

// sendToL1(bytes) selector
const SEND_TO_L1_SELECTOR = '0x62f84b24'

// execute selector used in L1 messages
const EXECUTE_SELECTOR = '0xa1dcb9b8'

// ABI for sendToL1 function
const SEND_TO_L1_ABI = ['function sendToL1(bytes message)']

export interface L1Operation {
  target: string
  value: string
  calldata: string
}

export interface SendToL1DecodeResult {
  _isSendToL1: true
  operations: L1Operation[]
  executor: string
  salt: string
}

/**
 * Check if calldata is a sendToL1 transaction
 */
export function isSendToL1Data(data: string): boolean {
  if (!data || data.length < 10) return false
  const selector = data.substring(0, 10).toLowerCase()
  return selector === SEND_TO_L1_SELECTOR
}

/**
 * Decode sendToL1 calldata from zkSync
 *
 * The structure is:
 * - sendToL1(bytes) - outer call
 * - The bytes parameter contains an execute call with:
 *   - operations: (address,uint256,bytes)[] - array of L1 calls
 *   - executor: address
 *   - salt: bytes32
 */
export function decodeSendToL1Data(transactionData: string): SendToL1DecodeResult | null {
  if (!transactionData || transactionData.length < 10) {
    return null
  }

  const selector = transactionData.substring(0, 10).toLowerCase()
  if (selector !== SEND_TO_L1_SELECTOR) {
    return null
  }

  try {
    // Decode sendToL1(bytes) using Interface
    const sendToL1Interface = new Interface(SEND_TO_L1_ABI)
    const sendToL1Parsed = sendToL1Interface.parseTransaction({ data: transactionData })

    if (!sendToL1Parsed) {
      return null
    }

    const l1MessageBytes = sendToL1Parsed.args[0] as string

    // The L1 message is the data for execute(((address,uint256,bytes)[],address,bytes32))
    // We need to add the execute selector to decode it properly
    const l1DataWithSelector = EXECUTE_SELECTOR + l1MessageBytes.substring(2)

    // Create interface for the execute function
    const executeInterface = new Interface([
      'function execute((address,uint256,bytes)[] operations, address executor, bytes32 salt)'
    ])

    const parsed = executeInterface.parseTransaction({ data: l1DataWithSelector })

    if (!parsed) {
      return null
    }

    const [operations, executor, salt] = parsed.args

    // Convert operations to our format
    const formattedOperations: L1Operation[] = (operations as any[]).map((op: any) => ({
      target: op[0] as string,
      value: op[1].toString(),
      calldata: op[2] as string,
    }))

    return {
      _isSendToL1: true,
      operations: formattedOperations,
      executor: executor as string,
      salt: salt as string,
    }
  } catch (e) {
    console.error('Failed to decode sendToL1 data:', e)
    return null
  }
}
