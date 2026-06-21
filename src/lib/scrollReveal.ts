import { ref, onUnmounted } from 'vue'

export function useScrollReveal(options: { threshold?: number; rootMargin?: string } = {}) {
  const { threshold = 0, rootMargin = '0px 0px -20px 0px' } = options
  const elements = ref<HTMLElement[]>([])
  const observer = ref<IntersectionObserver | null>(null)

  observer.value = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed')
          observer.value?.unobserve(entry.target)
        }
      })
    },
    { threshold, rootMargin },
  )

  function observe(el: unknown) {
    if (!(el instanceof HTMLElement)) return
    elements.value.push(el)
    observer.value?.observe(el)
  }

  onUnmounted(() => {
    observer.value?.disconnect()
  })

  return { observe, elements }
}

export function useScrollCounter() {
  const scrollPercent = ref(0)
  const displayText = ref('00 // 100')

  let ticking = false
  function update() {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const pct = docHeight > 0 ? Math.min(Math.round((scrollTop / docHeight) * 100), 100) : 0
    scrollPercent.value = pct
    displayText.value = `${String(pct).padStart(2, '0')} <span class="path-sep">//</span> 100`
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        update()
        ticking = false
      })
      ticking = true
    }
  }

  function start() {
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
  }

  function stop() {
    window.removeEventListener('scroll', onScroll)
  }

  return { scrollPercent, displayText, start, stop }
}
