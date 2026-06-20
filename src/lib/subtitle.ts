import { ref, onMounted, onUnmounted } from 'vue'
import { siteConfig } from './site'

export function useSubtitle(intervalMs = 5000) {
  const subtitle = ref(siteConfig.subtitles[0])
  let index = 0
  let timer: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    timer = setInterval(() => {
      index = (index + 1) % siteConfig.subtitles.length
      subtitle.value = siteConfig.subtitles[index]
    }, intervalMs)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return subtitle
}
