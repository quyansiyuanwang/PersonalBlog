<script setup lang="ts">
import { defineAsyncComponent } from "vue";

defineProps<{
  visible: boolean;
  stats: { label: string; value: string }[];
}>();

const SignalWaveCanvas = defineAsyncComponent(
  () => import("../components/SignalWaveCanvas.vue"),
);

const signalLogs = [
  "SYNCING POST INDEX",
  "READER NODE ONLINE",
  "TAG MAP STABLE",
  "ARCHIVE CACHE WARM",
  "AMBIENT BUS IDLE",
];

const brailleLine = "⠿⡇⢿⣷⠶⣀⡿⠋⠙⢿⡄⠂⠆⡐⠠⢀⡀⠙⢷⣦⠿⠇";
</script>

<template>
  <section
    class="signal-console"
    :class="{ hidden: !visible }"
    aria-label="信号日志装饰窗"
  >
    <div class="signal-console-head">
      <span>SIGNAL LOG</span>
      <span>LOW BAND</span>
    </div>
    <div class="signal-console-body">
      <div class="signal-console-primary">
        <div class="signal-log-lines" aria-hidden="true">
          <span
            v-for="(log, index) in signalLogs"
            :key="log"
            class="signal-log-line"
            :style="{ '--log-index': index }"
          >
            {{ log }}
          </span>
        </div>
        <p class="signal-braille" aria-hidden="true">
          {{ brailleLine }}
        </p>
      </div>
      <div class="signal-console-side" aria-hidden="true">
        <div class="signal-wave">
          <SignalWaveCanvas />
        </div>
        <div class="signal-stat-grid">
          <span v-for="stat in stats" :key="stat.label">
            <small>{{ stat.label }}</small>
            <strong>{{ stat.value }}</strong>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.signal-console {
  position: relative;
  display: grid;
  gap: 9px;
  width: calc(100% - 18px);
  margin: 0 0 0 6px;
  padding: 11px 12px 10px;
  border: 1px solid color-mix(in srgb, var(--line) 68%, transparent);
  border-radius: 2px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(64, 224, 208, 0.08), transparent 42%),
    repeating-linear-gradient(
      0deg,
      transparent 0 7px,
      rgba(184, 255, 202, 0.018) 8px
    ),
    var(--terminal-overlay);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.018),
    inset 0 -18px 42px rgba(64, 224, 208, 0.025);
  opacity: 0.86;
  transform: translate3d(0, 0, 0);
  transition:
    opacity 0.46s ease,
    transform 0.46s ease,
    max-height 0.46s ease,
    padding 0.46s ease,
    border-width 0.46s ease;
}

.signal-console::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(64, 224, 208, 0.12) 48%,
    transparent 100%
  );
  opacity: 0.32;
  transform: translateY(-100%);
  animation: signal-console-scan 5.6s linear infinite;
  pointer-events: none;
}

.signal-console::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 12% 100%,
    rgba(184, 255, 202, 0.08),
    transparent 46%
  );
  pointer-events: none;
}

.signal-console.hidden {
  max-height: 0;
  margin-top: -14px;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
  transform: translate3d(-18px, 10px, 0) scale(0.96);
  pointer-events: none;
  border-width: 0;
}

.signal-console-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-family: var(--font-hud);
  font-size: 0.52rem;
  letter-spacing: 0.16em;
  color: color-mix(in srgb, var(--fui-cyan) 72%, var(--text-muted));
  text-transform: uppercase;
}

.signal-console-head span:last-child {
  color: var(--text-muted);
  opacity: 0.48;
}

.signal-console-body {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(112px, 0.75fr);
  gap: 8px;
}

.signal-console-primary {
  display: grid;
  min-width: 0;
  gap: 8px;
}

.signal-console-side {
  display: grid;
  min-width: 0;
  gap: 8px;
  padding-left: 10px;
  border-left: 1px solid color-mix(in srgb, var(--line) 44%, transparent);
}

.signal-log-lines {
  display: grid;
  gap: 2px;
  min-height: 54px;
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.signal-log-line {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: calc(0.32 + var(--log-index) * 0.08);
  animation: signal-log-flicker 4.8s ease-in-out infinite;
  animation-delay: calc(var(--log-index) * 0.28s);
}

.signal-log-line::before {
  content: "//";
  color: var(--fui-cyan);
  opacity: 0.58;
}

.signal-wave {
  position: relative;
  height: 28px;
  padding: 0;
}

.signal-braille {
  margin: 0;
  max-width: 100%;
  overflow: hidden;
  color: color-mix(in srgb, var(--fui-cyan) 58%, var(--text-muted));
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  line-height: 1;
  white-space: nowrap;
  opacity: 0.34;
  mask-image: linear-gradient(
    90deg,
    transparent,
    #000 12%,
    #000 82%,
    transparent
  );
  animation: signal-braille-drift 6.8s ease-in-out infinite;
}

.signal-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
}

.signal-stat-grid span {
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 6px 5px;
  border: 1px solid color-mix(in srgb, var(--line) 38%, transparent);
  background: rgba(64, 224, 208, 0.025);
}

.signal-stat-grid small {
  overflow: hidden;
  color: var(--text-muted);
  font-family: var(--font-hud);
  font-size: 0.46rem;
  letter-spacing: 0.1em;
  text-overflow: ellipsis;
}

.signal-stat-grid strong {
  overflow: hidden;
  color: color-mix(in srgb, var(--fui-cyan) 72%, var(--text-main));
  font-family: var(--font-mono);
  font-size: 0.58rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-overflow: ellipsis;
}

@keyframes signal-console-scan {
  0% {
    transform: translateY(-100%);
  }

  100% {
    transform: translateY(100%);
  }
}

@keyframes signal-log-flicker {
  0%,
  100% {
    color: var(--text-muted);
  }

  45% {
    color: color-mix(in srgb, var(--fui-cyan) 72%, var(--text-muted));
  }
}

@keyframes signal-braille-drift {
  0%,
  100% {
    transform: translateX(-2px);
    opacity: 0.24;
  }

  50% {
    transform: translateX(5px);
    opacity: 0.44;
  }
}

@media (max-width: 1280px) {
  .signal-console {
    display: none;
  }
}

@media (max-width: 820px) {
  .signal-console {
    display: none;
  }
}
</style>
