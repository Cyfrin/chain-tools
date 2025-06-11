import { NextRequest, NextResponse } from 'next/server'
import { keccak256, toUtf8Bytes } from 'ethers'

// In-memory cache for signatures (in production, use Redis or similar)
const signatureCache = new Map<string, {
  signatures: string[]
  timestamp: number
  ttl: number
}>()

const CACHE_TTL = 60 * 60 * 1000 // 1 hour in milliseconds

function calculateFunctionSelector(signature: string): string {
  // Calculate the 4-byte selector from a function signature
  const hash = keccak256(toUtf8Bytes(signature))
  return hash.substring(0, 10) // First 4 bytes (8 hex chars + 0x)
}

function verifySignature(signature: string, expectedSelector: string): boolean {
  try {
    const calculatedSelector = calculateFunctionSelector(signature)
    return calculatedSelector.toLowerCase() === expectedSelector.toLowerCase()
  } catch {
    return false
  }
}

async function fetchFrom4byte(selector: string): Promise<string[]> {
  try {
    // Remove 0x prefix if present
    const cleanSelector = selector.startsWith('0x') ? selector.substring(2) : selector

    const response = await fetch(`https://www.4byte.directory/api/v1/signatures/?hex_signature=${cleanSelector}`, {
      headers: {
        'User-Agent': 'Chain Tools (ABI Decoder)'
      }
    })

    if (!response.ok) {
      throw new Error(`4byte API error: ${response.status}`)
    }

    const data = await response.json()
    console.log(data)

    if (!data.results || !Array.isArray(data.results)) {
      return []
    }

    // Extract signatures and verify they match the selector
    const validResults: Array<{signature: string, created_at: string}> = []
    for (const result of data.results) {
      if (result.text_signature) {
        const signature = result.text_signature.trim()
        if (verifySignature(signature, selector)) {
          validResults.push({
            signature,
            created_at: result.created_at
          })
        }
      }
    }

    // Sort by creation date (oldest first) to get the most canonical signatures
    validResults.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    
    return validResults.map(result => result.signature)
  } catch (error) {
    console.error('Error fetching from 4byte:', error)
    return []
  }
}


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const selector = searchParams.get('selector')

    if (!selector) {
      return NextResponse.json(
        { error: 'Missing selector parameter' },
        { status: 400 }
      )
    }

    // Validate selector format
    const cleanSelector = selector.startsWith('0x') ? selector : '0x' + selector
    if (!/^0x[0-9a-fA-F]{8}$/.test(cleanSelector)) {
      return NextResponse.json(
        { error: 'Invalid selector format. Expected 8 hex characters (4 bytes)' },
        { status: 400 }
      )
    }

    // Check cache first
    const cached = signatureCache.get(cleanSelector)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return NextResponse.json({
        selector: cleanSelector,
        signatures: cached.signatures,
        cached: true
      })
    }

    // Fetch from 4byte directory
    const signatures = await fetchFrom4byte(cleanSelector)

    // Cache the result
    signatureCache.set(cleanSelector, {
      signatures,
      timestamp: Date.now(),
      ttl: CACHE_TTL
    })

    // Clean old cache entries periodically
    if (signatureCache.size > 1000) {
      const now = Date.now()
      for (const [key, value] of signatureCache.entries()) {
        if (now - value.timestamp > value.ttl) {
          signatureCache.delete(key)
        }
      }
    }

    return NextResponse.json({
      selector: cleanSelector,
      signatures,
      cached: false,
      verified: signatures.length > 0 // All signatures are verified during fetch
    })

  } catch (error) {
    console.error('Signature lookup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}