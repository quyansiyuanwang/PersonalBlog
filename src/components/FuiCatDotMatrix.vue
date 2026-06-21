<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface MatrixDot {
  col: number
  row: number
  x: number
  y: number
  vx: number
  vy: number
}

interface Repulsor {
  x: number
  y: number
  radius: number
  force: number
}

const SAMPLE_COLS = 90
const SAMPLE_ROWS = 90
const EDGE_ALPHA_THRESHOLD = 36
const EDGE_COLOR_THRESHOLD = 42
const DOT_COLOR = 'rgba(150, 150, 150, 0.82)'
const DRAW_SCALE = 0.8
const POINTER_RADIUS_SCALE = 0.05
const POINTER_FORCE = 2

const canvasRef = ref<HTMLCanvasElement | null>(null)
const dots: MatrixDot[] = []

let animationFrameId: number | null = null
let resizeObserver: ResizeObserver | null = null
let pointerPosition: { x: number; y: number } | null = null
let canvasWidth = 0
let canvasHeight = 0
let devicePixelRatioValue = 1

function getPixelAlpha(data: Uint8ClampedArray, width: number, x: number, y: number) {
  return data[(y * width + x) * 4 + 3] ?? 0
}

function getPixelLuma(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const offset = (y * width + x) * 4
  return (data[offset] ?? 0) * 0.299 + (data[offset + 1] ?? 0) * 0.587 + (data[offset + 2] ?? 0) * 0.114
}

function isEdgePixel(data: Uint8ClampedArray, width: number, height: number, x: number, y: number) {
  const alpha = getPixelAlpha(data, width, x, y)
  if (alpha < EDGE_ALPHA_THRESHOLD) return false

  const luma = getPixelLuma(data, width, x, y)
  const neighbors = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ]

  return neighbors.some(([neighborX, neighborY]) => {
    if (neighborX < 0 || neighborX >= width || neighborY < 0 || neighborY >= height) return true

    const neighborAlpha = getPixelAlpha(data, width, neighborX, neighborY)
    if (Math.abs(alpha - neighborAlpha) > EDGE_ALPHA_THRESHOLD) return true

    return Math.abs(luma - getPixelLuma(data, width, neighborX, neighborY)) > EDGE_COLOR_THRESHOLD
  })
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
  drawDots()
}

function dotOrigin(dot: MatrixDot) {
  const fittedSize = Math.min(canvasWidth * 0.82, canvasHeight * 0.82) * DRAW_SCALE
  const offsetX = (canvasWidth - fittedSize) / 2
  const offsetY = (canvasHeight - fittedSize) / 2

  return {
    x: offsetX + ((dot.col + 0.5) / SAMPLE_COLS) * fittedSize,
    y: offsetY + ((dot.row + 0.5) / SAMPLE_ROWS) * fittedSize,
  }
}

function applyRepulsorForce(repulsors: Repulsor[]) {
  if (repulsors.length === 0) return

  dots.forEach((dot) => {
    const origin = dotOrigin(dot)
    const dotX = origin.x + dot.x
    const dotY = origin.y + dot.y

    repulsors.forEach((repulsor) => {
      const dx = dotX - repulsor.x
      const dy = dotY - repulsor.y
      const distance = Math.hypot(dx, dy)

      if (distance <= 0 || distance > repulsor.radius) return

      const force = (1 - distance / repulsor.radius) * repulsor.force
      dot.vx += (dx / distance) * force
      dot.vy += (dy / distance) * force
    })
  })
}

function getCubeRepulsor() {
  const canvas = canvasRef.value
  const cube = document.querySelector<HTMLElement>('.signal-cube-dragger')
  if (!canvas || !cube) return null

  const canvasRect = canvas.getBoundingClientRect()
  const cubeRect = cube.getBoundingClientRect()

  if (cubeRect.width === 0 || cubeRect.height === 0) return null

  return {
    x: cubeRect.left + cubeRect.width / 2 - canvasRect.left,
    y: cubeRect.top + cubeRect.height / 2 - canvasRect.top,
    radius: Math.min(canvasWidth, canvasHeight) * POINTER_RADIUS_SCALE,
    force: POINTER_FORCE,
  } satisfies Repulsor
}

