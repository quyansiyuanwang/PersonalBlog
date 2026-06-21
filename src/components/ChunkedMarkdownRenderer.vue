<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { renderMarkdown } from '../lib/markdown'

export interface HeadingItem {
  id: string
  text: string
  level: number
}

const props = defineProps<{
  source: string
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const renderedCount = ref(0)
const headings = ref<HeadingItem[]>([])
const htmlChunks = ref<string[]>([])

let idleHandle: number | null = null
let timeoutHandle: number | null = null
let lastPointerMoveAt = 0

const POINTER_GRACE_MS = 140

function splitOversizedChunk(chunk: string) {
  const maxLength = 1800

  if (chunk.length <= maxLength) {
    return [chunk]
  }

  const lines = chunk.split(/\r?\n/)
  const parts: string[] = []
  let current: string[] = []
  let inFence = false

  lines.forEach((line) => {
    if (line.trim().startsWith('```')) {
      inFence = !inFence
    }

    current.push(line)

    const currentText = current.join('\n')
    if (!inFence && !line.trim() && currentText.length >= maxLength) {
      parts.push(currentText.trim())
      current = []
    }
  })

  if (current.length) {
    parts.push(current.join('\n').trim())
  }

  return parts.filter(Boolean)
}

function splitMarkdownIntoChunks(source: string) {
  const normalized = source.replace(/\r\n/g, '\n').trim()

  if (!normalized) {
    return []
  }

  const lines = normalized.split('\n')
  const sections: string[] = []
  let current: string[] = []
  let inFence = false

  lines.forEach((line) => {
    if (line.trim().startsWith('```')) {
      inFence = !inFence
    }

    const isHeading = !inFence && /^#{1,6}\s+/.test(line)

    if (isHeading && current.length) {
      sections.push(current.join('\n').trim())
      current = [line]
      return
    }

    current.push(line)
  })

  if (current.length) {
    sections.push(current.join('\n').trim())
  }

  return sections.flatMap((section) => splitOversizedChunk(section)).filter(Boolean)
}

const chunks = computed(() => splitMarkdownIntoChunks(props.source))
const visibleHtml = computed(() => htmlChunks.value.slice(0, renderedCount.value).join('\n'))
const hasRemainingChunks = computed(() => renderedCount.value < chunks.value.length)

function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
}

const chunkHeadings = computed(() => {
  let inFence = false

  return chunks.value.map((chunk) => {
    const result: HeadingItem[] = []

    chunk.split(/\r?\n/).forEach((line) => {
      if (line.trim().startsWith('```')) {
        inFence = !inFence
        return
      }

      if (inFence) {
        return
      }

      const match = /^(#{2,3})\s+(.+)$/.exec(line)
      if (!match) {
        return
      }

      const text = match[2].replace(/[#`*_~]/g, '').trim()
      const id = slugifyHeading(text)

      if (id) {
        result.push({
          id,
          text,
          level: match[1].length,
        })
      }
    })

    return result
  })
})

function clearScheduledAppend() {
  if (idleHandle !== null && typeof window !== 'undefined') {
    const idleWindow = window as Window & {
      cancelIdleCallback?: (handle: number) => void
    }
    idleWindow.cancelIdleCallback?.(idleHandle)
    idleHandle = null
  }

  if (timeoutHandle !== null && typeof window !== 'undefined') {
    window.clearTimeout(timeoutHandle)
    timeoutHandle = null
  }
}

function syncHeadings() {
  headings.value = chunkHeadings.value.slice(0, renderedCount.value).flat()
}

function ensureRenderedChunks(nextCount: number) {
  for (let index = htmlChunks.value.length; index < nextCount; index += 1) {
    const chunk = chunks.value[index]

    if (chunk) {
      htmlChunks.value.push(renderMarkdown(chunk))
    }
  }
}

async function renderMermaid() {
  await nextTick()
  const el = containerRef.value
  if (!el) return

  const blocks = el.querySelectorAll<HTMLElement>('.mermaid:not([data-processed])')
  if (blocks.length === 0) return

  try {
    const mermaid = await import('mermaid')
    mermaid.default.initialize({ startOnLoad: false, theme: 'neutral' })
    await mermaid.default.run({ nodes: Array.from(blocks) })
  } catch {
    // mermaid failed silently — raw code is still visible
  }
}

function scheduleNextChunk() {
  clearScheduledAppend()

  if (!hasRemainingChunks.value || typeof window === 'undefined') {
    return
  }

  const append = () => {
    if (performance.now() - lastPointerMoveAt < POINTER_GRACE_MS) {
      timeoutHandle = window.setTimeout(() => {
        timeoutHandle = null
        scheduleNextChunk()
      }, POINTER_GRACE_MS)
      return
    }

    const nextCount = Math.min(renderedCount.value + 2, chunks.value.length)
    ensureRenderedChunks(nextCount)
    renderedCount.value = nextCount
    void nextTick(() => {
      syncHeadings()
      if (hasRemainingChunks.value) {
        scheduleNextChunk()
      }
    })
  }

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  }

  if (typeof idleWindow.requestIdleCallback === 'function') {
    idleHandle = idleWindow.requestIdleCallback(() => {
      idleHandle = null
      append()
    }, { timeout: 320 })
    return
  }

  timeoutHandle = window.setTimeout(() => {
    timeoutHandle = null
    append()
  }, 48)
}

function notePointerActivity() {
  lastPointerMoveAt = performance.now()
}

function resetRendering() {
  clearScheduledAppend()
  htmlChunks.value = []
  const initialCount = Math.min(chunks.value.length, 2)
  ensureRenderedChunks(initialCount)
  renderedCount.value = initialCount
  void nextTick(() => {
    syncHeadings()
    if (hasRemainingChunks.value) {
      scheduleNextChunk()
    }
  })
}

watch(chunks, () => {
  resetRendering()
}, { immediate: true })

watch(visibleHtml, () => {
  void nextTick(() => {
    syncHeadings()
    void renderMermaid()
  })
})

onMounted(() => {
  window.addEventListener('pointermove', notePointerActivity, { passive: true })
  resetRendering()
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', notePointerActivity)
  clearScheduledAppend()
})

defineExpose({ headings })
</script>

<template>
  <div class="chunked-markdown-renderer">
    <div ref="containerRef" class="markdown-wrapper markdown-body" v-html="visibleHtml"></div>

    <div v-if="hasRemainingChunks" class="chunk-progress" aria-live="polite">
      <span class="chunk-progress-bar"></span>
      <span class="chunk-progress-text">Rendering more sections...</span>
    </div>
  </div>
</template>

<style scoped>
.chunked-markdown-renderer {
  display: grid;
  gap: 0;
}

.chunk-progress {
  display: grid;
  gap: 10px;
  padding: 10px 0 4px;
}

.chunk-progress-bar {
  width: min(160px, 42%);
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  background-size: 180% 100%;
  animation: chunk-progress-scan 1.1s linear infinite;
  opacity: 0.75;
}

.chunk-progress-text {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

@keyframes chunk-progress-scan {
  0% { background-position: 180% 0; }
  100% { background-position: -20% 0; }
}
</style>