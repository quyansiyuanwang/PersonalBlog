<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useAudioSignal } from '../lib/audioSignal'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const { bars, mode } = useAudioSignal()

let animationFrameId: number | null = null
let resizeObserver: ResizeObserver | null = null
let canvasWidth = 0
let canvasHeight = 0
let devicePixelRatioValue = 1
let idlePhase = 0

const BAR_COUNT = 32
const BAR_GAP = 2

function resolveCssColor(varName: string): string {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || 'rgba(184, 255, 202, 0.8)'
  } catch {
    return 'rgba(184, 255, 202, 0.8)'
  }
}

function draw() {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  ctx.setTransform(devicePixelRatioValue, 0, 0, devicePixelRatioValue, 0, 0)
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  const isIdle = mode.value === 'IDLE'
  const color = resolveCssColor('--fui-cyan')

  const barCount = bars.length
  const totalGap = (barCount > 1) ? (barCount - 1) * BAR_GAP : 0
  const barWidth = Math.max(2, (canvasWidth - totalGap) / barCount)

  for (let i = 0; i < barCount; i++) {
    let heightPercent = bars[i] ?? 0

    if (isIdle) {
      heightPercent += Math.sin(idlePhase + i * 0.4) * 10
    }

    const barHeight = Math.max(1, (heightPercent / 100) * canvasHeight)
    const x = i * (barWidth + BAR_GAP)
    const y = canvasHeight - barHeight

    const gradient = ctx.createLinearGradient(0, y, 0, canvasHeight)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.shadowColor = 'rgba(64, 224, 208, 0.18)'
    ctx.shadowBlur = 8
    ctx.fillRect(x, y, barWidth, barHeight)
  }

  ctx.shadowBlur = 0
  idlePhase += 0.03
  animationFrameId = requestAnimationFrame(draw)
}

function startLoop() {
  if (animationFrameId !== null) return
  idlePhase = 0
  animationFrameId = requestAnimationFrame(draw)
}

function stopLoop() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  devicePixelRatioValue = Math.min(window.devicePixelRatio || 1, 2)
  canvasWidth = rect.width
  canvasHeight = rect.height
  canvas.width = Math.max(1, Math.floor(rect.width * devicePixelRatioValue))
  canvas.height = Math.max(1, Math.floor(rect.height * devicePixelRatioValue))
}

onMounted(() => {
  resizeCanvas()
  resizeObserver = new ResizeObserver(() => {
    resizeCanvas()
  })
  const canvas = canvasRef.value
  if (canvas) {
    resizeObserver.observe(canvas)
  }
  startLoop()
})

onBeforeUnmount(() => {
  stopLoop()
  resizeObserver?.disconnect()
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="signal-wave-canvas"
    aria-hidden="true"
  ></canvas>
</template>

<style scoped>
.signal-wave-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}
</style>
