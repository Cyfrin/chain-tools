/*
 * Chain Tools - Ethereum utilities for developers
 * Copyright (C) 2025
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { AbiCoder, FunctionFragment } from 'ethers'
import { isUniswapRouterData, decodeUniswapRouterData, type UniswapDecodeResult } from './uniswap-decoder'
import { isSendToL1Data, decodeSendToL1Data, type SendToL1DecodeResult } from './sendtol1-decoder'

export interface NestedCall {
  _isNestedCall: true
  function: string
  selector: string
  parameters: Record<string, any>
  raw: string
}

export interface MultiSendTransaction {
  operation: number
  to: string
  value: string
  dataLength: number
  data: string
  decodedData?: DecodedNestedResult
}

export interface MultiSendData {
  _isMultiSend: true
  transactions: MultiSendTransaction[]
}

export type DecodedNestedResult =
  | UniswapDecodeResult
  | SendToL1DecodeResult
  | NestedCall
  | MultiSendData
  | string

export type SignatureResolver = (selector: string) => Promise<string[]>

export interface DecodeOptions {
  decodeMultiSend?: boolean
  decodableParams?: Record<string, number[]>
}

/**
 * Parse Safe multi-send packed data into individual transactions.
 *
 * Format per transaction:
 * operation (1 byte) + to (20 bytes) + value (32 bytes) + dataLength (32 bytes) + data (variable)
 */
export function decodeMultiSendData(data: string): MultiSendData | null {
  try {
    let hexData = data.startsWith('0x') ? data.substring(2) : data

    const transactions: MultiSendTransaction[] = []
    let offset = 0

    while (offset < hexData.length) {
      // Need at least 85 bytes (170 hex chars) for header
      if (offset + 170 > hexData.length) break

      const operation = parseInt(hexData.substring(offset, offset + 2), 16)

      // Must be 0 (Call) or 1 (DelegateCall)
      if (operation !== 0 && operation !== 1) {
        return null
      }

      offset += 2

      const to = '0x' + hexData.substring(offset, offset + 40)
      offset += 40

      const valueHex = hexData.substring(offset, offset + 64)
      const value = BigInt('0x' + valueHex).toString()
      offset += 64

      const dataLengthHex = hexData.substring(offset, offset + 64)
      const dataLength = parseInt(dataLengthHex, 16)
      offset += 64

      const txData = dataLength > 0 ? '0x' + hexData.substring(offset, offset + dataLength * 2) : '0x'
      offset += dataLength * 2

      transactions.push({
        operation,
        to,
        value,
        dataLength,
        data: txData,
      })
    }

    if (transactions.length > 0) {
      return {
        _isMultiSend: true,
        transactions,
      }
    }

    return null
  } catch {
    return null
  }
}

export async function decodeNestedCalldata(
  value: string,
  resolveSignatures: SignatureResolver,
  options: DecodeOptions = {}
): Promise<DecodedNestedResult> {
  const { decodeMultiSend: shouldDecodeMultiSend = false, decodableParams } = options

  if (typeof value !== 'string' || !value.startsWith('0x') || value.length <= 10) {
    return value
  }

  if (isUniswapRouterData(value)) {
    const uniswapResult = decodeUniswapRouterData(value)
    if (uniswapResult) return uniswapResult
  }

  if (isSendToL1Data(value)) {
    const sendToL1Result = decodeSendToL1Data(value)
    if (sendToL1Result) return sendToL1Result
  }

  if (shouldDecodeMultiSend) {
    const multiSendResult = decodeMultiSendData(value)
    if (multiSendResult) {
      for (const tx of multiSendResult.transactions) {
        if (tx.data && tx.data !== '0x' && tx.data.length > 10) {
          const decoded = await decodeNestedCalldata(tx.data, resolveSignatures, options)
          if (decoded !== tx.data) {
            tx.decodedData = decoded
          }
        }
      }
      return multiSendResult
    }
  }

  const selector = value.substring(0, 10)

  let signatures: string[] = []
  try {
    signatures = await resolveSignatures(selector)
  } catch {}

  if (signatures.length === 0) {
    return value
  }

  const sig = signatures[0]
  const fragment = FunctionFragment.from(sig)
  const calldata = value.substring(10)

  try {
    const decoded = AbiCoder.defaultAbiCoder().decode(fragment.inputs, '0x' + calldata)

    const processedParams: Record<string, any> = {}
    const allowedParams = decodableParams?.[sig] ?? null

    for (let i = 0; i < fragment.inputs.length; i++) {
      const param = fragment.inputs[i]
      let paramValue = decoded[i]

      if (typeof paramValue === 'bigint') {
        paramValue = paramValue.toString()
      }

      if (param.type === 'bytes' && typeof paramValue === 'string') {
        const shouldDecode = allowedParams === null || allowedParams.includes(i)

        if (shouldDecode) {
          if (shouldDecodeMultiSend) {
            const multiSendResult = decodeMultiSendData(paramValue)
            if (multiSendResult) {
              for (const tx of multiSendResult.transactions) {
                if (tx.data && tx.data !== '0x' && tx.data.length > 10) {
                  const innerDecoded = await decodeNestedCalldata(tx.data, resolveSignatures, options)
                  if (innerDecoded !== tx.data) {
                    tx.decodedData = innerDecoded
                  }
                }
              }
              paramValue = multiSendResult
            } else {
              paramValue = await decodeNestedCalldata(paramValue, resolveSignatures, options)
            }
          } else {
            paramValue = await decodeNestedCalldata(paramValue, resolveSignatures, options)
          }
        }
      }

      processedParams[param.name || `param${i}`] = paramValue
    }

    return {
      _isNestedCall: true,
      function: sig,
      selector,
      parameters: processedParams,
      raw: value,
    }
  } catch {
    return value
  }
}
