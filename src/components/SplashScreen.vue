<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { initializeStartupPreload } from '../lib/startup'

const emit = defineEmits<{ done: [] }>()

const SKIP_KEY = 'paper-scape-splash-seen'

const visible = ref(!localStorage.getItem(SKIP_KEY))
const fading = ref(false)
const bar1 = ref(0)
const bar2 = ref(0)

const lines: { text: string; done: boolean; active: boolean }[] = [
  { text: '> SYSTEM INITIALIZATION...', done: false, active: false },
  { text: '> LOADING KERNEL', done: false, active: false },
  { text: '> CHECKSUM VERIFIED', done: false, active: false },
  { text: '> BIO-SIGNAL SCAN...', done: false, active: false },
  { text: '> IDENTIFICATION: 0x1A1A', done: false, active: false },
  { text: '> SYSTEM READY.', done: false, active: false },
  { text: '> 启动完成', done: false, active: false },
]

async function startBoot() {
  const startupReady = initializeStartupPreload()

  lines[0].active = true
  await sleep(300)
  lines[0].done = true

  lines[1].active = true
  await fillBar(bar1, 67, 40)
  lines[1].done = true

  await sleep(200)
  lines[2].active = true
  await sleep(350)
  lines[2].done = true

  lines[3].active = true
  await sleep(250)
  lines[3].done = true

  lines[4].active = true
  await sleep(200)
  lines[4].done = true

  lines[5].active = true
  await sleep(300)
  lines[5].done = true

  lines[6].active = true
  await fillBar(bar2, 100, 25)
  lines[6].done = true

  await startupReady

  await sleep(250)
  // 触发淡出
  fading.value = true
  await sleep(500)
  localStorage.setItem(SKIP_KEY, '1')
  visible.value = false
  emit('done')
}

function fillBar(bar: { value: number }, target: number, interval: number) {
  return new Promise<void>((resolve) => {
    const step = Math.max(1, Math.floor(target / 12))
    const tick = setInterval(() => {
      bar.value = Math.min(bar.value + step, target)
      if (bar.value >= target) {
        clearInterval(tick)
        resolve()
      }
    }, interval)
  })
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function barString(pct: number, width = 20): string {
  const filled = Math.round((pct / 100) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

onMounted(() => {
  if (!visible.value) {
    void initializeStartupPreload(0)
    emit('done')
    return
  }
  startBoot()
})
</script>

<template>
  <div v-if="visible" class="splash-overlay" :class="{ fading }">
    <div class="splash-terminal">
      <div
        v-for="(line, i) in lines"
        :key="i"
        class="splash-line"
        :class="{ active: line.active, done: line.done }"
      >
        <span v-if="line.done || line.active">{{ line.text }}</span>
        <span v-if="line.active && !line.done" class="splash-cursor">_</span>

        <span v-if="i === 1 && line.active" class="splash-bar-text">
          {{ barString(bar1) }} {{ bar1 }}%
        </span>

        <span v-if="i === 6 && line.active" class="splash-bar-text">
          {{ barString(bar2) }} {{ bar2 }}%
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.splash-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #0a0a0a;
  display: grid;
  place-items: center;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  transition: opacity 0.5s ease;
}

.splash-overlay.fading {
  opacity: 0;
}

.splash-terminal {
  width: min(600px, 85vw);
  padding: 40px;
  display: grid;
  gap: 8px;
}

.splash-line {
  font-size: 0.95rem;
  color: color-mix(in srgb, var(--accent) 12%, transparent);
  letter-spacing: 0.04em;
  min-height: 1.6em;
  transition: color 0.3s ease;
}

.splash-line.active {
  color: color-mix(in srgb, var(--accent) 70%, transparent);
}

.splash-line.done {
  color: color-mix(in srgb, var(--accent) 90%, transparent);
}

.splash-cursor {
  animation: splash-blink 0.8s step-end infinite;
  color: var(--accent);
}

.splash-bar-text {
  margin-left: 12px;
  letter-spacing: 0;
  font-size: 0.85rem;
}

@keyframes splash-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>
