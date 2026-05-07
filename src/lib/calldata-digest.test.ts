import { describe, it, expect } from 'vitest'
import { computeCalldataDigest } from '@/lib/calldata-digest'

describe('computeCalldataDigest', () => {
  it('matches ERC-8213 test vector for ERC-20 transfer', () => {
    // From ERC-8213 spec: transfer(address,uint256) call
    const calldata =
      '0xa9059cbb' +
      '0000000000000000000000004675c7e5baafbffbca748158becba61ef3b0a263' +
      '0000000000000000000000000000000000000000000000000de0b6b3a7640000'

    expect(computeCalldataDigest(calldata)).toBe(
      '0x812cee5d9cc7461c04bbcd7b70af9c28b243ac5d74d3453b008b93b7dac69985'
    )
  })

  it('works without 0x prefix', () => {
    const calldata =
      'a9059cbb' +
      '0000000000000000000000004675c7e5baafbffbca748158becba61ef3b0a263' +
      '0000000000000000000000000000000000000000000000000de0b6b3a7640000'

    expect(computeCalldataDigest(calldata)).toBe(
      '0x812cee5d9cc7461c04bbcd7b70af9c28b243ac5d74d3453b008b93b7dac69985'
    )
  })

  it('returns empty string when no input was given', () => {
    expect(computeCalldataDigest('')).toBe('')
  })

  it('computes a real digest for empty calldata (0x — plain ETH transfer)', () => {
    // keccak256 of 32 zero bytes
    expect(computeCalldataDigest('0x')).toBe(
      '0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563'
    )
  })

  it('returns empty string for odd-length hex', () => {
    expect(computeCalldataDigest('0xabc')).toBe('')
  })

  it('returns empty string for non-hex characters', () => {
    expect(computeCalldataDigest('0xzzzz')).toBe('')
  })

  it('produces different digests for different calldata', () => {
    const a = computeCalldataDigest('0xdeadbeef')
    const b = computeCalldataDigest('0xcafebabe')

    expect(a).not.toBe('')
    expect(b).not.toBe('')
    expect(a).not.toBe(b)
  })

  it('produces different digests for data sharing a prefix', () => {
    // The length prefix prevents collisions between shared-prefix data
    const short = computeCalldataDigest('0xdeadbeef')
    const long = computeCalldataDigest('0xdeadbeef00')

    expect(short).not.toBe(long)
  })

  it('handles a minimal 1-byte calldata', () => {
    const digest = computeCalldataDigest('0xff')
    expect(digest).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('handles a bare function selector (4 bytes)', () => {
    const digest = computeCalldataDigest('0x095ea7b3')
    expect(digest).toMatch(/^0x[0-9a-f]{64}$/)
  })
})
