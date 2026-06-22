<script setup lang="ts">
import { ref, watch } from "vue";
import { useSignalCube } from "../composables/useSignalCube";

const props = defineProps<{
  disabled: boolean;
}>();

const draggerRef = ref<HTMLElement | null>(null);

const {
  cubeTiltX,
  cubeTiltY,
  isCubeVisible,
  cubePosition,
  isCubeDragging,
  cubeFragments,
  toggleSignalCube,
  startCubeDrag,
  moveCubeDrag,
  stopCubeDrag,
  explodeSignalCube,
} = useSignalCube(draggerRef);

watch(
  () => props.disabled,
  (val) => {
    if (val && isCubeVisible.value) {
      explodeSignalCube();
    }
  },
);
</script>

<template>
  <button
    v-if="!disabled"
    class="cube-drop-lever"
    type="button"
    :aria-pressed="!isCubeVisible"
    aria-label="投放信号核心方块"
    @click="toggleSignalCube"
  >
    <span class="lever-label">CORE</span>
    <span class="lever-track" aria-hidden="true">
      <span class="lever-handle"></span>
    </span>
  </button>
  <button
    v-if="isCubeVisible"
    ref="draggerRef"
    class="signal-cube-dragger"
    :class="{ dragging: isCubeDragging }"
    type="button"
    :style="{
      '--cube-x': cubePosition.x + 'px',
      '--cube-y': cubePosition.y + 'px',
      '--cube-tilt-x': cubeTiltX + 'deg',
      '--cube-tilt-y': cubeTiltY + 'deg',
    }"
    aria-label="可拖动的信号核心方块"
    @pointerdown="startCubeDrag"
    @pointermove="moveCubeDrag"
    @pointerup="stopCubeDrag"
    @pointercancel="stopCubeDrag"
  >
    <span class="signal-cube-scene" aria-hidden="true">
      <span class="signal-cube">
        <span class="cube-face cube-front"></span>
        <span class="cube-face cube-back"></span>
        <span class="cube-face cube-right"></span>
        <span class="cube-face cube-left"></span>
        <span class="cube-face cube-top"></span>
        <span class="cube-face cube-bottom"></span>
      </span>
      <span class="cube-core"></span>
    </span>
  </button>
  <span
    v-for="fragment in cubeFragments"
    :key="fragment.id"
    class="cube-fragment"
    :style="{
      '--fragment-origin-x': fragment.originX + 'px',
      '--fragment-origin-y': fragment.originY + 'px',
      '--fragment-x': fragment.x + 'px',
      '--fragment-y': fragment.y + 'px',
      '--fragment-rotate': fragment.rotate + 'deg',
      '--fragment-size': fragment.size + 'px',
    }"
    aria-hidden="true"
  ></span>
</template>

<style scoped>
.cube-drop-lever {
  position: absolute;
  top: 12px;
  left: 14px;
  z-index: 40;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 7px 9px;
  border: 1px solid color-mix(in srgb, var(--fui-border-color) 70%, transparent);
  border-radius: 2px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent-soft) 76%, transparent),
      transparent
    ),
    var(--panel-overlay);
  color: color-mix(in srgb, var(--fui-cyan) 82%, var(--text-muted));
  font-family: var(--font-hud);
  font-size: 0.5rem;
  letter-spacing: 0.12em;
  cursor: pointer;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.025),
    0 0 16px rgba(64, 224, 208, 0.06);
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.cube-drop-lever:hover {
  border-color: color-mix(in srgb, var(--fui-cyan) 88%, transparent);
  color: var(--text-main);
  box-shadow:
    inset 0 0 12px rgba(184, 255, 202, 0.06),
    0 0 18px rgba(64, 224, 208, 0.14);
}

.lever-label {
  line-height: 1;
  opacity: 0.76;
  writing-mode: vertical-rl;
}

.lever-track {
  position: relative;
  display: block;
  width: 14px;
  height: 48px;
  border: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
  border-radius: 999px;
  background:
    linear-gradient(
      180deg,
      rgba(64, 224, 208, 0.16),
      rgba(184, 255, 202, 0.03)
    ),
    color-mix(in srgb, var(--surface) 70%, transparent);
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.36);
}

.lever-track::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 6px;
  bottom: 6px;
  width: 1px;
  background: linear-gradient(
    180deg,
    var(--fui-cyan),
    transparent 50%,
    var(--line)
  );
  opacity: 0.36;
  transform: translateX(-50%);
}

