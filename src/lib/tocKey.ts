import { computed, ref } from 'vue'
import type { HeadingItem } from '../components/MarkdownRenderer.vue'

export interface TocReadyState {
  ready: boolean
  indexed: number
  total: number
  readyIds: Set<string>
}

const tocHeadings = ref<HeadingItem[]>([])
const tocActiveId = ref<string | null>(null)
const tocReadyState = ref<TocReadyState>({
  ready: false,
  indexed: 0,
  total: 0,
  readyIds: new Set(),
})
const pendingHeadingRequest = ref<string | null>(null)

export function useTocState() {
  return {
    headings: computed(() => tocHeadings.value),
    activeId: computed(() => tocActiveId.value),
    showToc: computed(() => tocHeadings.value.length > 0),
    readyState: computed(() => tocReadyState.value),
    pendingHeadingRequest: computed(() => pendingHeadingRequest.value),
  }
}

export function setTocData(
  headings: HeadingItem[],
  activeId: string | null,
  readyState?: TocReadyState,
) {
  tocHeadings.value = headings
  tocActiveId.value = activeId

  if (readyState) {
    tocReadyState.value = readyState
  }
}

export function clearTocData() {
  tocHeadings.value = []
  tocActiveId.value = null
  tocReadyState.value = {
    ready: false,
    indexed: 0,
    total: 0,
    readyIds: new Set(),
  }
  pendingHeadingRequest.value = null
}

export function requestHeadingVisible(id: string) {
  pendingHeadingRequest.value = `${id}:${Date.now()}`
}