function getRepulsors() {
  const repulsors: Repulsor[] = []
  const pointer = pointerPosition

  if (pointer) {
    repulsors.push({
      x: pointer.x,
      y: pointer.y,
      radius: Math.min(canvasWidth, canvasHeight) * POINTER_RADIUS_SCALE,
      force: POINTER_FORCE,
    })
  }

  const cubeRepulsor = getCubeRepulsor()
  if (cubeRepulsor) {
    repulsors.push(cubeRepulsor)
  }

  return repulsors
}

function drawDots() {
  const canvas = canvasRef.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return

  context.setTransform(devicePixelRatioValue, 0, 0, devicePixelRatioValue, 0, 0)
  context.clearRect(0, 0, canvasWidth, canvasHeight)

  const dotSize = Math.max(1, Math.round(Math.min(canvasWidth, canvasHeight) / 190))
  context.fillStyle = DOT_COLOR
  dots.forEach((dot) => {
    const origin = dotOrigin(dot)
    context.fillRect(
      Math.round(origin.x + dot.x - dotSize / 2),
      Math.round(origin.y + dot.y - dotSize / 2),
      dotSize,
      dotSize,
    )
  })
}

function stepDots() {
  let hasMotion = false
  const repulsors = getRepulsors()

  applyRepulsorForce(repulsors)

  dots.forEach((dot) => {
    dot.vx += -dot.x * 0.002
    dot.vy += -dot.y * 0.002
    dot.vx *= 0.92
    dot.vy *= 0.92
    dot.x += dot.vx
    dot.y += dot.vy

    if (Math.abs(dot.x) < 0.02 && Math.abs(dot.vx) < 0.02) {
      dot.x = 0
      dot.vx = 0
    }

    if (Math.abs(dot.y) < 0.02 && Math.abs(dot.vy) < 0.02) {
      dot.y = 0
      dot.vy = 0
    }

    hasMotion ||= Math.abs(dot.x) > 0 || Math.abs(dot.y) > 0 || Math.abs(dot.vx) > 0 || Math.abs(dot.vy) > 0
  })

  drawDots()
  animationFrameId = hasMotion || repulsors.length > 0 ? requestAnimationFrame(stepDots) : null
}

function wakeDots() {
  if (animationFrameId === null) {
    animationFrameId = requestAnimationFrame(stepDots)
  }
}

function trackPointer(event: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  pointerPosition = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }

  wakeDots()
}

function releasePointer() {
  pointerPosition = null
}

async function loadFaviconDots() {
  const image = new Image()
  image.decoding = 'async'
  image.src = `${import.meta.env.BASE_URL}favicon.png`
  await image.decode()

  const sampler = document.createElement('canvas')
  sampler.width = SAMPLE_COLS
  sampler.height = SAMPLE_ROWS
  const context = sampler.getContext('2d', { willReadFrequently: true })
  if (!context) return

  context.clearRect(0, 0, SAMPLE_COLS, SAMPLE_ROWS)
  context.drawImage(image, 0, 0, SAMPLE_COLS, SAMPLE_ROWS)
  const { data, width, height } = context.getImageData(0, 0, SAMPLE_COLS, SAMPLE_ROWS)

  dots.length = 0
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      if (!isEdgePixel(data, width, height, col, row)) continue
      dots.push({ col, row, x: 0, y: 0, vx: 0, vy: 0 })
    }
  }

  drawDots()
}

onMounted(() => {
  resizeCanvas()
  resizeObserver = new ResizeObserver(resizeCanvas)

  const canvas = canvasRef.value
  if (canvas) {
    resizeObserver.observe(canvas)
  }

  void loadFaviconDots()
  window.addEventListener('pointermove', trackPointer, { passive: true })
  window.addEventListener('pointerleave', releasePointer)
  wakeDots()
})

onBeforeUnmount(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }

  resizeObserver?.disconnect()
  window.removeEventListener('pointermove', trackPointer)
  window.removeEventListener('pointerleave', releasePointer)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="cat-dot-matrix"
    aria-hidden="true"
  ></canvas>
</template>

<style scoped>
.cat-dot-matrix {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  opacity: 0.58;
  pointer-events: none;
  user-select: none;
  image-rendering: pixelated;
}

@media (prefers-reduced-motion: reduce) {
  .cat-dot-matrix {
    pointer-events: none;
  }
}
</style>