export interface ParamTypeDescriptor {
  name: string
  type: string
  components?: ParamTypeDescriptor[]
}

interface StructField {
  name: string
  type: string
}

interface Definitions {
  structs: Map<string, StructField[]>
  enums: Set<string>
}

const SOLIDITY_PRIMITIVES = new Set([
  'address', 'bool', 'string', 'bytes',
  ...Array.from({ length: 32 }, (_, i) => `bytes${i + 1}`),
  ...Array.from({ length: 32 }, (_, i) => `uint${(i + 1) * 8}`),
  ...Array.from({ length: 32 }, (_, i) => `int${(i + 1) * 8}`),
  'uint', 'int',
])

function stripComments(source: string): string {
  return source
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

function extractBaseType(type: string): string {
  return type.replace(/\[.*\]$/, '')
}

function extractArraySuffix(type: string): string {
  const match = type.match(/(\[.*\])$/)
  return match ? match[1] : ''
}

export function parseSolidityDefinitions(source: string): Definitions {
  const cleaned = stripComments(source)
  const structs = new Map<string, StructField[]>()
  const enums = new Set<string>()

  const structRegex = /struct\s+(\w+)\s*\{([^}]*)\}/g
  let match: RegExpExecArray | null
  while ((match = structRegex.exec(cleaned)) !== null) {
    const name = match[1]
    const body = match[2]
    const fields: StructField[] = []

    const lines = body.split(';').map(l => l.trim()).filter(Boolean)
    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 2) {
        const fieldName = parts[parts.length - 1]
        const fieldType = parts.slice(0, -1).join('')
        if (fieldName && fieldType) {
          fields.push({ name: fieldName, type: fieldType })
        }
      }
    }

    structs.set(name, fields)
  }

  const enumRegex = /enum\s+(\w+)\s*\{[^}]*\}/g
  while ((match = enumRegex.exec(cleaned)) !== null) {
    enums.add(match[1])
  }

  return { structs, enums }
}

export function resolveStructToParamType(
  structName: string,
  definitions: Definitions,
  visited: Set<string> = new Set()
): ParamTypeDescriptor {
  if (visited.has(structName)) {
    throw new Error(
      `Circular reference detected: ${structName}`
    )
  }

  const fields = definitions.structs.get(structName)
  if (!fields) {
    throw new Error(
      `Unknown struct "${structName}". ` +
      `Available: ${[...definitions.structs.keys()].join(', ')}`
    )
  }

  visited.add(structName)

  const components = fields.map(field => {
    return resolveFieldType(
      field.name,
      field.type,
      definitions,
      new Set(visited)
    )
  })

  return {
    name: structName,
    type: 'tuple',
    components,
  }
}

function resolveFieldType(
  fieldName: string,
  fieldType: string,
  definitions: Definitions,
  visited: Set<string>
): ParamTypeDescriptor {
  const baseType = extractBaseType(fieldType)
  const arraySuffix = extractArraySuffix(fieldType)

  if (fieldType.includes('mapping')) {
    throw new Error(
      `Unsupported type "mapping" for field "${fieldName}". ` +
      `Mappings cannot be ABI-encoded.`
    )
  }

  if (SOLIDITY_PRIMITIVES.has(baseType)) {
    return { name: fieldName, type: baseType + arraySuffix }
  }

  if (definitions.enums.has(baseType)) {
    return { name: fieldName, type: 'uint8' + arraySuffix }
  }

  if (definitions.structs.has(baseType)) {
    const resolved = resolveStructToParamType(
      baseType,
      definitions,
      visited
    )
    return {
      name: fieldName,
      type: 'tuple' + arraySuffix,
      components: resolved.components,
    }
  }

  throw new Error(
    `Unknown type "${baseType}" for field "${fieldName}". ` +
    `Define it as a struct or enum, or check for typos.`
  )
}

export function detectRootStructs(
  definitions: Definitions
): string[] {
  const referenced = new Set<string>()

  for (const fields of definitions.structs.values()) {
    for (const field of fields) {
      const baseType = extractBaseType(field.type)
      if (definitions.structs.has(baseType)) {
        referenced.add(baseType)
      }
    }
  }

  const roots = [...definitions.structs.keys()].filter(
    name => !referenced.has(name)
  )

  return roots.length > 0
    ? roots
    : [...definitions.structs.keys()]
}
