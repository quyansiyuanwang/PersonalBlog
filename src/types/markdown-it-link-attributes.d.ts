declare module 'markdown-it-link-attributes' {
  import type { PluginWithOptions } from 'markdown-it'

  interface LinkAttributesOptions {
    matcher?: (href: string) => boolean
    attrs?: Record<string, string>
  }

  const plugin: PluginWithOptions<LinkAttributesOptions>
  export default plugin
}
