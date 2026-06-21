import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const postEntries = postFiles.map((fileName) => {
  const absolutePath = resolve(postsDir, fileName)
  const raw = readFileSync(absolutePath, 'utf8')

  return `  ${JSON.stringify(`../content/posts/${fileName}`)}: \`${escapeTemplateLiteral(raw)}\`,`
})

const pageFiles = readdirSync(contentDir)
  .filter((fileName) => extname(fileName).toLowerCase() === '.md')
  .sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'))

const pageEntries = pageFiles.map((fileName) => {
  const absolutePath = resolve(contentDir, fileName)
  const raw = readFileSync(absolutePath, 'utf8')

  return `  ${JSON.stringify(`../content/${fileName}`)}: \`${escapeTemplateLiteral(raw)}\`,`
})

const output = `export const rawPostModules: Record<string, string> = {
${postEntries.join('\n')}
}

export const rawPageModules: Record<string, string> = {
${pageEntries.join('\n')}
}
`

writeFileIfChanged(outputFile, output)