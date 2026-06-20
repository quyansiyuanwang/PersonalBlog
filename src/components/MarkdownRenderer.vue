<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { renderMarkdown } from '../lib/markdown'

const props = defineProps<{
  source: string
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const html = computed(() => renderMarkdown(props.source))

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

onMounted(() => {
  renderMermaid()
})

watch(html, () => {
  renderMermaid()
})
</script>

<template>
  <div ref="containerRef" class="markdown-wrapper markdown-body" v-html="html"></div>
</template>
