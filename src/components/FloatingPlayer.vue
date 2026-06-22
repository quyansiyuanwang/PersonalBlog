<script setup lang="ts">
import { defineAsyncComponent } from "vue";

defineProps<{
  expanded: boolean;
}>();

defineEmits<{
  toggle: [];
}>();

const FuiMusicWidget = defineAsyncComponent(
  () => import("../components/FuiMusicWidget.vue"),
);
</script>

<template>
  <div class="floating-player" :class="{ collapsed: !expanded }">
    <div class="floating-player-dock">
      <div class="floating-player-card">
        <FuiMusicWidget />
      </div>
      <button
        class="player-ear"
        :title="expanded ? '收起' : '展开'"
        @click="$emit('toggle')"
      >
        <span class="ear-arrow">{{ expanded ? "◀" : "▶" }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.floating-player {
  --player-left-offset: 28px;
  --player-ear-width: 22px;
  position: fixed;
  left: var(--player-left-offset);
  bottom: 140px;
  z-index: 80;
  transform: scale(0.92);
  transform-origin: bottom left;
  pointer-events: none;
}

.floating-player-dock {
  display: flex;
  align-items: center;
  transform: translateX(0);
  transition: transform 0.36s cubic-bezier(0.33, 1, 0.68, 1);
  will-change: transform;
  pointer-events: none;
}

.floating-player.collapsed .floating-player-dock {
  transform: translateX(
    calc(-100% + var(--player-ear-width) - var(--player-left-offset))
  );
}

.floating-player-card {
  width: max-content;
  flex-shrink: 0;
  pointer-events: auto;
}

.player-ear {
  flex-shrink: 0;
  width: var(--player-ear-width);
  height: 180px;
  border: 1px solid var(--fui-border-color);
  border-left: none;
  border-radius: 0 10px 10px 0;
  background: var(--surface-strong);
  color: var(--fui-cyan);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
  padding: 0;
  pointer-events: auto;
  font-family: var(--font-mono);
  font-size: 0.68rem;
}

.player-ear:hover {
  background: var(--fui-hover-bg, color-mix(in srgb, var(--accent) 8%, transparent));
}

.ear-arrow {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  letter-spacing: 0.1em;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.player-ear:hover .ear-arrow {
  opacity: 1;
}

.floating-player.collapsed .player-ear {
  border-left: 1px solid var(--fui-border-color);
  border-radius: 0 10px 10px 0;
}

@media (max-width: 820px) {
  .floating-player {
    --player-left-offset: 10px;
    --player-ear-width: 20px;
    bottom: 16px;
    max-width: calc(100vw - 16px);
    transform: scale(0.78);
  }

  .floating-player-card {
    max-width: calc((100vw - 16px) / 0.78 - var(--player-ear-width));
  }

  .player-ear {
    height: 128px;
  }
}
</style>
