<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const temp = ref('36.2')
const hum = ref('58.7')
const signal = ref('-42')
const uptime = ref('147:23:12')

let interval: number | undefined

function jitter() {
  temp.value = (36 + Math.random() * 1.5).toFixed(1)
  hum.value = (55 + Math.random() * 10).toFixed(1)
  signal.value = (-45 + Math.floor(Math.random() * 8)).toString()
  const parts = uptime.value.split(':')
  uptime.value = `${parts[0]}:${parts[1]}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
}

onMounted(() => {
  interval = window.setInterval(jitter, 3000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<template>
  <div class="fui-env-panel">
    <div class="fui-widget-header">
      <span class="fui-label">ENV_DATA</span>
      <span class="fui-status">[LOGGING]</span>
    </div>
    <div class="fui-env-grid">
      <div class="fui-env-item">
        <span class="fui-env-label">TEMP</span>
        <span class="fui-env-val">{{ temp }}°C</span>
      </div>
      <div class="fui-env-item">
        <span class="fui-env-label">HUM</span>
        <span class="fui-env-val">{{ hum }}%</span>
      </div>
      <div class="fui-env-item">
        <span class="fui-env-label">SIGNAL</span>
        <span class="fui-env-val">{{ signal }} dBm</span>
      </div>
      <div class="fui-env-item">
        <span class="fui-env-label">UPTIME</span>
        <span class="fui-env-val">{{ uptime }}</span>
      </div>
    </div>
    <div class="fui-env-wave">
      <div class="fui-wave-line"></div>
    </div>
  </div>
</template>

<style scoped>
.fui-env-panel {
  border: 1px solid var(--fui-border-color);
  border-radius: 4px;
  background: var(--fui-widget-bg);
  padding: 10px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  color: var(--fui-cyan);
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
}

.fui-status {
  opacity: 0.4;
  font-size: 0.68rem;
}

.fui-env-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px 6px;
  margin-bottom: 6px;
}

.fui-env-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.fui-env-label {
  font-size: 0.68rem;
  opacity: 0.4;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.fui-env-val {
  font-size: 0.75rem;
  opacity: 0.85;
  letter-spacing: 0.04em;
}

.fui-env-wave {
  height: 14px;
  border: 1px solid var(--fui-border-color);
  border-radius: 2px;
  overflow: hidden;
  padding: 2px;
}

.fui-wave-line {
  height: 100%;
  width: 100%;
  background: repeating-linear-gradient(
    90deg,
    var(--fui-cyan) 0,
    transparent 1px,
    transparent 4px,
    var(--fui-cyan) 5px,
    var(--fui-cyan) 6px,
    transparent 7px,
    transparent 10px
  );
  background-size: 20px 100%;
  opacity: 0.3;
  animation: wave-scroll 3s linear infinite;
}

@keyframes wave-scroll {
  0% { background-position: 0 0; }
  100% { background-position: 20px 0; }
}
</style>
