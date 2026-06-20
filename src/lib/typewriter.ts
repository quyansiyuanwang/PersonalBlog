import { ref, onUnmounted, type Ref } from 'vue'

export function useTypewriter(
  text: string | Ref<string>,
  options: { speed?: number; delay?: number } = {},
) {
  const { speed = 80, delay = 0 } = options
  const displayText = ref('')
  const isTyping = ref(false)
  const isDone = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  function start() {
    const source = typeof text === 'string' ? text : text.value
    if (isDone.value) return
    isTyping.value = true
    displayText.value = ''
    let index = 0

    setTimeout(() => {
      timer = setInterval(() => {
        if (index < source.length) {
          displayText.value += source[index]
          index++
        } else {
          clearInterval(timer!)
          timer = null
          isTyping.value = false
          isDone.value = true
        }
      }, speed)
    }, delay)
  }

  function reset() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    displayText.value = ''
    isTyping.value = false
    isDone.value = false
  }

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { displayText, isTyping, isDone, start, reset }
}
