import { aboutPage, allPosts, portfolioPage } from './content'
import type { ArchiveGroup, Post } from '../types/post'

export function getAllPosts() {
  return allPosts
}

export function getFeaturedPosts(limit = 3) {
  return allPosts.slice(0, limit)
}

export function getPostBySlug(slug: string) {
  return allPosts.find((post) => post.slug === slug)
}

export function getRelatedPosts(currentSlug: string, limit = 2) {
  return allPosts.filter((post) => post.slug !== currentSlug).slice(0, limit)
}

export function getArchiveGroups(): ArchiveGroup[] {
  const groups = allPosts.reduce<Record<string, Post[]>>((result, post) => {
    const year = new Date(post.frontmatter.date).getFullYear().toString()
    result[year] ??= []
    result[year].push(post)
    return result
  }, {})

  return Object.entries(groups)
    .sort(([left], [right]) => Number(right) - Number(left))
    .map(([year, posts]) => ({
      year,
      posts: posts.sort((left, right) => +new Date(right.frontmatter.date) - +new Date(left.frontmatter.date)),
    }))
}

export function getTagMap() {
  return allPosts.reduce<Record<string, Post[]>>((result, post) => {
    post.frontmatter.tags.forEach((tag) => {
      result[tag] ??= []
      result[tag].push(post)
    })

    return result
  }, {})
}

export function getPostsByTag(tag: string) {
  return getTagMap()[tag] ?? []
}

export function getAboutContent() {
  return aboutPage.content
}

export function getPortfolioContent() {
  return portfolioPage.content
}
