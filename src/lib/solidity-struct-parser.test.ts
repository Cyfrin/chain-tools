import { describe, it, expect } from 'vitest'
import {
  parseSolidityDefinitions,
  resolveStructToParamType,
  detectRootStructs,
} from '@/lib/solidity-struct-parser'

describe('parseSolidityDefinitions', () => {
  it('parses a simple struct', () => {
    const defs = parseSolidityDefinitions(`
      struct Foo {
        address owner;
        uint256 amount;
      }
    `)
    expect(defs.structs.size).toBe(1)
    expect(defs.structs.get('Foo')).toEqual([
      { name: 'owner', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ])
  })

  it('parses enums', () => {
    const defs = parseSolidityDefinitions(`
      enum Status { Active, Paused, Stopped }
    `)
    expect(defs.enums.size).toBe(1)
    expect(defs.enums.has('Status')).toBe(true)
  })

  it('strips single-line comments', () => {
    const defs = parseSolidityDefinitions(`
      struct Foo {
        // The owner address
        address owner;
        uint256 amount; // in wei
      }
    `)
    expect(defs.structs.get('Foo')).toEqual([
      { name: 'owner', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ])
  })

  it('strips multi-line comments', () => {
    const defs = parseSolidityDefinitions(`
      /* This is a comment */
      struct Foo {
        /** @notice The owner */
        address owner;
      }
    `)
    expect(defs.structs.get('Foo')).toEqual([
      { name: 'owner', type: 'address' },
    ])
  })

  it('parses array types', () => {
    const defs = parseSolidityDefinitions(`
      struct Foo {
        address[] owners;
        uint256[3] fixed;
      }
    `)
    expect(defs.structs.get('Foo')).toEqual([
      { name: 'owners', type: 'address[]' },
      { name: 'fixed', type: 'uint256[3]' },
    ])
  })

  it('parses multiple structs and enums', () => {
    const defs = parseSolidityDefinitions(`
      struct A { uint256 x; }
      struct B { address y; }
      enum E { One, Two }
    `)
    expect(defs.structs.size).toBe(2)
    expect(defs.enums.size).toBe(1)
  })

  it('ignores pragma and SPDX lines', () => {
    const defs = parseSolidityDefinitions(`
      // SPDX-License-Identifier: MIT
      pragma solidity ^0.8.20;
      struct Foo { uint256 x; }
    `)
    expect(defs.structs.size).toBe(1)
  })
})

describe('resolveStructToParamType', () => {
  it('resolves primitive fields', () => {
    const defs = parseSolidityDefinitions(`
      struct Foo {
        address owner;
        uint256 amount;
        bool active;
        string name;
        bytes data;
      }
    `)
    const result = resolveStructToParamType('Foo', defs)
    expect(result).toEqual({
      name: 'Foo',
      type: 'tuple',
      components: [
        { name: 'owner', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'active', type: 'bool' },
        { name: 'name', type: 'string' },
        { name: 'data', type: 'bytes' },
      ],
    })
  })

  it('resolves enums as uint8', () => {
    const defs = parseSolidityDefinitions(`
      enum Status { Active, Paused }
      struct Foo { Status s; }
    `)
    const result = resolveStructToParamType('Foo', defs)
    expect(result.components![0]).toEqual({
      name: 's',
      type: 'uint8',
    })
  })

  it('resolves nested structs as tuples', () => {
    const defs = parseSolidityDefinitions(`
      struct Inner { uint256 x; }
      struct Outer { Inner inner; address owner; }
    `)
    const result = resolveStructToParamType('Outer', defs)
    expect(result).toEqual({
      name: 'Outer',
      type: 'tuple',
      components: [
        {
          name: 'inner',
          type: 'tuple',
          components: [{ name: 'x', type: 'uint256' }],
        },
        { name: 'owner', type: 'address' },
      ],
    })
  })

  it('resolves struct arrays', () => {
    const defs = parseSolidityDefinitions(`
      struct Item { uint256 id; }
      struct List { Item[] items; }
    `)
    const result = resolveStructToParamType('List', defs)
    expect(result.components![0]).toEqual({
      name: 'items',
      type: 'tuple[]',
      components: [{ name: 'id', type: 'uint256' }],
    })
  })

  it('resolves enum arrays', () => {
    const defs = parseSolidityDefinitions(`
      enum Color { Red, Green, Blue }
      struct Palette { Color[] colors; }
    `)
    const result = resolveStructToParamType('Palette', defs)
    expect(result.components![0]).toEqual({
      name: 'colors',
      type: 'uint8[]',
    })
  })

  it('throws on unknown struct', () => {
    const defs = parseSolidityDefinitions(`struct Foo { uint256 x; }`)
    expect(() => resolveStructToParamType('Bar', defs)).toThrow(
      'Unknown struct "Bar"'
    )
  })

  it('throws on unknown field type', () => {
    const defs = parseSolidityDefinitions(`
      struct Foo { Missing x; }
    `)
    expect(() => resolveStructToParamType('Foo', defs)).toThrow(
      'Unknown type "Missing"'
    )
  })

  it('throws on circular reference', () => {
    const defs = parseSolidityDefinitions(`
      struct A { B b; }
      struct B { A a; }
    `)
    expect(() => resolveStructToParamType('A', defs)).toThrow(
      'Circular reference'
    )
  })

  it('throws on mapping type', () => {
    const defs = parseSolidityDefinitions(`
      struct Foo { mapping(address=>uint256) balances; }
    `)
    expect(() => resolveStructToParamType('Foo', defs)).toThrow(
      'mapping'
    )
  })

  it('resolves the full AgreementDetailsV1 struct', () => {
    const defs = parseSolidityDefinitions(`
      struct AgreementDetailsV1 {
        string protocolName;
        Contact[] contactDetails;
        Chain[] chains;
        BountyTerms bountyTerms;
        string agreementURI;
      }
      struct Contact { string name; string contact; }
      struct Chain {
        address assetRecoveryAddress;
        Account[] accounts;
        uint256 id;
      }
      struct Account {
        address accountAddress;
        ChildContractScope childContractScope;
        bytes signature;
      }
      enum ChildContractScope { None, ExistingOnly, All }
      struct BountyTerms {
        uint256 bountyPercentage;
        uint256 bountyCapUSD;
        bool retainable;
        IdentityRequirements identity;
        string diligenceRequirements;
      }
      enum IdentityRequirements { Anonymous, Pseudonymous, Named }
    `)

    const result = resolveStructToParamType(
      'AgreementDetailsV1',
      defs
    )
    expect(result.type).toBe('tuple')
    expect(result.components).toHaveLength(5)
    expect(result.components![0]).toEqual({
      name: 'protocolName',
      type: 'string',
    })
    expect(result.components![1].type).toBe('tuple[]')
    expect(result.components![1].components).toHaveLength(2)
    expect(result.components![3].type).toBe('tuple')
    expect(result.components![3].components).toHaveLength(5)
    // IdentityRequirements enum → uint8
    expect(result.components![3].components![3]).toEqual({
      name: 'identity',
      type: 'uint8',
    })
  })
})

describe('detectRootStructs', () => {
  it('detects the unreferenced struct as root', () => {
    const defs = parseSolidityDefinitions(`
      struct Inner { uint256 x; }
      struct Outer { Inner inner; }
    `)
    expect(detectRootStructs(defs)).toEqual(['Outer'])
  })

  it('detects multiple roots', () => {
    const defs = parseSolidityDefinitions(`
      struct A { uint256 x; }
      struct B { uint256 y; }
    `)
    const roots = detectRootStructs(defs)
    expect(roots).toContain('A')
    expect(roots).toContain('B')
  })

  it('returns all structs when everything is referenced', () => {
    const defs = parseSolidityDefinitions(`
      struct A { B b; }
      struct B { A a; }
    `)
    const roots = detectRootStructs(defs)
    expect(roots).toHaveLength(2)
  })

  it('detects AgreementDetailsV1 as the root', () => {
    const defs = parseSolidityDefinitions(`
      struct AgreementDetailsV1 {
        string protocolName;
        Contact[] contactDetails;
        Chain[] chains;
        BountyTerms bountyTerms;
        string agreementURI;
      }
      struct Contact { string name; string contact; }
      struct Chain { address recovery; Account[] accounts; uint256 id; }
      struct Account { address addr; ChildContractScope scope; bytes sig; }
      enum ChildContractScope { None, ExistingOnly, All }
      struct BountyTerms {
        uint256 pct;
        uint256 cap;
        bool retainable;
        IdentityRequirements identity;
        string diligence;
      }
      enum IdentityRequirements { Anonymous, Pseudonymous, Named }
    `)
    expect(detectRootStructs(defs)).toEqual(['AgreementDetailsV1'])
  })
})
