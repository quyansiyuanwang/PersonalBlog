<script setup lang="ts">
function isDotOn(i: number, j: number): boolean {
  return (i * 7 + j) % 3 === 0 || (i + j) % 5 === 0
}
</script>

<template>
  <div class="fui-dot-matrix" aria-hidden="true">
    <div class="fui-widget-header">
      <span class="fui-label">[DOT_MATRIX]</span>
    </div>
    <div class="fui-matrix-grid">
      <div v-for="i in 6" :key="i" class="matrix-row">
        <span
          v-for="j in 14"
          :key="j"
          class="matrix-dot"
          :class="{ on: isDotOn(i, j) }"
        ></span>
      </div>
    </div>
    <div class="matrix-scanline"></div>
  </div>
</template>

<style scoped>
.fui-dot-matrix {
  border: 1px solid var(--fui-border-color);
  border-radius: 4px;
  background: var(--fui-widget-bg);
  padding: 10px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  color: var(--fui-cyan);
  position: relative;
  overflow: hidden;
}

.fui-widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--fui-border-color);
}

.fui-label {
  opacity: 0.7;
  text-transform: uppercase;
  font-size: 0.68rem;
}

.fui-matrix-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.matrix-row {
  display: flex;
  gap: 4px;
}

.matrix-dot {
  display: inline-block;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: transparent;
  transition: background 0.3s ease;
}

.matrix-dot.on {
  background: var(--fui-cyan);
  box-shadow: 0 0 4px var(--fui-cyan);
  animation: dot-pulse 3s ease-in-out infinite;
}

.matrix-dot.on:nth-child(3n+1) { animation-delay: 0s; }
.matrix-dot.on:nth-child(3n+2) { animation-delay: 1s; }
.matrix-dot.on:nth-child(3n+3) { animation-delay: 2s; }

@keyframes dot-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.matrix-scanline {
  position: absolute;
  left: 0;
  right: 0;
  height: 20px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    color-mix(in srgb, var(--fui-cyan) 6%, transparent) 50%,
    transparent 100%
  );
  pointer-events: none;
  animation: scanline-move 6s ease-in-out infinite;
}

@keyframes scanline-move {
  0% { top: -10%; }
  50% { top: 100%; }
  100% { top: -10%; }
}
</style>
