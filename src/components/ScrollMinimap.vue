<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

const props = defineProps<{
  scrollTarget: HTMLElement | null;
}>();

const route = useRoute();
const railRef = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const clientHeight = ref(1);
const scrollHeight = ref(1);
const dragging = ref(false);

let animationFrame = 0;
let resizeObserver: ResizeObserver | null = null;
let metricsTimer: number | null = null;

const canScroll = computed(() => scrollHeight.value > clientHeight.value + 1);
const progress = computed(() => {
  const maxScroll = Math.max(1, scrollHeight.value - clientHeight.value);
  return Math.min(1, Math.max(0, scrollTop.value / maxScroll));
});
const viewportRatio = computed(() =>
  Math.min(1, Math.max(0.06, clientHeight.value / scrollHeight.value)),
);
const thumbStyle = computed(() => ({
  height: `${viewportRatio.value * 100}%`,
  top: `${progress.value * (1 - viewportRatio.value) * 100}%`,
}));

function readScrollState() {
  const target = props.scrollTarget;
  if (!target) return;

  scrollTop.value = target.scrollTop;
  clientHeight.value = Math.max(1, target.clientHeight);
  scrollHeight.value = Math.max(1, target.scrollHeight);
}

function scheduleReadScrollState() {
  if (animationFrame || typeof window === "undefined") return;

  animationFrame = window.requestAnimationFrame(() => {
    animationFrame = 0;
    readScrollState();
  });
}

function scrollToClientY(clientY: number) {
  const rail = railRef.value;
  const target = props.scrollTarget;
  if (!rail || !target) return;

  const rect = rail.getBoundingClientRect();
  const thumbHeight = rect.height * viewportRatio.value;
  const usableHeight = Math.max(1, rect.height - thumbHeight);
  const relativeY = Math.min(
    usableHeight,
    Math.max(0, clientY - rect.top - thumbHeight / 2),
  );
  const maxScroll = Math.max(0, target.scrollHeight - target.clientHeight);

  target.scrollTo({
    top: (relativeY / usableHeight) * maxScroll,
    behavior: "auto",
  });
}

function handlePointerDown(event: PointerEvent) {
  if (!props.scrollTarget || !canScroll.value) return;

  dragging.value = true;
  railRef.value?.setPointerCapture(event.pointerId);
  scrollToClientY(event.clientY);
}

function handlePointerMove(event: PointerEvent) {
  if (!dragging.value) return;

  scrollToClientY(event.clientY);
}

function stopDragging(event: PointerEvent) {
  if (!dragging.value) return;

  dragging.value = false;

  if (railRef.value?.hasPointerCapture(event.pointerId)) {
    railRef.value.releasePointerCapture(event.pointerId);
  }
}

function bindTarget(target: HTMLElement | null) {
  resizeObserver?.disconnect();
  resizeObserver = null;

  if (metricsTimer !== null) {
    window.clearInterval(metricsTimer);
    metricsTimer = null;
  }

  if (!target || typeof window === "undefined") return;

  target.addEventListener("scroll", scheduleReadScrollState, { passive: true });
  resizeObserver = new ResizeObserver(scheduleReadScrollState);
  resizeObserver.observe(target);
  metricsTimer = window.setInterval(scheduleReadScrollState, 700);
  void nextTick(readScrollState);
}

function unbindTarget(target: HTMLElement | null) {
  target?.removeEventListener("scroll", scheduleReadScrollState);
  resizeObserver?.disconnect();
  resizeObserver = null;

  if (metricsTimer !== null) {
    window.clearInterval(metricsTimer);
    metricsTimer = null;
  }
}

watch(
  () => props.scrollTarget,
  (nextTarget, previousTarget) => {
    unbindTarget(previousTarget ?? null);
    bindTarget(nextTarget);
  },
  { immediate: true },
);

watch(
  () => route.fullPath,
  () => {
    void nextTick(() => {
      readScrollState();
      scheduleReadScrollState();
    });
  },
);

onMounted(() => {
  window.addEventListener("resize", scheduleReadScrollState, { passive: true });
});

onBeforeUnmount(() => {
  unbindTarget(props.scrollTarget);
  window.removeEventListener("resize", scheduleReadScrollState);

  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame);
  }
});
</script>

<template>
  <div
    ref="railRef"
    class="scroll-minimap"
    :class="{ visible: canScroll, dragging }"
    aria-label="页面滚动预览条"
    role="scrollbar"
    aria-orientation="vertical"
    :aria-valuenow="Math.round(progress * 100)"
    aria-valuemin="0"
    aria-valuemax="100"
    @pointerdown.prevent="handlePointerDown"
    @pointermove.prevent="handlePointerMove"
    @pointerup="stopDragging"
    @pointercancel="stopDragging"
  >
    <div class="scroll-minimap-track">
      <span class="scroll-minimap-progress" :style="{ height: `${progress * 100}%` }"></span>
      <span class="scroll-minimap-thumb" :style="thumbStyle"></span>
    </div>
  </div>
</template>

<style scoped>
.scroll-minimap {
  position: absolute;
  top: 12px;
  right: 5px;
  bottom: 16px;
  z-index: 24;
  width: 18px;
  padding: 0 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease;
}

.scroll-minimap.visible {
  opacity: 0.56;
  pointer-events: auto;
}

.scroll-minimap.visible:hover,
.scroll-minimap.dragging {
  opacity: 0.96;
}

.scroll-minimap-track {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-left: 1px solid color-mix(in srgb, var(--line) 74%, transparent);
  background:
    repeating-linear-gradient(
      180deg,
      color-mix(in srgb, var(--text-muted) 18%, transparent) 0 2px,
      transparent 2px 7px
    );
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.scroll-minimap.dragging .scroll-minimap-track {
  cursor: grabbing;
}

.scroll-minimap-progress,
.scroll-minimap-thumb {
  position: absolute;
  left: 0;
  width: 100%;
  pointer-events: none;
}

.scroll-minimap-progress {
  top: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 56%, transparent), transparent);
  opacity: 0.36;
}

.scroll-minimap-thumb {
  min-height: 34px;
  border-left: 2px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 22%, transparent);
}

@media (max-width: 900px) {
  .scroll-minimap {
    display: none;
  }
}
</style>
