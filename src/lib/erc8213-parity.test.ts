/**
 * ERC-8213 cross-implementation parity.
 *
 * chain-tools computes digests with ethers; the erc8213.org site computes
 * them with viem. They must agree byte-for-byte, otherwise a wallet that
 * verifies against one would see a false mismatch on the other.
 *
 * This test runs both libraries on the same fixtures and asserts equality.
 * It does NOT replace the per-implementation tests in calldata-digest.test.ts.
 */

import { describe, it, expect } from 'vitest'
import { ethers } from 'ethers'
import {
  hashTypedData,
  hashDomain,
  hashStruct,
  keccak256 as viemKeccak256,
  toBytes,
  numberToHex,
  concat,
  toHex,
  type TypedData,
  type TypedDataDomain,
} from 'viem'
import { computeCalldataDigest } from '@/lib/calldata-digest'

// ---------- viem-based reference implementations ----------

function viemCalldataDigest(calldata: `0x${string}`): `0x${string}` {
  const bytes = toBytes(calldata)
  const lenWord = numberToHex(bytes.length, { size: 32 })
  return viemKeccak256(concat([toBytes(lenWord), bytes]))
}

interface TypedDoc {
  domain: TypedDataDomain
  types: Record<string, ReadonlyArray<{ name: string; type: string }>>
  primaryType: string
  message: Record<string, unknown>
}

function viemEip712Digests(doc: TypedDoc) {
  const types = { ...doc.types } as Record<string, unknown>
  delete types.EIP712Domain
  return {
    domainHash: hashDomain({
      domain: doc.domain,
      // viem's hashDomain wants mutable arrays (MessageTypeProperty[]).
      types: doc.types as Record<string, { name: string; type: string }[]>,
    }),
    messageHash: hashStruct({
      data: doc.message,
      types: types as TypedData,
      primaryType: doc.primaryType,
    }),
    digest: hashTypedData({
      domain: doc.domain,
      types: doc.types as TypedData,
      primaryType: doc.primaryType,
      message: doc.message,
    }),
  }
}

function ethersEip712Digests(doc: TypedDoc) {
  const types = { ...doc.types } as Record<string, unknown>
  delete types.EIP712Domain
  return {
    domainHash: ethers.TypedDataEncoder.hashDomain(doc.domain),
    messageHash: ethers.TypedDataEncoder.hashStruct(
      doc.primaryType,
      types as Record<string, Array<{ name: string; type: string }>>,
      doc.message,
    ),
    digest: ethers.TypedDataEncoder.hash(
      doc.domain,
      types as Record<string, Array<{ name: string; type: string }>>,
      doc.message,
    ),
  }
}

// ---------- shared fixtures (must match erc8213-site/app/lib/example.ts) ----------

const examplePermit: TypedDoc = {
  domain: {
    name: 'Permit2',
    chainId: 1,
    verifyingContract: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  },
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    PermitTransferFrom: [
      { name: 'permitted', type: 'TokenPermissions' },
      { name: 'spender', type: 'address' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
    TokenPermissions: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
  },
  primaryType: 'PermitTransferFrom',
  message: {
    permitted: {
      token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      amount: '1000000000',
    },
    spender: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    nonce: '0',
    deadline: '1893456000',
  },
}

const exampleMail: TypedDoc = {
  domain: {
    name: 'Ether Mail',
    version: '1',
    chainId: 1,
    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
  },
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Person: [
      { name: 'name', type: 'string' },
      { name: 'wallet', type: 'address' },
    ],
    Mail: [
      { name: 'from', type: 'Person' },
      { name: 'to', type: 'Person' },
      { name: 'contents', type: 'string' },
    ],
  },
  primaryType: 'Mail',
  message: {
    from: { name: 'Cow', wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826' },
    to: { name: 'Bob', wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' },
    contents: 'Hello, Bob!',
  },
}

const erc20TransferCalldata =
  '0xa9059cbb' +
  '0000000000000000000000004675c7e5baafbffbca748158becba61ef3b0a263' +
  '0000000000000000000000000000000000000000000000000de0b6b3a7640000'

// ---------- tests ----------

describe('ERC-8213 calldata digest: ethers vs viem', () => {
  it.each([
    ['ERC-20 transfer (spec vector)', erc20TransferCalldata],
    ['empty calldata (plain ETH transfer)', '0x'],
    ['1-byte payload', '0xff'],
    ['bare 4-byte selector', '0x095ea7b3'],
    ['common prefix, 5 bytes', '0xdeadbeef00'],
  ])('%s', (_label, calldata) => {
    const eth = computeCalldataDigest(calldata)
    const v = viemCalldataDigest(calldata as `0x${string}`)
    expect(eth).toBe(v)
  })

  it('agrees on 32 random vectors of varying length', () => {
    for (let i = 0; i < 32; i++) {
      const len = 1 + Math.floor(Math.random() * 768)
      const bytes = new Uint8Array(len)
      crypto.getRandomValues(bytes)
      const hex = toHex(bytes)
      expect(computeCalldataDigest(hex)).toBe(viemCalldataDigest(hex))
    }
  })
})

describe('ERC-8213 EIP-712 digests: ethers vs viem', () => {
  it.each([
    ['Permit2 (PermitTransferFrom)', examplePermit],
    ['EIP-712 spec Mail', exampleMail],
  ])('%s', (_label, doc) => {
    const eth = ethersEip712Digests(doc)
    const v = viemEip712Digests(doc)
    expect(eth.domainHash).toBe(v.domainHash)
    expect(eth.messageHash).toBe(v.messageHash)
    expect(eth.digest).toBe(v.digest)
  })
})
