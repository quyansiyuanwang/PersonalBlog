import { computed, ref } from 'vue'
import type { HeadingItem } from '../components/MarkdownRenderer.vue'

const tocHeadings = ref<HeadingItem[]>([])
const tocActiveId = ref<string | null>(null)

export function useTocState() {
  return {
    headings: computed(() => tocHeadings.value),
    activeId: computed(() => tocActiveId.value),
    showToc: computed(() => tocHeadings.value.length > 0),
  }
}

export function setTocData(headings: HeadingItem[], activeId: string | null) {
  tocHeadings.value = headings
  tocActiveId.value = activeId
}

export function clearTocData() {
  tocHeadings.value = []
  tocActiveId.value = null
}
