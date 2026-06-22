<script setup lang="ts">
import { RouterLink } from "vue-router";
import type { NavigationItem } from "../composables/useNavigationItems";
import { useIsActiveRoute } from "../lib/route";

const props = defineProps<{
  items: NavigationItem[];
  visible: boolean;
  activeRoutePath: string;
}>();

const { isActiveRoute } = useIsActiveRoute();
</script>

<template>
  <Transition name="rail-slide">
    <nav
      v-if="visible"
      class="diagonal-rail"
      aria-label="主导航"
    >
      <div class="glow-frame" aria-hidden="true"></div>
      <div class="glow-frame-inner" aria-hidden="true"></div>
      <div class="diagonal-rail-inner">
        <RouterLink
          v-for="(item, index) in items.filter((i) => !i.hide)"
          :key="item.jump ? item.to : ''"
          :to="item.jump ? item.to : ''"
          class="diagonal-link"
          :class="{ active: isActiveRoute(item.to) }"
          @click="item.fn?.()"
        >
          <span class="nav-dot"></span>
          <span class="nav-card-index">{{
            String(index + 1).padStart(2, "0")
          }}</span>
          <span class="nav-label">{{ item.label }}</span>
          <span class="nav-sublabel">{{ item.name }}</span>
        </RouterLink>
      </div>
    </nav>
  </Transition>
</template>

<style scoped>
.diagonal-rail {
  position: absolute;
  top: 0;
  right: 4px;
  width: 54px;
  height: 100%;
  z-index: 40;
  overflow: visible;
  pointer-events: auto;
}

.diagonal-rail-inner {
  position: absolute;
  right: 10px;
  top: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 28px;
  height: auto;
  pointer-events: auto;
  transform: translateY(-50%);
  transform-origin: center;
}

.diagonal-link {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  width: max-content;
  min-height: 22px;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: var(--text-muted);
  text-decoration: none;
  font-family: var(--font-hud);
  font-size: 0.6rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  transition:
    color 0.25s ease,
    transform 0.25s ease,
    opacity 0.25s ease,
    text-shadow 0.25s ease;
}

.diagonal-link::after {
  content: "";
  position: absolute;
  top: 14px;
  right: -6px;
  bottom: auto;
  width: 1px;
  height: 0;
  background: currentColor;
  opacity: 0.45;
  transition: height 0.25s ease;
}

.diagonal-link:hover,
.diagonal-link.active {
  color: var(--accent);
  transform: translateX(-6px);
  text-shadow:
    0 0 8px color-mix(in srgb, var(--accent) 46%, transparent),
    0 0 18px color-mix(in srgb, var(--accent) 14%, transparent);
}

.diagonal-link:hover::after,
.diagonal-link.active::after {
  height: calc(100% - 12px);
}

.nav-dot {
  display: block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 4px currentColor;
  flex-shrink: 0;
}

.nav-card-index {
  display: none;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 0.52rem;
  opacity: 0.68;
}

.diagonal-link.active .nav-dot {
  box-shadow: 0 0 8px var(--accent);
}

.nav-sublabel {
  display: none;
  grid-column: 2;
  font-family: var(--font-mono);
  font-size: 0.48rem;
  opacity: 0.32;
  letter-spacing: 0.08em;
  transition: opacity 0.25s ease;
}

.diagonal-link:hover .nav-sublabel {
  opacity: 0.6;
}

.glow-frame {
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  background: linear-gradient(
    180deg,
    transparent 0%,
    var(--fui-cyan) 15%,
    var(--fui-cyan) 50%,
    var(--fui-cyan) 85%,
    transparent 100%
  );
  box-shadow:
    0 0 8px var(--fui-cyan),
    0 0 20px var(--fui-cyan-dim);
  opacity: 0.82;
  animation: frame-pulse 4s ease-in-out infinite;
  pointer-events: none;
}

.glow-frame-inner {
  position: absolute;
  top: 10%;
  right: 12px;
  width: 1px;
  height: 80%;
  background: linear-gradient(
    180deg,
    transparent 0%,
    var(--fui-cyan-dim) 20%,
    var(--fui-cyan-dim) 80%,
    transparent 100%
  );
  opacity: 0.25;
  pointer-events: none;
}

.nav-label {
  writing-mode: vertical-rl;
  white-space: nowrap;
}

@keyframes frame-pulse {
  0%,
  100% {
    opacity: 0.35;
  }

  50% {
    opacity: 0.7;
  }
}

.rail-slide-enter-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

.rail-slide-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.rail-slide-enter-from {
  opacity: 0;
  transform: translateX(24px);
}

.rail-slide-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

@media (max-width: 1280px) {
  .diagonal-rail {
    position: relative;
    top: auto;
    right: auto;
    order: 2;
    width: 100%;
    height: auto;
    margin-top: -10px;
    padding: 0 0 2px;
    z-index: 5;
  }

  .diagonal-rail .glow-frame,
  .diagonal-rail .glow-frame-inner {
    display: none;
  }

  .diagonal-rail-inner {
    position: relative;
    top: auto;
    right: auto;
    flex-direction: row;
    align-items: stretch;
    justify-content: flex-start;
    gap: 10px;
    width: 100%;
    padding: 2px 2px 10px;
    overflow-x: auto;
    transform: none;
    scroll-snap-type: x proximity;
  }

  .diagonal-link {
    flex: 0 0 auto;
    min-width: 74px;
    padding: 8px 10px;
    border: 1px solid
      color-mix(in srgb, var(--fui-border-color) 60%, transparent);
    background: color-mix(in srgb, var(--surface) 72%, transparent);
    scroll-snap-align: start;
  }
}
</style>
