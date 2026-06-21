import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(currentDir, '..')
const contentDir = resolve(rootDir, 'content')
const postsDir = resolve(contentDir, 'posts')
const aboutFile = resolve(contentDir, 'about.md')
const portfolioFile = resolve(contentDir, 'portfolio.md')
const outputDir = resolve(rootDir, 'src/generated')
const outputFile = resolve(outputDir, 'content.ts')

function escapeTemplateLiteral(value) {
  return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
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

const aboutSource = readFileSync(aboutFile, 'utf8')
const portfolioSource = readFileSync(portfolioFile, 'utf8')

const output = `export const rawPostModules: Record<string, string> = {
${postEntries.join('\n')}
}

export const rawAboutModule: Record<string, string> = {
  ${JSON.stringify('../content/about.md')}: \`${escapeTemplateLiteral(aboutSource)}\`,
}

export const rawPortfolioModule: Record<string, string> = {
  ${JSON.stringify('../content/portfolio.md')}: \`${escapeTemplateLiteral(portfolioSource)}\`,
}
`

writeFileSync(outputFile, output, 'utf8')