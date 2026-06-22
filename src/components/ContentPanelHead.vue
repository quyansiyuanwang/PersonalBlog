<script setup lang="ts">
import { computed } from "vue";
import RouteSearch from "./RouteSearch.vue";

const props = defineProps<{
  routePath: string;
}>();

const routeLabel = computed(() => {
  const path = props.routePath;
  if (path === "/") return "ROUTES";
  if (path === "/home") return "HOME";
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join(" / ")
    .toUpperCase();
});
</script>

<template>
  <div class="content-panel-head">
    <div class="route-head-left">
      <p class="rail-label">
        ROUTE <span class="path-sep">://</span>
        {{ routeLabel }}
      </p>
    </div>
    <RouteSearch />
  </div>
</template>

<style scoped>
.content-panel-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 4px 0;
  margin-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--line) 84%, transparent);
}

.rail-label {
  margin: 0;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
}

.route-head-left {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.path-sep {
  color: var(--accent);
  opacity: 0.7;
}

.route-back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  line-height: 1;
  color: var(--accent);
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--line) 60%, transparent);
  border-radius: 3px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s;
  margin-bottom: 2px;
}

.route-back-btn:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.route-back-btn:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 2px;
}

@media (max-width: 820px) {
  .content-panel-head {
    padding-left: 0;
    padding-right: 0;
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }
}

@media (max-width: 560px) {
  .content-panel-head {
    margin-bottom: 12px;
  }
}
</style>
