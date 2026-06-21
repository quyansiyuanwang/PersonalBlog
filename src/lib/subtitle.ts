import { ref, onMounted, onUnmounted } from 'vue'
import { siteConfig } from './site'

export function useSubtitle(intervalMs = 1800) {
  const subtitle = ref('')
  let index = 0
  let charIndex = 0
  let deleting = false
  let timer: ReturnType<typeof setTimeout> | null = null

  function queueNextTick(delay: number) {
    timer = setTimeout(tick, delay)
  }

  function tick() {
    const source = siteConfig.subtitles[index] ?? ''

    if (!deleting) {
      charIndex += 1
      subtitle.value = source.slice(0, charIndex)

      if (charIndex >= source.length) {
        deleting = true
        queueNextTick(intervalMs)
        return
      }

      queueNextTick(72)
      return
    }

    charIndex -= 1
    subtitle.value = source.slice(0, Math.max(charIndex, 0))

    if (charIndex <= 0) {
      deleting = false
      index = (index + 1) % siteConfig.subtitles.length
      queueNextTick(360)
      return
    }

    queueNextTick(34)
  }

  onMounted(() => {
    queueNextTick(260)
  })

  onUnmounted(() => {
    if (timer) clearTimeout(timer)
  })

  return subtitle
}
