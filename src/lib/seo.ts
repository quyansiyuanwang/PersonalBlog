import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { getPostBySlug } from './posts'
import { siteConfig } from './site'

interface SeoPayload {
  description: string
  image: string
  keywords: string[]
  title: string
  type: 'article' | 'website'
  url: string
}

function withTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`
}

function getBaseSiteUrl() {
  const configured = siteConfig.siteUrl

  if (/^https?:\/\//.test(configured)) {
    return withTrailingSlash(configured)
  }

  return new URL(configured || '/', window.location.origin).toString()
}

function buildAbsoluteUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path
  }

  if (path.startsWith('/')) {
    return new URL(path, window.location.origin).toString()
  }

  return new URL(path.replace(/^\//, ''), getBaseSiteUrl()).toString()
}

function buildRouteUrl(to: RouteLocationNormalizedLoaded) {
  const hashPath = to.fullPath === '/' ? '#/' : `#${to.fullPath}`
  return `${getBaseSiteUrl()}${hashPath}`
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)

  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, key)
    document.head.appendChild(tag)
  }

  tag.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)

  if (!tag) {
    tag = document.createElement('link')
    tag.setAttribute('rel', rel)
    document.head.appendChild(tag)
  }

  tag.setAttribute('href', href)
}

function upsertStructuredData(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
  const id = 'site-structured-data'
  let tag = document.getElementById(id) as HTMLScriptElement | null

  if (!tag) {
    tag = document.createElement('script')
    tag.id = id
    tag.type = 'application/ld+json'
    document.head.appendChild(tag)
  }

  tag.textContent = JSON.stringify(payload)
}

function getDefaultSeo(to: RouteLocationNormalizedLoaded): SeoPayload {
  const sectionTitle = typeof to.meta.title === 'string' ? `${to.meta.title} · ${siteConfig.title}` : siteConfig.title
  const description = typeof to.meta.description === 'string' ? to.meta.description : siteConfig.description

  return {
    title: sectionTitle,
    description,
    keywords: [...siteConfig.keywords],
    image: buildAbsoluteUrl(siteConfig.socialImage),
    type: 'website',
    url: buildRouteUrl(to),
  }
}

function getStructuredData(to: RouteLocationNormalizedLoaded, seo: SeoPayload) {
  if (to.name === 'post-detail') {
    const post = getPostBySlug(String(to.params.slug ?? ''))

    if (post) {
      return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        author: {
          '@type': 'Person',
          name: siteConfig.author,
        },
        dateModified: post.frontmatter.date,
        datePublished: post.frontmatter.date,
        description: post.frontmatter.summary,
        headline: post.frontmatter.title,
        image: seo.image,
        keywords: post.frontmatter.tags.join(', '),
        mainEntityOfPage: seo.url,
        publisher: {
          '@type': 'Person',
          name: siteConfig.author,
        },
      }
    }
  }

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      description: siteConfig.description,
      inLanguage: siteConfig.locale,
      name: siteConfig.title,
      url: getBaseSiteUrl(),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      email: siteConfig.email,
      image: buildAbsoluteUrl(siteConfig.socialImage),
      name: siteConfig.author,
      url: getBaseSiteUrl(),
    },
  ]
}

export function applyRouteSeo(to: RouteLocationNormalizedLoaded) {
  const seo = getDefaultSeo(to)

  if (to.name === 'post-detail') {
    const post = getPostBySlug(String(to.params.slug ?? ''))

    if (post) {
      seo.title = `${post.frontmatter.title} · ${siteConfig.title}`
      seo.description = post.frontmatter.summary
      seo.keywords = [...siteConfig.keywords, ...post.frontmatter.tags]
      seo.type = 'article'
    }
  }

  if (to.name === 'tags' && typeof to.params.tag === 'string') {
    const tag = decodeURIComponent(to.params.tag)
    seo.title = `${tag} · ${siteConfig.title}`
    seo.description = `浏览与 ${tag} 相关的文章与主题。`
    seo.keywords = [...siteConfig.keywords, tag]
  }

  document.title = seo.title
  upsertMeta('name', 'description', seo.description)
  upsertMeta('name', 'keywords', seo.keywords.join(', '))
  upsertMeta('name', 'author', siteConfig.author)
  upsertMeta('name', 'robots', 'index,follow')
  upsertMeta('name', 'theme-color', '#f4efe7')
  upsertMeta('property', 'og:locale', siteConfig.locale)
  upsertMeta('property', 'og:title', seo.title)
  upsertMeta('property', 'og:description', seo.description)
  upsertMeta('property', 'og:type', seo.type)
  upsertMeta('property', 'og:url', seo.url)
  upsertMeta('property', 'og:image', seo.image)
  upsertMeta('property', 'og:site_name', siteConfig.title)
  upsertMeta('name', 'twitter:card', 'summary_large_image')
  upsertMeta('name', 'twitter:title', seo.title)
  upsertMeta('name', 'twitter:description', seo.description)
  upsertMeta('name', 'twitter:image', seo.image)
  upsertLink('canonical', seo.url)
  upsertStructuredData(getStructuredData(to, seo))
}
