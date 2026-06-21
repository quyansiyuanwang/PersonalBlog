<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const elRef = ref<HTMLElement | null>(null)
const locatorRef = ref<HTMLElement | null>(null)
const hovering = ref(false)

const INTERACTIVE_SELECTOR = `
  a, button, [role="button"],
  .diagonal-link, .tag-link, .tag-cloud-item,
  .ghost-link, .post-card, .archive-item,
  .catalogue-item, input, select, textarea,
  .theme-toggle, .brand
`

const HOVER_TRANSITION = 'width 0.1s linear, height 0.1s linear, transform 0.1s linear'

let mouseX = -100
let mouseY = -100
let currentTarget: Element | null = null
let shrinkRaf = 0
let syncRaf = 0
let moveRaf = 0
let hoverProbeRaf = 0
let lastFrameX = -16
let lastFrameY = -16
let lastHoverProbeAt = 0

const HOVER_PROBE_INTERVAL = 80

function isElementVisible(target: Element | null) {
  if (!(target instanceof HTMLElement)) return false
  if (!document.contains(target)) return false

  const style = window.getComputedStyle(target)
  if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') {
    return false
  }

  const rect = target.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function updateLocatorPosition() {
  const locator = locatorRef.value
  if (!locator) return

  locator.style.transform = `translate3d(${mouseX - 9}px, ${mouseY - 9}px, 0)`
}

function placeCursorFrame(x: number, y: number) {
  const frame = elRef.value
  if (!frame) return

  lastFrameX = x
  lastFrameY = y
  frame.style.transform = `translate3d(${x}px, ${y}px, 0)`
}

function animateReleaseToPointer(fromWidth = 32, fromHeight = 32) {
  if (!elRef.value) {
    return
  }

  const activeFrame = elRef.value

  activeFrame.style.removeProperty('transition')
  const startX = lastFrameX
  const startY = lastFrameY
  const duration = 180
  const start = performance.now()

  function step(now: number) {
    const t = Math.min((now - start) / duration, 1)
    const targetX = mouseX - 16
    const targetY = mouseY - 16

    activeFrame.style.width = `${fromWidth + (32 - fromWidth) * t}px`
    activeFrame.style.height = `${fromHeight + (32 - fromHeight) * t}px`
    placeCursorFrame(startX + (targetX - startX) * t, startY + (targetY - startY) * t)

    if (t < 1) {
      shrinkRaf = requestAnimationFrame(step)
    } else {
      shrinkRaf = 0
    }
  }

  if (shrinkRaf) {
    cancelAnimationFrame(shrinkRaf)
  }

  shrinkRaf = requestAnimationFrame(step)
}

function releaseHoverState(fromWidth = 32, fromHeight = 32) {
  currentTarget = null
  hovering.value = false

  animateReleaseToPointer(fromWidth, fromHeight)
}

function getInteractiveTargetFromPoint(x: number, y: number) {
  const element = document.elementFromPoint(x, y)
  if (!(element instanceof HTMLElement)) return null
  return element.closest(INTERACTIVE_SELECTOR) as HTMLElement | null
}

function bindToTarget(target: HTMLElement) {
  if (shrinkRaf) {
    cancelAnimationFrame(shrinkRaf)
    shrinkRaf = 0
  }

  currentTarget = target
  hovering.value = true
  syncCursorToTarget()
}

function updateHoverTarget() {
  const nextTarget = getInteractiveTargetFromPoint(mouseX, mouseY)

  if (nextTarget && isElementVisible(nextTarget)) {
    if (nextTarget !== currentTarget) {
      bindToTarget(nextTarget)
    } else {
      scheduleCursorSync()
    }
    return
  }

  if (currentTarget) {
    const rect = currentTarget.getBoundingClientRect()
    releaseHoverState(rect.width || 32, rect.height || 32)
  }
}

function scheduleHoverProbe(force = false) {
  if (hoverProbeRaf) return

  hoverProbeRaf = requestAnimationFrame((now) => {
    hoverProbeRaf = 0

    if (!force && now - lastHoverProbeAt < HOVER_PROBE_INTERVAL) {
      scheduleHoverProbe(true)
      return
    }

    lastHoverProbeAt = now
    updateHoverTarget()
  })
}

function syncCursorToTarget() {
  const target = currentTarget as HTMLElement | null
  const c = elRef.value
  if (!target || !c) return

  if (!isElementVisible(target)) {
    const rect = target.getBoundingClientRect()
    releaseHoverState(rect.width, rect.height)
    return
  }

  const r = target.getBoundingClientRect()
  c.style.transition = HOVER_TRANSITION
  placeCursorFrame(r.left, r.top)
  c.style.width = `${r.width}px`
  c.style.height = `${r.height}px`
  updateLocatorPosition()
}

