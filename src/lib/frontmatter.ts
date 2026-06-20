export interface ParsedFrontmatter {
  data: Record<string, unknown>
  content: string
}

function stripQuotes(value: string) {
  return value.replace(/^['\"]|['\"]$/g, '').trim()
}

function parseScalar(value: string): unknown {
  const normalized = stripQuotes(value.trim())

  if (normalized === 'true') {
    return true
  }

  if (normalized === 'false') {
    return false
  }

  return normalized
}

export function parseFrontmatter(source: string): ParsedFrontmatter {
  if (!source.startsWith('---\n')) {
    return {
      data: {},
      content: source,
    }
  }

  const closingIndex = source.indexOf('\n---\n', 4)

  if (closingIndex === -1) {
    return {
      data: {},
      content: source,
    }
  }

  const block = source.slice(4, closingIndex)
  const content = source.slice(closingIndex + 5)
  const data: Record<string, unknown> = {}
  const lines = block.split(/\r?\n/)
  let currentArrayKey: string | null = null

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (!trimmed) {
      return
    }

    if (trimmed.startsWith('- ') && currentArrayKey) {
      const existing = data[currentArrayKey]
      if (Array.isArray(existing)) {
        existing.push(stripQuotes(trimmed.slice(2)))
      }
      return
    }

    const separatorIndex = trimmed.indexOf(':')
    if (separatorIndex === -1) {
      return
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()

    if (!rawValue) {
      data[key] = []
      currentArrayKey = key
      return
    }

    data[key] = parseScalar(rawValue)
    currentArrayKey = null
  })

  return {
    data,
    content,
  }
}
