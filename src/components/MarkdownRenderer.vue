<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
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
const headings = ref<HeadingItem[]>([])
const html = computed(() => renderMarkdown(props.source, { assetBase: props.assetBase }))

function extractHeadings() {
  const el = containerRef.value
  if (!el) return
  const result: HeadingItem[] = []
  const hs = el.querySelectorAll<HTMLElement>('h1, h2, h3')
  hs.forEach((h) => {
    let id = h.id
    // If no id, generate one from text
    if (!id) {
      id = h.textContent
        ?.toLowerCase()
        .trim()
        .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
        .replace(/\s+/g, '-') ?? ''
      if (id) h.id = id
    }
    if (id) {
      result.push({
        id,
        text: h.textContent?.trim() ?? '',
        level: Number(h.tagName.charAt(1)),
      })
    }
  })
  headings.value = result
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

onMounted(() => {
  prepareImages()
  renderMermaid()
  extractHeadings()
})

watch(html, () => {
  nextTick(() => prepareImages())
  renderMermaid()
  // headings may render after mermaid, wait for DOM update
  nextTick(() => extractHeadings())
})

defineExpose({ headings })
</script>

<template>
  <div ref="containerRef" class="markdown-wrapper markdown-body" v-html="html"></div>
</template>
