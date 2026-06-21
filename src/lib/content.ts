import { parseFrontmatter } from './frontmatter'
import type { Post, PostFrontmatter } from '../types/post'
import { rawPageModules, rawPostModules } from '../generated/content'

function normalizeFrontmatter(data: Record<string, unknown>, fallbackTitle: string): PostFrontmatter {
  const title = typeof data.title === 'string' && data.title.trim().length > 0 ? data.title.trim() : fallbackTitle
  const date = typeof data.date === 'string' ? data.date : new Date().toISOString().slice(0, 10)
  const summary =
    typeof data.summary === 'string' && data.summary.trim().length > 0
      ? data.summary.trim()
      : '这篇文章还没有摘要，但它已经在等待一次安静的阅读。'
  const tags = Array.isArray(data.tags)
    ? data.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
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

function stripMarkdown(source: string) {
  return source
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '$1')
    .replace(/[>#*_~-]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
}

function estimateReadingTime(text: string) {
  const characterCount = stripMarkdown(text).length
  return Math.max(1, Math.round(characterCount / 320))
}

function parsePost(filePath: string, raw: string): Post {
  const slug = filePath.split('/').pop()?.replace(/\.md$/, '') ?? `post-${Date.now()}`
  const { data, content } = parseFrontmatter(raw)
  const frontmatter = normalizeFrontmatter(data, slug)
  const excerpt = stripMarkdown(content).slice(0, 160)

  return {
    slug,
    frontmatter,
    content,
    excerpt,
    readingTime: estimateReadingTime(content),
  }
}

export const allPosts = Object.entries(rawPostModules)
  .map(([filePath, raw]) => parsePost(filePath, raw))
  .filter((post) => !post.frontmatter.draft)
  .sort((left, right) => +new Date(right.frontmatter.date) - +new Date(left.frontmatter.date))

export const pageContent = Object.fromEntries(
  Object.entries(rawPageModules).map(([filePath, raw]) => {
    const slug = filePath.split('/').pop()?.replace(/\.md$/, '') ?? filePath

    return [slug, parseFrontmatter(raw)]
  }),
)
