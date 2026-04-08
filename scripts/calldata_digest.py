#!/usr/bin/env python3
"""
ERC-8213 Calldata Digest reference implementation (Python).

Usage:
    python scripts/calldata_digest.py 0xa9059cbb00000000000000000000000...

Computes: keccak256(uint256(len(calldata)) || calldata)

The compute_calldata_digest function below is the exact reference
implementation from the ERC-8213 draft.
"""

import sys
from eth_hash.auto import keccak


def compute_calldata_digest(calldata: bytes) -> str:
    """Compute the Calldata Digest per this ERC."""
    if isinstance(calldata, str) and calldata.startswith("0x"):
        calldata = bytes.fromhex(calldata[2:])
    length_bytes = len(calldata).to_bytes(32, byteorder="big")
    return "0x" + keccak(length_bytes + calldata).hex()


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python calldata_digest.py <hex-calldata>")
        sys.exit(1)

    calldata_hex = sys.argv[1]
    digest = compute_calldata_digest(calldata_hex)
    print(f"Calldata Digest: {digest}")


if __name__ == "__main__":
    main()
