import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import linkAttributes from 'markdown-it-link-attributes'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdownLanguage from 'highlight.js/lib/languages/markdown'
import plaintext from 'highlight.js/lib/languages/plaintext'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import yaml from 'highlight.js/lib/languages/yaml'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('markdown', markdownLanguage)
hljs.registerLanguage('md', markdownLanguage)
hljs.registerLanguage('plaintext', plaintext)
hljs.registerLanguage('text', plaintext)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('vue', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)

const markdown: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(code: string, language: string): string {
    // mermaid is handled by the custom fence below
    if (language === 'mermaid') {
      return `<div class="mermaid">${markdown.utils.escapeHtml(code)}</div>`
    }

    if (language && hljs.getLanguage(language)) {
      return `<pre class="hljs"><code>${hljs.highlight(code, { language }).value}</code></pre>`
    }

    return `<pre class="hljs"><code>${markdown.utils.escapeHtml(code)}</code></pre>`
  },
})

// Custom fence for mermaid — outputs raw content inside a div
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mdAny = markdown as any
const defaultFence = mdAny.renderer.rules.fence!
mdAny.renderer.rules.fence = (tokens: any[], idx: number, options: any, env: any, self: any) => {
  const token = tokens[idx]
  const lang = token.info.trim().split(/\s+/g)[0]
  if (lang === 'mermaid') {
    return `<div class="mermaid">${token.content}</div>`
  }
  return defaultFence(tokens, idx, options, env, self)
}

markdown.use(anchor, {
  level: [2, 3],
  slugify(text: string) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
      .replace(/\s+/g, '-')
  },
})

markdown.use(linkAttributes, {
  matcher(href: string) {
    return /^https?:\/\//.test(href)
  },
  attrs: {
    target: '_blank',
    rel: 'noopener noreferrer',
  },
})

export function renderMarkdown(source: string) {
  return markdown.render(source)
}
