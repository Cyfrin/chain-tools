import { keccak256 } from 'ethers'

/**
 * Compute the Calldata Digest per ERC-8213.
 * calldataDigest = keccak256(uint256(len(calldata)) || calldata)
 *
 * Empty payloads (`'0x'` or `'0x' + zero bytes`) are valid and produce a
 * real digest — that is the case for plain-ETH transfers. Returns `''` only
 * when the caller hasn't supplied any input, or when the hex is malformed.
 */
export function computeCalldataDigest(calldata: string): string {
  if (!calldata) return ''
  const hex = calldata.startsWith('0x') ? calldata.slice(2) : calldata
  if (hex.length % 2 !== 0 || (hex.length > 0 && !/^[0-9a-fA-F]+$/.test(hex))) {
    return ''
  }
  const byteLength = hex.length / 2
  const lengthHex = byteLength.toString(16).padStart(64, '0')
  return keccak256('0x' + lengthHex + hex)
}
