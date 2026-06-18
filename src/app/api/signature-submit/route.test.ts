import { describe, it, expect, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/signature-submit/route'

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/signature-submit', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('POST /api/signature-submit', () => {
  it('forwards a valid signature and reports it created', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ id: 1 }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await POST(postRequest({ signature: 'transfer(address _to, uint value)' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toMatchObject({ ok: true, created: true })
    // Forwarded the normalized (canonical) signature, not the raw input.
    const sent = JSON.parse((fetchMock.mock.calls[0][1]?.body as string) ?? '{}')
    expect(sent.text_signature).toBe('transfer(address,uint256)')
  })

  it('treats an existing signature (4byte 400) as already-exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ non_field_errors: ['signature already exists'] }), { status: 400 })
    ))

    const res = await POST(postRequest({ signature: 'transfer(address,uint256)' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toMatchObject({ ok: true, created: false, alreadyExists: true })
  })

  it('rejects an unparseable signature without calling 4byte', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const res = await POST(postRequest({ signature: 'not a signature!!!' }))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toMatch(/valid function signature/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a missing signature', async () => {
    const res = await POST(postRequest({}))
    expect(res.status).toBe(400)
  })

  it('surfaces an upstream failure as 502', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })))

    const res = await POST(postRequest({ signature: 'transfer(address,uint256)' }))
    const data = await res.json()

    expect(res.status).toBe(502)
    expect(data.ok).toBe(false)
  })
})
