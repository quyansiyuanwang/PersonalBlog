<script setup lang="ts">
defineProps<{
  subtitle: string;
  theme: "dark" | "light";
  isDesktop: boolean;
}>();

defineEmits<{
  toggleTheme: [];
}>();
</script>

<template>
  <div class="status-bar">
    <div v-if="isDesktop" class="status-bar-section">
      <span class="status-bar-dot"></span>
      <span class="status-bar-sep">|</span>
      <span>STATUS <span class="path-sep">://</span> MONITOR</span>
    </div>
    <div class="status-bar-section status-bar-dynamic">
      <span class="status-bar-sep">|</span>
      <span class="status-bar-subtitle" :title="subtitle">{{ subtitle }}</span>
      <button
        class="theme-toggle"
        type="button"
        :aria-label="theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'"
        @click="$emit('toggleTheme')"
      >
        <span>THEME</span>
        <span class="path-sep">://</span>
        <span>{{ theme === "dark" ? "DARK" : "LIGHT" }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.status-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  margin: 0 auto;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 32px;
  padding: 6px 20px;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  line-height: 1;
  letter-spacing: 0.06em;
  background: var(--status-bar-bg);
  border-bottom: 1px solid var(--accent-soft);
  border-radius: 0 0 10px 10px;
  color: var(--text-muted);
  backdrop-filter: blur(8px);
  user-select: none;
}

.status-bar-section {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 12px;
}

.status-bar-dynamic {
  flex: 1 1 auto;
  justify-content: flex-end;
  overflow: hidden;
}

.status-bar-subtitle {
  display: block;
  flex: 0 1 38ch;
  min-width: 10ch;
  max-width: clamp(16ch, 36vw, 42ch);
  overflow: hidden;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-bar-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.status-bar-sep {
  opacity: 0.3;
}

.status-bar .path-sep {
  color: var(--accent);
  opacity: 0.7;
}

.status-bar-id {
  color: var(--accent);
  opacity: 0.8;
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 8px;
  min-height: 24px;
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  transition: all 0.2s ease;
  cursor: pointer;
}

.theme-toggle:hover {
  background: var(--nav-hover-bg);
  color: var(--text-main);
  border-color: var(--accent);
}

.theme-toggle .path-sep {
  color: var(--accent);
}

@media (max-width: 980px) {
  .status-bar {
    border-radius: 0;
  }
}

@media (max-width: 820px) {
  .status-bar {
    height: 30px;
    gap: 8px;
    justify-content: flex-end;
    padding: 5px 10px;
    font-size: 0.62rem;
    letter-spacing: 0.03em;
    overflow: hidden;
  }

  .status-bar-section {
    min-width: 0;
    gap: 7px;
  }

  .status-bar-section:first-child {
    flex: 0 1 auto;
    overflow: hidden;
    white-space: nowrap;
  }

  .status-bar-dynamic {
    flex: 1 1 100%;
    justify-content: flex-end;
    width: 100%;
    gap: 7px;
  }

  .status-bar-subtitle {
    flex: 1 1 auto;
    max-width: none;
  }

  .status-bar-id {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .status-bar-section.gap\+2 {
    display: none;
  }
}
</style>
