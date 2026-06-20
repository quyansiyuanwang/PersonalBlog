export interface PostFrontmatter {
  title: string
  date: string
  summary: string
  tags: string[]
  cover?: string
  draft?: boolean
}

export interface Post {
  slug: string
  frontmatter: PostFrontmatter
  content: string
  excerpt: string
  readingTime: number
}

export interface ArchiveGroup {
  year: string
  posts: Post[]
}
