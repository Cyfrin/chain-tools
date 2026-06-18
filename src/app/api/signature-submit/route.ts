import { NextRequest, NextResponse } from 'next/server'
import { FunctionFragment } from 'ethers'

const FOURBYTE_SUBMIT_URL = 'https://www.4byte.directory/api/v1/signatures/'

// 4byte returns HTTP 400 with a body mentioning the existing record when the
// signature is already known. Treat that as a (benign) success rather than an
// error so the UI can report "already in 4byte".
function isAlreadyExists(status: number, body: unknown): boolean {
  return status === 400 && JSON.stringify(body ?? '').toLowerCase().includes('exist')
}

export async function POST(request: NextRequest) {
  let rawSignature: unknown
  try {
    const body = await request.json()
    rawSignature = body.signature
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof rawSignature !== 'string' || rawSignature.trim() === '') {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Normalize and validate before forwarding so we never POST garbage to 4byte.
  let textSignature: string
  try {
    textSignature = FunctionFragment.from(rawSignature.trim()).format('sighash')
  } catch {
    return NextResponse.json({ error: 'Not a valid function signature' }, { status: 400 })
  }

  try {
    const response = await fetch(FOURBYTE_SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Chain Tools (ABI Decoder)',
      },
      body: JSON.stringify({ text_signature: textSignature }),
    })

    if (response.status === 200 || response.status === 201) {
      return NextResponse.json({ ok: true, created: true, signature: textSignature })
    }

    const body = await response.json().catch(() => null)
    if (isAlreadyExists(response.status, body)) {
      return NextResponse.json({ ok: true, created: false, alreadyExists: true, signature: textSignature })
    }

    return NextResponse.json(
      { ok: false, error: `4byte directory responded with ${response.status}` },
      { status: 502 }
    )
  } catch (error) {
    console.error('Error submitting to 4byte:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to reach the 4byte directory' },
      { status: 502 }
    )
  }
}
