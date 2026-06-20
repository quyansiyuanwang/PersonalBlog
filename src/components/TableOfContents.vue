<script setup lang="ts">
import { computed } from 'vue'
import type { HeadingItem } from './MarkdownRenderer.vue'

const props = defineProps<{
  headings: HeadingItem[]
  activeId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const visibleHeadings = computed(() =>
  props.headings.filter((h) => h.level <= 3),
)

function handleClick(id: string) {
  emit('select', id)
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<template>
  <nav v-if="visibleHeadings.length > 0" class="toc" aria-label="目录">
    <h4 class="toc-title">目录</h4>
    <ul class="toc-list">
      <li
        v-for="h in visibleHeadings"
        :key="h.id"
        class="toc-item"
        :class="{
          [`toc-level-${h.level}`]: true,
          'toc-active': activeId === h.id,
        }"
      >
        <a
          class="toc-link"
          :href="`#${h.id}`"
          @click.prevent="handleClick(h.id)"
        >
          <span class="toc-dot" aria-hidden="true"></span>
          {{ h.text }}
        </a>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.toc {
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  padding: 0 0 0 20px;
  border-left: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  line-height: 1.6;
  user-select: none;
}

.toc-title {
  margin: 0 0 14px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  color: var(--accent);
  text-transform: uppercase;
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
}

.toc-item {
  padding: 0;
}

.toc-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  text-decoration: none;
  padding: 4px 0;
  transition: color 0.2s ease, padding-left 0.2s ease;
}

.toc-link:hover {
  color: var(--text-main);
  padding-left: 4px;
}

.toc-active .toc-link {
  color: var(--accent);
}

.toc-dot {
  flex-shrink: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--line);
  transition: background 0.2s ease, transform 0.2s ease;
}

.toc-active .toc-dot {
  background: var(--accent);
  transform: scale(1.4);
}

/* Indentation by heading level */
.toc-level-2 .toc-link {
  padding-left: 0;
}

.toc-level-3 .toc-link {
  padding-left: 14px;
  font-size: 0.73rem;
}

/* Scrollbar */
.toc::-webkit-scrollbar {
  width: 3px;
}

.toc::-webkit-scrollbar-thumb {
  background: var(--accent-soft);
  border-radius: 3px;
}

.toc::-webkit-scrollbar-track {
  background: transparent;
}
</style>
