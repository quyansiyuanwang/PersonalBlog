<script setup lang="ts">
import { useParticles } from "../composables/useParticles";

const { particles } = useParticles();
</script>

<template>
  <div class="particle-field" aria-hidden="true">
    <span
      v-for="p in particles"
      :key="p.id"
      class="particle"
      :style="{
        left: p.left,
        top: p.top,
        width: p.size + 'px',
        height: p.size + 'px',
        '--drift-x': p.driftX + 'px',
        '--drift-y': p.driftY + 'px',
        animationDuration: p.duration + 's',
        animationDelay: p.delay + 's',
      }"
    ></span>
  </div>
</template>

<style scoped>
.particle-field {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 3px;
  height: 3px;
  background: var(--accent);
  border-radius: 50%;
  opacity: 0;
  animation: particle-float linear infinite;
}

@keyframes particle-float {
  0% {
    opacity: 0;
    transform: translateY(0) translateX(0);
  }
  10% {
    opacity: 0.3;
  }
  90% {
    opacity: 0.3;
  }
  100% {
    opacity: 0;
    transform: translateY(var(--drift-y, -120px)) translateX(var(--drift-x, 20px));
  }
}
</style>
