import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue'
import type { HeadingItem } from '../components/MarkdownRenderer.vue'

export function useScrollSpy(headings: Ref<HeadingItem[]>, offset = 80) {
  const activeId = ref<string | null>(null)

  let observer: IntersectionObserver | null = null

  function setupObserver() {
    observer?.disconnect()

    if (headings.value.length === 0) return

    observer = new IntersectionObserver(
      (entries) => {
        // Collect all currently visible headings
        const visible = new Set<string>()
        for (const entry of entries) {
          const id = entry.target.id
          if (id) {
            if (entry.isIntersecting) {
              visible.add(id)
            } else {
              visible.delete(id)
            }
          }
        }

        if (visible.size === 0) return

        // Pick the first visible heading in document order
        for (const h of headings.value) {
          if (visible.has(h.id)) {
            activeId.value = h.id
            return
          }
        }
      },
      { rootMargin: `-${offset}px 0px -60% 0px`, threshold: 0 },
    )

    // Observe heading elements — they may not be in DOM yet, retry once
    let allFound = true
    for (const h of headings.value) {
      const el = document.getElementById(h.id)
      if (el) {
        observer.observe(el)
      } else {
        allFound = false
      }
    }

    // If some headings aren't in DOM yet (e.g. still rendering), retry after next tick
    if (!allFound) {
      setTimeout(() => {
        if (!observer) return
        for (const h of headings.value) {
          const el = document.getElementById(h.id)
          if (el) observer.observe(el)
        }
      }, 100)
    }
  }

  onMounted(() => {
    setupObserver()
  })

  // Rebuild observer when headings list changes (e.g. route change)
  watch(headings, () => {
    activeId.value = null
    setupObserver()
  })

  onUnmounted(() => {
    observer?.disconnect()
  })

  return { activeId }
}
