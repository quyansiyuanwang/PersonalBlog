<script setup lang="ts">
import { onMounted } from 'vue'
import { initializeStartupPreload } from '../lib/startup'

const emit = defineEmits<{ done: [] }>()

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

onMounted(async () => {
  await initializeStartupPreload()

  const placeholder = document.getElementById('startup-placeholder')
  if (placeholder) {
    placeholder.classList.add('placeholder-hidden')
    await sleep(520)
    placeholder.remove()
  }

  emit('done')
})
</script>

<template></template>
