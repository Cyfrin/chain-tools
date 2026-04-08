#!/usr/bin/env node
/**
 * Fuzz test: generates random calldata, computes the ERC-8213 Calldata Digest
 * in both JS (ethers) and Python (eth_hash), and compares results.
 *
 * Usage: node scripts/fuzz-calldata-digest.js [iterations]
 */

const { keccak256 } = require('ethers')
const { execSync } = require('child_process')
const { randomBytes } = require('crypto')
const { writeFileSync, unlinkSync } = require('fs')
const { tmpdir } = require('os')
const { join } = require('path')

const ITERATIONS = parseInt(process.argv[2] || '200', 10)

function jsDigest(calldata) {
  const hex = calldata.startsWith('0x') ? calldata.slice(2) : calldata
  const byteLength = hex.length / 2
  const lengthHex = byteLength.toString(16).padStart(64, '0')
  return keccak256('0x' + lengthHex + hex)
}

// Generate random test cases with varying lengths (1 to 1024 bytes)
const testCases = Array.from({ length: ITERATIONS }, () => {
  const len = Math.floor(Math.random() * 1024) + 1
  return '0x' + randomBytes(len).toString('hex')
})

// JS digests
const jsResults = testCases.map(jsDigest)

// Write test cases to temp file for Python batch processing
const casesFile = join(tmpdir(), `fuzz-cd-cases-${Date.now()}.json`)
const pyFile = join(tmpdir(), `fuzz-cd-runner-${Date.now()}.py`)

writeFileSync(casesFile, JSON.stringify(testCases))
writeFileSync(
  pyFile,
  `import json, sys
from eth_hash.auto import keccak

def compute_calldata_digest(calldata):
    if isinstance(calldata, str) and calldata.startswith("0x"):
        calldata = bytes.fromhex(calldata[2:])
    length_bytes = len(calldata).to_bytes(32, byteorder="big")
    return "0x" + keccak(length_bytes + calldata).hex()

with open(sys.argv[1]) as f:
    cases = json.load(f)
for c in cases:
    print(compute_calldata_digest(c))
`
)

// Run Python once on all cases
const pyOutput = execSync(
  `uv run --with "eth-hash[pycryptodome]" python ${pyFile} ${casesFile}`,
  { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
)
const pyResults = pyOutput.trim().split('\n')

// Clean up temp files
unlinkSync(casesFile)
unlinkSync(pyFile)

// Compare
let passed = 0
let failed = 0

for (let i = 0; i < ITERATIONS; i++) {
  if (jsResults[i] === pyResults[i]) {
    passed++
  } else {
    failed++
    const dataLen = (testCases[i].length - 2) / 2
    console.error(`MISMATCH at case ${i}:`)
    console.error(`  Input:  ${testCases[i].slice(0, 40)}... (${dataLen} bytes)`)
    console.error(`  JS:     ${jsResults[i]}`)
    console.error(`  Python: ${pyResults[i]}`)
  }
}

console.log(`\nFuzz: ${passed} passed, ${failed} failed out of ${ITERATIONS}`)
process.exit(failed > 0 ? 1 : 0)
