import type { InjectionKey, Ref } from 'vue'
import type { HeadingItem } from '../components/MarkdownRenderer.vue'

export interface TocData {
  headings: Ref<HeadingItem[]>
  activeId: Ref<string | null>
}

export const tocKey: InjectionKey<TocData> = Symbol('toc')
