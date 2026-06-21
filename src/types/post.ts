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
  excerpt: string
  readingTime: number
}

export interface PostDetail extends Post {
  content: string
}

export interface ArchiveGroup {
  year: string
  posts: Post[]
}
