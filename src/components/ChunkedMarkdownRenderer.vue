<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { renderMarkdown } from '../lib/markdown'

export interface HeadingItem {
  id: string
  text: string
  level: number
}

const props = defineProps<{
  source: string
  assetBase?: string
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const renderedCount = ref(0)
const headings = ref<HeadingItem[]>([])
const htmlCache = ref<string[]>([])

let idleHandle: number | null = null
let timeoutHandle: number | null = null
let lastPointerMoveAt = 0
let lastScrollAt = 0

const INITIAL_CHUNK_COUNT = 5
const CHUNKS_PER_BATCH = 3
const MAX_CHUNK_LENGTH = 1000
const POINTER_GRACE_MS = 120
const SCROLL_GRACE_MS = 120

function splitOversizedChunk(chunk: string) {
  if (chunk.length <= MAX_CHUNK_LENGTH) {
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
    if (!inFence && (!line.trim() || /^#{1,6}\s+/.test(line)) && currentText.length >= MAX_CHUNK_LENGTH) {
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
const visibleHtmlChunks = computed(() => htmlCache.value.slice(0, renderedCount.value))
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

function getIdleWindow() {
  return window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
    cancelIdleCallback?: (handle: number) => void
  }
}

function clearScheduledAppend() {
  if (idleHandle !== null && typeof window !== 'undefined') {
    getIdleWindow().cancelIdleCallback?.(idleHandle)
    idleHandle = null
  }

  if (timeoutHandle !== null && typeof window !== 'undefined') {
    window.clearTimeout(timeoutHandle)
    timeoutHandle = null
  }
}

function syncHeadings() {
  headings.value = chunkHeadings.value.flat()
}

function ensureRenderedChunks(nextCount: number) {
  const nextHtmlCache = htmlCache.value.slice()

  for (let index = htmlCache.value.length; index < nextCount; index += 1) {
    const chunk = chunks.value[index]

    if (chunk) {
      nextHtmlCache.push(renderMarkdown(chunk, { assetBase: props.assetBase }))
    }
  }

  htmlCache.value = nextHtmlCache
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

function replaceMissingImage(image: HTMLImageElement) {
  const source = image.currentSrc || image.src || image.getAttribute('src') || 'image'
  const fallback = document.createElement('span')
  fallback.className = 'markdown-image-fallback'
  fallback.textContent = `Image not found: ${source.split('/').pop() ?? source}`
  image.replaceWith(fallback)
}

function prepareImages() {
  const el = containerRef.value
  if (!el) return

  el.querySelectorAll<HTMLImageElement>('img.markdown-image:not([data-fallback-ready])').forEach((image) => {
    image.dataset.fallbackReady = 'true'
    image.addEventListener('error', () => replaceMissingImage(image), { once: true })

    if (image.complete && image.naturalWidth === 0) {
      replaceMissingImage(image)
    }
  })
}

function isUserInteracting() {
  const now = performance.now()
  return now - lastPointerMoveAt < POINTER_GRACE_MS || now - lastScrollAt < SCROLL_GRACE_MS
}

function scheduleNextChunk() {
  clearScheduledAppend()

  if (!hasRemainingChunks.value || typeof window === 'undefined') {
    return
  }

  const append = () => {
    if (isUserInteracting()) {
      timeoutHandle = window.setTimeout(() => {
        timeoutHandle = null
        scheduleNextChunk()
      }, Math.max(POINTER_GRACE_MS, SCROLL_GRACE_MS))
      return
    }

    const nextCount = Math.min(renderedCount.value + CHUNKS_PER_BATCH, chunks.value.length)
    ensureRenderedChunks(nextCount)
    renderedCount.value = nextCount

    void nextTick(() => {
      prepareImages()
      void renderMermaid()
      if (hasRemainingChunks.value) {
        scheduleNextChunk()
      }
    })
  }

  const idleWindow = getIdleWindow()

  if (typeof idleWindow.requestIdleCallback === 'function') {
    idleHandle = idleWindow.requestIdleCallback(() => {
      idleHandle = null
      append()
    }, { timeout: 180 })
    return
  }

  timeoutHandle = window.setTimeout(() => {
    timeoutHandle = null
    append()
  }, 32)
}

function notePointerActivity() {
  lastPointerMoveAt = performance.now()
}

function noteScrollActivity() {
  lastScrollAt = performance.now()
}

function resetRendering() {
  clearScheduledAppend()
  htmlCache.value = []
  const initialCount = Math.min(chunks.value.length, INITIAL_CHUNK_COUNT)
  ensureRenderedChunks(initialCount)
  renderedCount.value = initialCount
  syncHeadings()

  void nextTick(() => {
    prepareImages()
    void renderMermaid()
    if (hasRemainingChunks.value) {
      scheduleNextChunk()
    }
  })
}

function ensureHeadingVisible(id: string) {
  const index = chunkHeadings.value.findIndex((items) => items.some((item) => item.id === id))

  if (index < 0 || index < renderedCount.value) {
    return
  }

  clearScheduledAppend()
  const nextCount = Math.min(chunks.value.length, index + 1)
  ensureRenderedChunks(nextCount)
  renderedCount.value = nextCount

  void nextTick(() => {
    prepareImages()
    void renderMermaid()
    if (hasRemainingChunks.value) {
      scheduleNextChunk()
    }
  })
}

watch([chunks, () => props.assetBase], () => {
  resetRendering()
}, { immediate: true })

if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', notePointerActivity, { passive: true })
  window.addEventListener('scroll', noteScrollActivity, { passive: true, capture: true })
}

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointermove', notePointerActivity)
    window.removeEventListener('scroll', noteScrollActivity, { capture: true })
  }
  clearScheduledAppend()
})

defineExpose({ headings, ensureHeadingVisible })
</script>

<template>
  <div class="chunked-markdown-renderer">
    <div ref="containerRef" class="markdown-wrapper markdown-body">
      <div
        v-for="(html, index) in visibleHtmlChunks"
        :key="index"
        class="markdown-chunk"
        v-html="html"
      ></div>
    </div>

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
  background: var(--accent);
  opacity: 0.55;
}

.chunk-progress-text {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.markdown-chunk {
  content-visibility: auto;
  contain-intrinsic-size: auto 520px;
}
</style>
