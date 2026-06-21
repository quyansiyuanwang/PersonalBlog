<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { renderMarkdown } from '../lib/markdown'

export interface HeadingItem {
  id: string
  text: string
  level: number
}

interface VisibleChunk {
  index: number
  html: string
}

const props = defineProps<{
  source: string
  assetBase?: string
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const renderedCount = ref(0)
const rangeStart = ref(0)
const rangeEnd = ref(0)
const headings = ref<HeadingItem[]>([])
const htmlCache = ref<string[]>([])
const chunkHeights = ref<number[]>([])

let idleHandle: number | null = null
let timeoutHandle: number | null = null
let scrollAnimationFrame: number | null = null
let postRenderAnimationFrame: number | null = null
let lastPointerMoveAt = 0
let lastScrollAt = 0
let activeScrollParent: HTMLElement | Window | null = null

const INITIAL_CHUNK_COUNT = 8
const CHUNKS_PER_BATCH = 4
const SCROLL_CATCH_UP_BATCH = 12
const MAX_CHUNK_LENGTH = 900
const DEFAULT_CHUNK_HEIGHT = 520
const OVERSCAN_PX = 1800
const POINTER_GRACE_MS = 100
const SCROLL_GRACE_MS = 80

const chunks = computed(() => splitMarkdownIntoChunks(props.source))
const hasRemainingChunks = computed(() => renderedCount.value < chunks.value.length)
const visibleChunks = computed<VisibleChunk[]>(() => {
  const result: VisibleChunk[] = []

  for (let index = 0; index < renderedCount.value; index += 1) {
    const html = htmlCache.value[index]

    if (html) {
      result.push({ index, html })
    }
  }

  return result
})
const visibleChunkKey = computed(() => `${rangeStart.value}:${rangeEnd.value}:${renderedCount.value}`)

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
  const safeCount = Math.min(nextCount, chunks.value.length)
  const nextHtmlCache = htmlCache.value.slice()

  for (let index = htmlCache.value.length; index < safeCount; index += 1) {
    const chunk = chunks.value[index]

    if (chunk) {
      nextHtmlCache.push(renderMarkdown(chunk, { assetBase: props.assetBase }))
    }
  }

  htmlCache.value = nextHtmlCache
  renderedCount.value = Math.max(renderedCount.value, safeCount)
}

async function renderMermaid() {
  await nextTick()
  const el = containerRef.value
  if (!el) return

  const blocks = el.querySelectorAll<HTMLElement>('.mermaid:not([data-processed])')
  if (blocks.length === 0) return

  try {
    const mermaid = await import('mermaid')
    mermaid.default.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' })

    await Promise.all(Array.from(blocks).map(async (block, index) => {
      const source = block.textContent?.trim() ?? ''

      if (!source) {
        return
      }

      try {
        const id = `mermaid-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`
        const { svg, bindFunctions } = await mermaid.default.render(id, source)
        block.innerHTML = svg
        block.dataset.processed = 'true'
        bindFunctions?.(block)
      } catch (error) {
        block.classList.add('mermaid-error')
        block.dataset.processed = 'true'
        block.textContent = source
        console.warn('Mermaid render failed:', error)
      }
    }))

    scheduleMeasureVisibleChunks()
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
    image.addEventListener('load', scheduleMeasureVisibleChunks, { once: true })

    if (image.complete && image.naturalWidth === 0) {
      replaceMissingImage(image)
    }
  })
}

function findScrollParent(element: HTMLElement) {
  let current = element.parentElement

  while (current) {
    const style = window.getComputedStyle(current)
    const canScroll = /(auto|scroll)/.test(`${style.overflowY}${style.overflow}`)

    if (canScroll && current.scrollHeight > current.clientHeight) {
      return current
    }

    current = current.parentElement
  }

  return null
}

function getScrollParent() {
  const container = containerRef.value
  return container ? findScrollParent(container) : null
}

function getScrollMetrics() {
  const scroller = getScrollParent()

  if (scroller) {
    return {
      scrollTop: scroller.scrollTop,
      viewportHeight: scroller.clientHeight,
    }
  }

  return {
    scrollTop: window.scrollY,
    viewportHeight: window.innerHeight,
  }
}

