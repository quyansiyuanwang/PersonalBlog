<script setup lang="ts">
import { useRouteSearch } from "../composables/useRouteSearch";

const {
  routeSearchQuery,
  routeSearchFocused,
  routeSearchResults,
  showRouteSearchResults,
  goToRouteSearchItem,
  submitRouteSearch,
} = useRouteSearch();
</script>

<template>
  <form
    class="route-search"
    role="search"
    @submit.prevent="submitRouteSearch"
  >
    <span class="route-search-prefix">SEARCH</span>
    <input
      v-model="routeSearchQuery"
      type="search"
      autocomplete="off"
      spellcheck="false"
      placeholder="pages / posts"
      aria-label="搜索页面和文章"
      @focus="routeSearchFocused = true"
      @blur="routeSearchFocused = false"
    />
    <Transition name="route-search-pop">
      <div
        v-if="showRouteSearchResults"
        class="route-search-results"
      >
        <button
          v-for="(item, index) in routeSearchResults"
          :key="item.to"
          type="button"
          class="route-search-result"
          :style="{ '--result-index': index }"
          @mousedown.prevent="goToRouteSearchItem(item)"
        >
          <strong>{{ item.title }}</strong>
          <small>{{ item.subtitle }}</small>
        </button>
        <p
          v-if="routeSearchResults.length === 0"
          class="route-search-empty"
        >
          NO SIGNAL
        </p>
      </div>
    </Transition>
  </form>
</template>

<style scoped>
.route-search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(320px, 42vw);
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--line) 78%, transparent);
  border-radius: 2px;
  background: color-mix(in srgb, var(--surface) 76%, transparent);
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.route-search-prefix {
  color: var(--accent);
  font-size: 0.58rem;
  letter-spacing: 0.14em;
  opacity: 0.72;
}

.route-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-main);
  font: inherit;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
}

.route-search input::placeholder {
  color: var(--text-muted);
  opacity: 0.58;
}

.route-search-results {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 30;
  display: grid;
  gap: 6px;
  width: min(360px, 72vw);
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--fui-border-color) 86%, var(--line));
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-soft) 70%, transparent),
      transparent 46%
    ),
    var(--surface-strong);
  box-shadow: 0 18px 36px color-mix(in srgb, var(--black) 20%, transparent);
  overflow: hidden;
  transform-origin: top right;
  will-change: opacity, transform, clip-path;
}

.route-search-pop-enter-active,
.route-search-pop-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.28s cubic-bezier(0.19, 1, 0.22, 1),
    clip-path 0.28s cubic-bezier(0.19, 1, 0.22, 1);
}

.route-search-pop-enter-from,
.route-search-pop-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
  clip-path: inset(0 0 100% 0);
}

.route-search-pop-enter-to,
.route-search-pop-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
  clip-path: inset(0 0 0 0);
}

.route-search-result {
  display: grid;
  gap: 2px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-main);
  font: inherit;
  text-align: left;
  cursor: pointer;
  animation: route-search-result-in 0.26s ease both;
  animation-delay: calc(var(--result-index, 0) * 36ms + 40ms);
}

.route-search-result:hover {
  border-color: var(--accent);
  background: var(--nav-hover-bg);
}

.route-search-result strong {
  font-size: 0.68rem;
  letter-spacing: 0.12em;
}

.route-search-result small,
.route-search-empty {
  color: var(--text-muted);
  font-size: 0.58rem;
  letter-spacing: 0.1em;
}

.route-search-empty {
  margin: 0;
  padding: 8px 10px;
  animation: route-search-result-in 0.26s ease both 40ms;
}

@keyframes route-search-result-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 820px) {
  .route-search {
    width: 100%;
    min-height: 40px;
  }

  .route-search-results {
    left: 0;
    right: 0;
    width: 100%;
    max-height: min(58dvh, 420px);
    overflow-y: auto;
    transform-origin: top center;
  }

  .route-search-result {
    padding: 10px 11px;
  }
}
</style>