function scheduleCursorSync() {
  if (!currentTarget || shrinkRaf || syncRaf) return

  syncRaf = requestAnimationFrame(() => {
    syncRaf = 0
    syncCursorToTarget()
  })
}

function onMouseMove(e: MouseEvent) {
  mouseX = e.clientX
  mouseY = e.clientY

  if (moveRaf) return

  moveRaf = requestAnimationFrame(() => {
    moveRaf = 0
    updateLocatorPosition()
    scheduleHoverProbe()

    if (!currentTarget && !shrinkRaf) {
      const el = elRef.value
      if (el) {
        placeCursorFrame(mouseX - 16, mouseY - 16)
      }
    }
  })
}

function onPointerContextChange() {
  scheduleHoverProbe(true)
}

onMounted(() => {
  updateLocatorPosition()
  placeCursorFrame(mouseX - 16, mouseY - 16)
  document.addEventListener('mousemove', onMouseMove, { passive: true })
  document.addEventListener('scroll', onPointerContextChange, { passive: true, capture: true })
  window.addEventListener('resize', onPointerContextChange, { passive: true })
  window.addEventListener('resize', scheduleCursorSync, { passive: true })
  window.addEventListener('scroll', scheduleCursorSync, { passive: true, capture: true })
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('scroll', onPointerContextChange, true)
  window.removeEventListener('resize', onPointerContextChange)
  window.removeEventListener('resize', scheduleCursorSync)
  window.removeEventListener('scroll', scheduleCursorSync, true)
  if (shrinkRaf) cancelAnimationFrame(shrinkRaf)
  if (syncRaf) cancelAnimationFrame(syncRaf)
  if (moveRaf) cancelAnimationFrame(moveRaf)
  if (hoverProbeRaf) cancelAnimationFrame(hoverProbeRaf)
})
</script>

<template>
  <div
    ref="locatorRef"
    class="cursor-locator"
    :class="{ hovering }"
  >
    <span class="hover-locator"></span>
  </div>

  <div
    ref="elRef"
    class="cursor-wrap"
    :class="{ hovering }"
  >
    <span class="corner tl"></span>
    <span class="corner tr"></span>
    <span class="corner bl"></span>
    <span class="corner br"></span>
    <span class="cross-h"></span>
    <span class="cross-v"></span>
    <span class="dot"></span>
  </div>
</template>

<style scoped>
.cursor-wrap {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 99998;
  pointer-events: none;
  width: 32px;
  height: 32px;
  will-change: transform;
}

.cursor-locator {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 99999;
  pointer-events: none;
  width: 18px;
  height: 18px;
  will-change: transform;
}

.hover-locator {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid var(--accent, #d4a857);
  background: color-mix(in srgb, var(--bg, #111) 72%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent, #d4a857) 18%, transparent);
  transform: translate(-50%, -50%) scale(0.9);
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.hover-locator::before,
.hover-locator::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  background: var(--accent, #d4a857);
  transform: translate(-50%, -50%);
  opacity: 0.85;
}

.hover-locator::before {
  width: 14px;
  height: 1px;
}

.hover-locator::after {
  width: 1px;
  height: 14px;
}

.hovering .hover-locator {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.cross-h, .cross-v {
  position: absolute;
  background: var(--accent, #d4a857);
  opacity: 0.5;
  transition: opacity 0.2s ease;
}
.cross-h {
  top: 50%; left: 50%;
  width: 14px; height: 1px;
  transform: translate(-50%, -50%);
}
.cross-v {
  top: 50%; left: 50%;
  width: 1px; height: 14px;
  transform: translate(-50%, -50%);
}

.dot {
  position: absolute;
  top: 50%; left: 50%;
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--accent, #d4a857);
  transform: translate(-50%, -50%);
  transition: opacity 0.2s ease;
}

.hovering .cross-h,
.hovering .cross-v,
.hovering .dot { opacity: 0; }

.corner {
  position: absolute;
  width: 12px;
  height: 12px;
  border-color: var(--accent, #d4a857);
  border-style: solid;
  border-width: 0;
}

.corner.tl { top: 2px; left: 2px; border-top-width: 2px; border-left-width: 2px; }
.corner.tr { top: 2px; right: 2px; border-top-width: 2px; border-right-width: 2px; }
.corner.bl { bottom: 2px; left: 2px; border-bottom-width: 2px; border-left-width: 2px; }
.corner.br { bottom: 2px; right: 2px; border-bottom-width: 2px; border-right-width: 2px; }

.hovering .corner.tl { top: 0; left: 0; width: 20px; height: 20px; }
.hovering .corner.tr { top: 0; right: 0; width: 20px; height: 20px; }
.hovering .corner.bl { bottom: 0; left: 0; width: 20px; height: 20px; }
.hovering .corner.br { bottom: 0; right: 0; width: 20px; height: 20px; }
</style>
