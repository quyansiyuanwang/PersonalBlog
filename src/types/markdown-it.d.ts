declare module 'markdown-it' {
  export interface RenderRule {
    (...args: unknown[]): string
  }

  export interface PluginSimple {
    (md: MarkdownIt): void
  }

  export interface PluginWithOptions<T = unknown> {
    (md: MarkdownIt, options?: T): void
  }

  export interface MarkdownItOptions {
    html?: boolean
    linkify?: boolean
    typographer?: boolean
    highlight?: (code: string, language: string) => string
  }

  export interface MarkdownItUtils {
    escapeHtml(source: string): string
  }

  export default class MarkdownIt {
    constructor(options?: MarkdownItOptions)
    utils: MarkdownItUtils
    render(source: string): string
    use(plugin: PluginSimple): this
    use<T>(plugin: PluginWithOptions<T>, options?: T): this
  }
}