.lever-handle {
  position: absolute;
  left: 50%;
  top: auto;
  bottom: 3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--text-muted);
  box-shadow:
    0 0 8px rgba(184, 255, 202, 0.12),
    inset 0 0 0 1px rgba(255, 255, 255, 0.28);
  transform: translate3d(-50%, -32px, 0);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.cube-drop-lever[aria-pressed="false"] .lever-handle {
  background: var(--fui-cyan);
  box-shadow:
    0 0 10px rgba(64, 224, 208, 0.8),
    0 0 20px rgba(184, 255, 202, 0.26),
    inset 0 0 0 1px rgba(255, 255, 255, 0.4);
  transform: translate3d(-50%, 0, 0);
}

.signal-cube-dragger {
  position: absolute;
  left: var(--cube-x);
  top: var(--cube-y);
  z-index: 90;
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  border: 0;
  background: transparent;
  color: var(--fui-cyan);
  cursor: grab;
  touch-action: none;
  user-select: none;
  filter: drop-shadow(0 0 14px rgba(64, 224, 208, 0.24));
  will-change: left, top;
}

.signal-cube-dragger.dragging {
  cursor: grabbing;
}

.cube-fragment {
  position: absolute;
  left: var(--fragment-origin-x);
  top: var(--fragment-origin-y);
  z-index: 89;
  width: var(--fragment-size);
  height: var(--fragment-size);
  border: 1px solid color-mix(in srgb, var(--fui-cyan) 90%, transparent);
  background: rgba(64, 224, 208, 0.1);
  box-shadow:
    0 0 10px rgba(64, 224, 208, 0.44),
    inset 0 0 6px rgba(184, 255, 202, 0.18);
  pointer-events: none;
  animation: cube-fragment-burst 0.72s cubic-bezier(0.18, 0.72, 0.24, 1)
    forwards;
}

@keyframes cube-fragment-burst {
  0% {
    opacity: 1;
    transform: translate3d(-50%, -50%, 0) rotate(0deg) scale(1);
  }

  68% {
    opacity: 0.72;
  }

  100% {
    opacity: 0;
    transform: translate3d(
        calc(var(--fragment-x) - 50%),
        calc(var(--fragment-y) - 50%),
        0
      )
      rotate(var(--fragment-rotate)) scale(0.22);
    filter: blur(3px);
  }
}

.signal-cube-scene {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  perspective: 520px;
  pointer-events: none;
}

.signal-cube-scene::before {
  content: "";
  position: absolute;
  inset: auto 14px 3px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse,
    rgba(64, 224, 208, 0.2),
    transparent 70%
  );
  filter: blur(2px);
}

.signal-cube {
  position: relative;
  width: 38px;
  height: 38px;
  transform-style: preserve-3d;
  transform: rotateX(var(--cube-tilt-x)) rotateY(var(--cube-tilt-y));
}

.cube-face {
  position: absolute;
  inset: 0;
  border: 1px solid color-mix(in srgb, var(--fui-cyan) 92%, transparent);
  background: transparent;
  box-shadow:
    0 0 8px rgba(64, 224, 208, 0.2),
    inset 0 0 10px rgba(184, 255, 202, 0.035);
  backface-visibility: hidden;
}

.cube-front {
  transform: translateZ(19px);
}

.cube-back {
  transform: rotateY(180deg) translateZ(19px);
}

.cube-right {
  transform: rotateY(90deg) translateZ(19px);
}

.cube-left {
  transform: rotateY(-90deg) translateZ(19px);
}

.cube-top {
  transform: rotateX(90deg) translateZ(19px);
}

.cube-bottom {
  transform: rotateX(-90deg) translateZ(19px);
}

.cube-core {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 2;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    #ffffff 0 12%,
    var(--fui-cyan) 32%,
    transparent 72%
  );
  box-shadow:
    0 0 10px rgba(255, 255, 255, 0.5),
    0 0 24px rgba(64, 224, 208, 0.82),
    0 0 52px rgba(184, 255, 202, 0.28);
  transform: translate3d(-50%, -50%, 0);
  animation: cube-core-pulse 1.8s ease-in-out infinite;
  pointer-events: none;
}

@keyframes cube-core-pulse {
  0%,
  100% {
    transform: translate3d(-50%, -50%, 0) scale(0.86);
    opacity: 0.76;
  }

  50% {
    transform: translate3d(-50%, -50%, 0) scale(1.18);
    opacity: 1;
  }
}

@media (pointer: coarse) {
  .signal-cube-dragger,
  .cube-drop-lever {
    display: none;
  }
}
</style>
