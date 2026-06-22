<script setup lang="ts">
import { requestHeadingVisible } from "../lib/tocKey";
import type { TocReadyState } from "../lib/tocKey";
import type { HeadingItem } from "./MarkdownRenderer.vue";

const props = defineProps<{
  headings: HeadingItem[];
  activeId: string | null;
  readyState: TocReadyState;
  visible: boolean;
  showToc: boolean;
}>();

function scrollToHeading(id: string) {
  if (!props.readyState.readyIds.has(id)) {
    return;
  }
  requestHeadingVisible(id);
}
</script>

<template>
  <div
    class="left-panel-toc-wrap"
    :class="{ hidden: !visible, empty: !showToc }"
  >
    <nav v-if="showToc" class="toc" aria-label="目录">
      <div class="toc-title-row">
        <h4 class="toc-title">目录</h4>
        <span
          >{{
            readyState.ready
              ? headings.length
              : readyState.indexed
          }}/{{ headings.length }} SECTIONS</span
        >
      </div>
      <ul class="toc-list">
        <li
          v-for="h in headings"
          :key="h.id"
          class="toc-item"
          :class="{
            [`toc-level-${h.level}`]: true,
            'toc-active': activeId === h.id,
            'toc-disabled': !readyState.readyIds.has(h.id),
          }"
        >
          <a
            class="toc-link"
            :href="`#${h.id}`"
            :aria-disabled="!readyState.readyIds.has(h.id)"
            :tabindex="readyState.readyIds.has(h.id) ? 0 : -1"
            @click.prevent="scrollToHeading(h.id)"
          >
            <span class="toc-dot" aria-hidden="true"></span>
            {{ h.text }}
          </a>
        </li>
      </ul>
    </nav>
    <div v-else class="toc-empty">
      <span class="toc-empty-icon">◈</span>
    </div>
  </div>
</template>

<style scoped>
.left-panel-toc-wrap {
  position: relative;
  z-index: 10;
  flex: 1;
  min-height: min(360px, calc(100dvh - 170px));
  min-width: 0;
  width: 100%;
  max-height: 1000px;
  opacity: 1;
  transform: translateX(0) scale(1);
  transform-origin: left center;
  transition:
    width 0.46s ease,
    opacity 0.46s ease,
    transform 0.46s ease,
    max-height 0.46s ease;
  animation: toc-wrap-pop 0.42s cubic-bezier(0.2, 0.85, 0.24, 1) both;
}

.left-panel-toc-wrap.hidden {
  width: 0;
  max-height: 0;
  opacity: 0;
  transform: translateX(-30px) scale(0.94);
  pointer-events: none;
}

.left-panel-toc-wrap.empty {
  flex: 0 0 auto;
  min-height: 42px;
  max-height: 42px;
}

.toc-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--line) 58%, transparent);
  white-space: nowrap;
  overflow: hidden;
  animation: toc-title-slide 0.38s cubic-bezier(0.2, 0.85, 0.24, 1) both;
}

.toc-title-row span {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  opacity: 0.58;
}

.toc {
  height: auto;
  max-height: min(620px, calc(100dvh - 190px));
  min-height: min(320px, calc(100dvh - 210px));
  overflow-y: auto;
  padding: 14px 10px 14px 14px;
  border: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
  border-radius: 2px;
  background:
    linear-gradient(90deg, rgba(184, 255, 202, 0.04), transparent 36%),
    var(--terminal-overlay);
  font-family: var(--font-mono);
  font-size: 0.76rem;
  line-height: 1.6;
  margin-right: 8%;
  transform-origin: top left;
  animation: toc-panel-unfold 0.56s 0.16s cubic-bezier(0.2, 0.85, 0.24, 1) both;
}

.toc-title {
  margin: 0;
  font-family: var(--font-hud);
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  color: var(--accent);
  text-transform: uppercase;
  opacity: 0.7;
}

.toc-preparing {
  margin: -2px 0 10px;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  opacity: 0.62;
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1px;
  animation: toc-list-reveal 0.36s 0.24s ease both;
}

.toc-item {
  padding: 0;
  opacity: 0;
  transform: translate3d(-12px, -4px, 0);
  animation: toc-item-in 0.36s cubic-bezier(0.2, 0.85, 0.24, 1) both;
}

.toc-item:nth-child(1) {
  animation-delay: 0.34s;
}

.toc-item:nth-child(2) {
  animation-delay: 0.38s;
}

.toc-item:nth-child(3) {
  animation-delay: 0.42s;
}

.toc-item:nth-child(4) {
  animation-delay: 0.46s;
}

.toc-item:nth-child(5) {
  animation-delay: 0.5s;
}

.toc-item:nth-child(n + 6) {
  animation-delay: 0.54s;
}

.toc-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  text-decoration: none;
  padding: 5px 0;
  border-radius: 4px;
  transition:
    color 0.2s ease,
    padding-left 0.2s ease,
    background 0.2s ease;
}

.toc-link:hover {
  color: var(--text-main);
  padding-left: 8px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--accent-soft) 62%, transparent),
    transparent
  );
}

.toc-disabled .toc-link {
  cursor: wait;
  opacity: 0.48;
}

.toc-disabled .toc-link:hover {
  color: var(--text-muted);
  padding-left: 0;
  background: transparent;
}

@keyframes toc-wrap-pop {
  from {
    opacity: 0;
    transform: translate3d(-34px, 0, 0) scaleX(0.86);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scaleX(1);
  }
}

@keyframes toc-title-slide {
  from {
    opacity: 0;
    clip-path: inset(0 100% 0 0);
    transform: translate3d(-16px, 0, 0);
  }

  to {
    opacity: 1;
    clip-path: inset(0 0 0 0);
    transform: translate3d(0, 0, 0);
  }
}

@keyframes toc-panel-unfold {
  from {
    opacity: 0.72;
    clip-path: inset(0 0 100% 0);
    transform: scaleY(0.22);
  }

  to {
    opacity: 1;
    clip-path: inset(0 0 0 0);
    transform: scaleY(1);
  }
}

@keyframes toc-list-reveal {
  from {
    opacity: 0;
    transform: translate3d(-8px, 0, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes toc-item-in {
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

.toc-active .toc-link {
  color: var(--accent);
}

.toc-dot {
  flex-shrink: 0;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--line);
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.toc-active .toc-dot {
  background: var(--accent);
  transform: scale(1.4);
}

.toc-level-3 .toc-link {
  padding-left: 14px;
  font-size: 0.72rem;
}

.toc-level-4 .toc-link,
.toc-level-5 .toc-link,
.toc-level-6 .toc-link {
  padding-left: 24px;
  font-size: 0.68rem;
  opacity: 0.82;
}

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

.toc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--text-muted);
  opacity: 0.4;
  letter-spacing: 0.04em;
  line-height: 1.8;
}

.toc-empty-icon {
  font-size: 1.2rem;
  opacity: 0.5;
}

@media (max-width: 820px) {
  .left-panel-toc-wrap {
    min-height: min(390px, 56dvh);
  }

  .toc {
    max-height: min(420px, 54dvh);
    min-height: min(340px, 48dvh);
    margin-right: 0;
  }
}

@media (max-width: 560px) {
  .left-panel-toc-wrap {
    min-height: min(360px, 54dvh);
  }

  .toc {
    max-height: min(390px, 52dvh);
    min-height: min(320px, 46dvh);
  }
}
</style>