function getOffsetForIndex(index: number) {
  let offset = 0
  const max = Math.min(index, chunkHeights.value.length)

  for (let current = 0; current < max; current += 1) {
    offset += chunkHeights.value[current] ?? DEFAULT_CHUNK_HEIGHT
  }

  return offset
}

function findIndexForOffset(offset: number) {
  let currentOffset = 0
  const heights = chunkHeights.value

  for (let index = 0; index < renderedCount.value; index += 1) {
    const nextOffset = currentOffset + (heights[index] ?? DEFAULT_CHUNK_HEIGHT)

    if (nextOffset >= offset) {
      return index
    }

    currentOffset = nextOffset
  }

  return Math.max(0, renderedCount.value - 1)
}

function updateVisibleRange() {
  if (renderedCount.value === 0) {
    rangeStart.value = 0
    rangeEnd.value = 0
    return
  }

  const { scrollTop, viewportHeight } = getScrollMetrics()
  const start = findIndexForOffset(Math.max(0, scrollTop - OVERSCAN_PX))
  const end = Math.min(renderedCount.value, findIndexForOffset(scrollTop + viewportHeight + OVERSCAN_PX) + 1)

  rangeStart.value = start
  rangeEnd.value = Math.max(end, start + 1)
}

function measureVisibleChunks() {
  const el = containerRef.value
  if (!el) return

  const nextHeights = chunkHeights.value.slice()
  let changed = false

  el.querySelectorAll<HTMLElement>('[data-chunk-index]').forEach((chunk) => {
    const index = Number(chunk.dataset.chunkIndex)
    const height = Math.max(1, Math.ceil(chunk.getBoundingClientRect().height))

    if (Number.isFinite(index) && nextHeights[index] !== height) {
      nextHeights[index] = height
      changed = true
    }
  })

  if (changed) {
    chunkHeights.value = nextHeights
    updateVisibleRange()
  }
}

function scheduleMeasureVisibleChunks() {
  if (typeof window === 'undefined') return

  window.requestAnimationFrame(() => {
    measureVisibleChunks()
  })
}

function schedulePostRenderWork() {
  if (postRenderAnimationFrame !== null || typeof window === 'undefined') {
    return
  }

  postRenderAnimationFrame = window.requestAnimationFrame(() => {
    postRenderAnimationFrame = null
    prepareImages()
    void renderMermaid()
    scheduleMeasureVisibleChunks()
  })
}

