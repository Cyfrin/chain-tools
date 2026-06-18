/*
 * Client-side submission of function signatures to the 4byte directory.
 *
 * The decoder submits straight from the browser (not via a server proxy) so
 * each user's own IP is the subject of 4byte's anti-spam, rather than funnelling
 * every submission through a single server IP. The pure helpers here hold the
 * gating and response-mapping logic so they can be unit-tested without React.
 */

import { FunctionFragment } from 'ethers'

export const FOURBYTE_SIGNATURES_URL = 'https://www.4byte.directory/api/v1/signatures/'

export type FourbyteSubmitOutcome = 'success' | 'exists' | 'error'

export type FourbyteSubmitResult =
  | { status: 'success'; signature: string }
  | { status: 'exists'; signature: string }
  | { status: 'error'; error: string }

/** The 4-byte selector of the calldata in function mode, or '' if not applicable. */
export function calldataSelectorOf(abiData: string, isFunction: boolean): string {
  if (!isFunction || !abiData) return ''
  const hex = abiData.startsWith('0x') ? abiData : '0x' + abiData
  return hex.length >= 10 ? hex.substring(0, 10).toLowerCase() : ''
}

/** The canonical selector of a function signature, or '' if it doesn't parse. */
function selectorOfSignature(signature: string): string {
  try {
    return FunctionFragment.from(signature).selector.toLowerCase()
  } catch {
    return ''
  }
}

export interface ContributeGateInput {
  decodeMode: string
  isFunction: boolean
  signature: string
  /** decodedData.function — the signature the decode actually used. */
  decodedFunction: string | undefined
  /** Whether the decode produced an error result. */
  hasError: boolean
  calldataSelector: string
  /** Signatures 4byte already returned for this selector. */
  knownSignatures: readonly string[]
}

/**
 * Whether to offer contributing the signature to 4byte: a user-supplied
 * signature that decoded the calldata, whose selector matches, and that 4byte
 * doesn't already have.
 */
export function canContributeSignature(input: ContributeGateInput): boolean {
  const { decodeMode, isFunction, signature, decodedFunction, hasError, calldataSelector, knownSignatures } = input
  if (decodeMode !== 'function' || !isFunction || !signature) return false
  if (hasError || decodedFunction !== signature) return false
  if (!calldataSelector || selectorOfSignature(signature) !== calldataSelector) return false
  return !knownSignatures.includes(signature)
}

/** Map a 4byte HTTP response to an outcome. `body` may be null. */
export function interpretFourbyteResponse(status: number, body: unknown): FourbyteSubmitOutcome {
  if (status === 200 || status === 201) return 'success'
  if (status === 400 && JSON.stringify(body ?? '').toLowerCase().includes('exist')) return 'exists'
  return 'error'
}

/**
 * Submit a signature to 4byte from the client. The signature is normalized to
 * its canonical form first. A form-encoded body keeps this a CORS "simple
 * request" (no preflight). `fetchImpl` is injectable for tests.
 */
export async function submitSignatureToFourbyte(
  signature: string,
  fetchImpl: typeof fetch = fetch
): Promise<FourbyteSubmitResult> {
  let textSignature: string
  try {
    textSignature = FunctionFragment.from(signature).format('sighash')
  } catch {
    return { status: 'error', error: 'Not a valid function signature' }
  }

  try {
    const response = await fetchImpl(FOURBYTE_SIGNATURES_URL, {
      method: 'POST',
      body: new URLSearchParams({ text_signature: textSignature }),
    })
    const body = await response.json().catch(() => null)
    const outcome = interpretFourbyteResponse(response.status, body)
    if (outcome === 'error') {
      return { status: 'error', error: 'The 4byte directory rejected the signature' }
    }
    return { status: outcome, signature: textSignature }
  } catch {
    return { status: 'error', error: 'Could not reach the 4byte directory' }
  }
}
