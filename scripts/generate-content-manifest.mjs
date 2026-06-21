import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function stripQuotes(value) {
  return value.replace(/^['\"]|['\"]$/g, '').trim()
}

function parseScalar(value) {
  const normalized = stripQuotes(value.trim())

  if (normalized === 'true') return true
  if (normalized === 'false') return false

  return normalized
}

function parseFrontmatter(source) {
  if (!source.startsWith('---\n')) {
    return { data: {}, content: source }
  }

  const closingIndex = source.indexOf('\n---\n', 4)

  if (closingIndex === -1) {
    return { data: {}, content: source }
  }

  const block = source.slice(4, closingIndex)
  const content = source.slice(closingIndex + 5)
  const data = {}
  const lines = block.split(/\r?\n/)
  let currentArrayKey = null

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (!trimmed) return

    if (trimmed.startsWith('- ') && currentArrayKey) {
      const existing = data[currentArrayKey]
      if (Array.isArray(existing)) {
        existing.push(stripQuotes(trimmed.slice(2)))
      }
      return
    }

    const separatorIndex = trimmed.indexOf(':')
    if (separatorIndex === -1) return

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

  return { data, content }
}

function normalizeFrontmatter(data, fallbackTitle) {
  const title = typeof data.title === 'string' && data.title.trim().length > 0 ? data.title.trim() : fallbackTitle
  const date = typeof data.date === 'string' ? data.date : new Date().toISOString().slice(0, 10)
  const summary =
    typeof data.summary === 'string' && data.summary.trim().length > 0
      ? data.summary.trim()
      : '这篇文章还没有摘要，但它已经在等待一次安静的阅读。'
  const tags = Array.isArray(data.tags)
    ? data.tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
    : []

  return {
    title,
    date,
    summary,
    tags,
    cover: typeof data.cover === 'string' ? data.cover : undefined,
    draft: Boolean(data.draft),
  }
}

function stripMarkdown(source) {
  return source
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '$1')
    .replace(/[>#*_~-]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
}

function estimateReadingTime(text) {
  const characterCount = stripMarkdown(text).length
  return Math.max(1, Math.round(characterCount / 320))
}

const currentDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(currentDir, '..')
const contentDir = resolve(rootDir, 'content')
const postsDir = resolve(contentDir, 'posts')
const outputDir = resolve(rootDir, 'src/generated')
const outputFile = resolve(outputDir, 'content.ts')

function escapeTemplateLiteral(value) {
  return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

function writeFileIfChanged(filePath, content) {
  if (existsSync(filePath) && readFileSync(filePath, 'utf8') === content) return

  writeFileSync(filePath, content, 'utf8')
}

mkdirSync(outputDir, { recursive: true })

const postFiles = readdirSync(postsDir)
  .filter((fileName) => extname(fileName).toLowerCase() === '.md')
  .sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'))

const postMetaEntries = postFiles.map((fileName) => {
  const absolutePath = resolve(postsDir, fileName)
  const raw = readFileSync(absolutePath, 'utf8')
  const slug = fileName.replace(/\.md$/, '')
  const { data, content } = parseFrontmatter(raw)
  const frontmatter = normalizeFrontmatter(data, slug)
  const excerpt = stripMarkdown(content).slice(0, 160)
  const readingTime = estimateReadingTime(content)

  return `  ${JSON.stringify(slug)}: ${JSON.stringify({ slug, frontmatter, excerpt, readingTime })},`
})

const pageFiles = readdirSync(contentDir)
  .filter((fileName) => extname(fileName).toLowerCase() === '.md')
  .sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'))

const pageEntries = pageFiles.map((fileName) => {
  const absolutePath = resolve(contentDir, fileName)
  const raw = readFileSync(absolutePath, 'utf8')

  return `  ${JSON.stringify(`../content/${fileName}`)}: \`${escapeTemplateLiteral(raw)}\`,`
})

const output = `export const rawPostModules: Record<string, () => Promise<string>> = {
${postFiles.map((fileName) => `  ${JSON.stringify(`../content/posts/${fileName}`)}: () => import(${JSON.stringify(`../../content/posts/${fileName}?raw`) }).then((mod) => mod.default),`).join('\n')}
}

export const postMetaModules: Record<string, { slug: string; frontmatter: { title: string; date: string; summary: string; tags: string[]; cover?: string; draft?: boolean }; excerpt: string; readingTime: number }> = {
${postMetaEntries.join('\n')}
}

export const rawPageModules: Record<string, string> = {
${pageEntries.join('\n')}
}

export const pageContent: Record<string, { data: Record<string, unknown>; content: string }> = {
${pageFiles.map((fileName) => {
  const slug = fileName.replace(/\.md$/, '')
  const raw = readFileSync(resolve(contentDir, fileName), 'utf8')
  const parsed = parseFrontmatter(raw)
  return `  ${JSON.stringify(slug)}: ${JSON.stringify(parsed)},`
}).join('\n')}
}
`

writeFileIfChanged(outputFile, output)