function scheduleVisibleRangeUpdate() {
  if (scrollAnimationFrame !== null || typeof window === 'undefined') {
    return
  }

  scrollAnimationFrame = window.requestAnimationFrame(() => {
    scrollAnimationFrame = null
    updateVisibleRange()
    scheduleMeasureVisibleChunks()
    maybeRenderAheadForScroll()
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

    ensureRenderedChunks(renderedCount.value + CHUNKS_PER_BATCH)
    updateVisibleRange()

    void nextTick(() => {
      schedulePostRenderWork()
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
    }, { timeout: 140 })
    return
  }

  timeoutHandle = window.setTimeout(() => {
    timeoutHandle = null
    append()
  }, 24)
}

function maybeRenderAheadForScroll() {
  if (!hasRemainingChunks.value) {
    return
  }

  const { scrollTop, viewportHeight } = getScrollMetrics()
  const loadedBottom = containerRef.value?.scrollHeight ?? getOffsetForIndex(renderedCount.value)

  if (scrollTop + viewportHeight + OVERSCAN_PX > loadedBottom) {
    ensureRenderedChunks(renderedCount.value + SCROLL_CATCH_UP_BATCH)
    updateVisibleRange()
    return
  }

  if (loadedBottom - (scrollTop + viewportHeight) < OVERSCAN_PX * 1.5) {
    ensureRenderedChunks(renderedCount.value + CHUNKS_PER_BATCH)
    updateVisibleRange()
  }
}

function notePointerActivity() {
  lastPointerMoveAt = performance.now()
}

function noteScrollActivity() {
  lastScrollAt = performance.now()
  scheduleVisibleRangeUpdate()
}

function bindScrollParent() {
  const nextScrollParent = getScrollParent() ?? window

  if (activeScrollParent === nextScrollParent) {
    return
  }

  if (activeScrollParent) {
    activeScrollParent.removeEventListener('scroll', noteScrollActivity)
  }

  activeScrollParent = nextScrollParent
  activeScrollParent.addEventListener('scroll', noteScrollActivity, { passive: true })
}

function resetRendering() {
  clearScheduledAppend()
  htmlCache.value = []
  renderedCount.value = 0
  rangeStart.value = 0
  rangeEnd.value = 0
  chunkHeights.value = chunks.value.map(() => DEFAULT_CHUNK_HEIGHT)

  const initialCount = Math.min(chunks.value.length, INITIAL_CHUNK_COUNT)
  ensureRenderedChunks(initialCount)
  rangeEnd.value = initialCount
  syncHeadings()

  void nextTick(() => {
    bindScrollParent()
    updateVisibleRange()
    schedulePostRenderWork()
    if (hasRemainingChunks.value) {
      scheduleNextChunk()
    }
  })
}

function ensureHeadingVisible(id: string) {
  const index = chunkHeadings.value.findIndex((items) => items.some((item) => item.id === id))

  if (index < 0) {
    return
  }

  clearScheduledAppend()
  ensureRenderedChunks(index + 1)
  rangeStart.value = Math.max(0, index - 2)
  rangeEnd.value = Math.min(renderedCount.value, index + 6)

  void nextTick(() => {
    schedulePostRenderWork()
    if (hasRemainingChunks.value) {
      scheduleNextChunk()
    }
  })
}

function scrollToAnchor(id: string) {
  const target = document.getElementById(id)
  const container = containerRef.value

  if (!target || !container) {
    return
  }

  const scroller = getScrollParent()

  if (!scroller) {
    const statusBarHeight = document.querySelector<HTMLElement>('.status-bar')?.offsetHeight ?? 0
    const top = target.getBoundingClientRect().top + window.scrollY - statusBarHeight - 16
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    return
  }

  const scrollerTop = scroller.getBoundingClientRect().top
  const targetTop = target.getBoundingClientRect().top
  scroller.scrollTo({
    top: scroller.scrollTop + targetTop - scrollerTop - 12,
    behavior: 'smooth',
  })
}

function handleMarkdownClick(event: MouseEvent) {
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]')

  if (!link) {
    return
  }

  const id = decodeURIComponent(link.hash.slice(1))
  if (!id) {
    return
  }

  event.preventDefault()
  ensureHeadingVisible(id)

  void nextTick(() => {
    scrollToAnchor(id)
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${encodeURIComponent(id)}`)
  })
}

watch([chunks, () => props.assetBase], () => {
  resetRendering()
}, { immediate: true })

watch(visibleChunkKey, () => {
  void nextTick(() => {
    schedulePostRenderWork()
  })
})

if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', notePointerActivity, { passive: true })
}

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointermove', notePointerActivity)

    if (scrollAnimationFrame !== null) {
      window.cancelAnimationFrame(scrollAnimationFrame)
    }

    if (postRenderAnimationFrame !== null) {
      window.cancelAnimationFrame(postRenderAnimationFrame)
    }
  }

  if (activeScrollParent) {
    activeScrollParent.removeEventListener('scroll', noteScrollActivity)
  }

  clearScheduledAppend()
})

defineExpose({ headings, ensureHeadingVisible })
</script>

<template>
  <div class="chunked-markdown-renderer">
    <div ref="containerRef" class="markdown-wrapper markdown-body" @click="handleMarkdownClick">
      <div
        v-for="chunk in visibleChunks"
        :key="chunk.index"
        class="markdown-chunk"
        :data-chunk-index="chunk.index"
        v-html="chunk.html"
      ></div>
    </div>

    <div v-if="hasRemainingChunks" class="chunk-progress" aria-live="polite">
      <span class="chunk-progress-bar"></span>
      <span class="chunk-progress-text">Preparing more sections...</span>
    </div>
  </div>
</template>

<style scoped>
.chunked-markdown-renderer {
  display: grid;
  gap: 0;
  min-width: 0;
  max-width: 100%;
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

.markdown-spacer {
  min-height: 1px;
  pointer-events: none;
}

.markdown-chunk {
  min-width: 0;
  max-width: 100%;
}
</style>
