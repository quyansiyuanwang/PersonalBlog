import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(currentDir, '..')
const postsDir = resolve(rootDir, 'content/posts')
const siteFile = resolve(rootDir, 'src/lib/site.ts')
const outputFile = resolve(rootDir, 'public/sitemap.xml')

function extractSiteUrl(source) {
  const match = source.match(/siteUrl:\s*['"]([^'"]+)['"]|siteUrl:\s*import\.meta\.env\.BASE_URL/)

  if (!match) {
    return 'https://yourname.github.io/PersonalBlog/'
  }

  if (match[1]) {
    return match[1]
  }

  return 'https://yourname.github.io/PersonalBlog/'
}

function withTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`
}

function extractPostEntries(markdown) {
  const titleMatch = markdown.match(/title:\s*['"]?(.+?)['"]?\s*$/m)
  const dateMatch = markdown.match(/date:\s*['"]?(.+?)['"]?\s*$/m)

  return {
    date: dateMatch?.[1] ?? new Date().toISOString().slice(0, 10),
    title: titleMatch?.[1] ?? '',
  }
}

const siteSource = readFileSync(siteFile, 'utf8')
const siteUrl = withTrailingSlash(extractSiteUrl(siteSource))
const files = readdirSync(postsDir).filter((file) => file.endsWith('.md'))

const urls = [
  { loc: `${siteUrl}#/`, lastmod: new Date().toISOString().slice(0, 10) },
  { loc: `${siteUrl}#/archive`, lastmod: new Date().toISOString().slice(0, 10) },
  { loc: `${siteUrl}#/about`, lastmod: new Date().toISOString().slice(0, 10) },
  { loc: `${siteUrl}#/tags`, lastmod: new Date().toISOString().slice(0, 10) },
  ...files.map((file) => {
    const slug = file.replace(/\.md$/, '')
    const content = readFileSync(resolve(postsDir, file), 'utf8')
    const meta = extractPostEntries(content)

    return {
      loc: `${siteUrl}#/post/${slug}`,
      lastmod: meta.date,
    }
  }),
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (item) => `  <url>\n    <loc>${item.loc}</loc>\n    <lastmod>${item.lastmod}</lastmod>\n  </url>`,
  )
  .join('\n')}
</urlset>
`

writeFileSync(outputFile, xml, 'utf8')
