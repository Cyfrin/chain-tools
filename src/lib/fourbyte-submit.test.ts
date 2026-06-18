import { describe, it, expect, vi } from 'vitest'
import {
  calldataSelectorOf,
  canContributeSignature,
  interpretFourbyteResponse,
  submitSignatureToFourbyte,
  type ContributeGateInput,
} from '@/lib/fourbyte-submit'

// transfer(address,uint256) => 0xa9059cbb
const TRANSFER = 'transfer(address,uint256)'
const TRANSFER_SELECTOR = '0xa9059cbb'

describe('calldataSelectorOf', () => {
  it('extracts the selector with and without 0x prefix', () => {
    expect(calldataSelectorOf('0xa9059cbb0000', true)).toBe('0xa9059cbb')
    expect(calldataSelectorOf('a9059cbb0000', true)).toBe('0xa9059cbb')
  })

  it('lowercases the selector', () => {
    expect(calldataSelectorOf('0xA9059CBB0000', true)).toBe('0xa9059cbb')
  })

  it('returns empty for non-function mode or too-short data', () => {
    expect(calldataSelectorOf('0xa9059cbb', false)).toBe('')
    expect(calldataSelectorOf('', true)).toBe('')
    expect(calldataSelectorOf('0xa905', true)).toBe('')
  })
})

describe('canContributeSignature', () => {
  const base: ContributeGateInput = {
    decodeMode: 'function',
    isFunction: true,
    signature: TRANSFER,
    decodedFunction: TRANSFER,
    hasError: false,
    calldataSelector: TRANSFER_SELECTOR,
    knownSignatures: [],
  }

  it('allows a valid, selector-matching signature 4byte does not have', () => {
    expect(canContributeSignature(base)).toBe(true)
  })

  it('rejects struct mode and non-function calldata', () => {
    expect(canContributeSignature({ ...base, decodeMode: 'struct' })).toBe(false)
    expect(canContributeSignature({ ...base, isFunction: false })).toBe(false)
  })

  it('rejects when there is no signature, a decode error, or a function mismatch', () => {
    expect(canContributeSignature({ ...base, signature: '' })).toBe(false)
    expect(canContributeSignature({ ...base, hasError: true })).toBe(false)
    expect(canContributeSignature({ ...base, decodedFunction: 'approve(address,uint256)' })).toBe(false)
  })

  it("rejects when the signature's selector does not match the calldata", () => {
    expect(canContributeSignature({ ...base, calldataSelector: '0x095ea7b3' })).toBe(false)
  })

  it('rejects a signature 4byte already knows', () => {
    expect(canContributeSignature({ ...base, knownSignatures: [TRANSFER] })).toBe(false)
  })

  it('rejects an unparseable signature', () => {
    expect(canContributeSignature({ ...base, signature: 'not a sig', decodedFunction: 'not a sig' })).toBe(false)
  })
})

describe('interpretFourbyteResponse', () => {
  it('maps 200/201 to success', () => {
    expect(interpretFourbyteResponse(201, { id: 1 })).toBe('success')
    expect(interpretFourbyteResponse(200, {})).toBe('success')
  })

  it('maps a 400 mentioning an existing signature to exists', () => {
    expect(interpretFourbyteResponse(400, { text_signature: ['signature already exists'] })).toBe('exists')
  })

  it('maps other failures to error', () => {
    expect(interpretFourbyteResponse(400, { text_signature: ['unparseable'] })).toBe('error')
    expect(interpretFourbyteResponse(500, null)).toBe('error')
  })
})

describe('submitSignatureToFourbyte', () => {
  it('normalizes the signature and reports success on 201', async () => {
    let sentBody: URLSearchParams | undefined
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      sentBody = init?.body as URLSearchParams
      return new Response(JSON.stringify({ id: 1 }), { status: 201 })
    })

    const result = await submitSignatureToFourbyte('transfer(address _to, uint value)', fetchMock)

    expect(result).toEqual({ status: 'success', signature: TRANSFER })
    expect(sentBody?.get('text_signature')).toBe(TRANSFER)
  })

  it('reports already-exists on a 400 from 4byte', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ text_signature: ['already exists'] }), { status: 400 })
    )
    const result = await submitSignatureToFourbyte(TRANSFER, fetchMock)
    expect(result).toEqual({ status: 'exists', signature: TRANSFER })
  })

  it('rejects an unparseable signature without calling the network', async () => {
    const fetchMock = vi.fn()
    const result = await submitSignatureToFourbyte('not a signature!!!', fetchMock as unknown as typeof fetch)
    expect(result.status).toBe('error')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports an error when the request throws', async () => {
    const fetchMock = vi.fn(async () => { throw new Error('network down') })
    const result = await submitSignatureToFourbyte(TRANSFER, fetchMock as unknown as typeof fetch)
    expect(result.status).toBe('error')
  })
})
