<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted, onUnmounted } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { siteConfig } from "../lib/site";

const CustomCursor = defineAsyncComponent(() =>
  import("../components/CustomCursor.vue"),
);

const FuiMusicWidget = defineAsyncComponent(() =>
  import("../components/FuiMusicWidget.vue"),
);

const route = useRoute();
const leftPanelCollapsed = ref(false);

const navigationItems = [
  { name: "首页", to: "/", label: "DATA-01" },
  { name: "归档", to: "/archive", label: "DATA-02" },
  { name: "标签", to: "/tags", label: "DATA-03" },
  { name: "关于", to: "/about", label: "DATA-04" },
];

function isActiveRoute(path: string) {
  if (path === "/tags") {
    return route.path.startsWith("/tags");
  }

  return route.path === path;
}

function toggleLeftPanel() {
  leftPanelCollapsed.value = !leftPanelCollapsed.value;
}

function getRouteDisplayLabel(path: string) {
  if (path === "/") {
    return "HOME";
  }

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
}

let onlineTimer: number | null = null;

interface Particle {
  id: number;
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
}

const particles = ref<Particle[]>([]);
onMounted(() => {
  const items: Particle[] = [];
  for (let i = 0; i < 24; i++) {
    items.push({
      id: i,
      left: `${60 + Math.random() * 38}%`,
      top: `${10 + Math.random() * 80}%`,
      size: 2 + Math.random() * 3,
      duration: 10 + Math.random() * 10,
      delay: Math.random() * 8,
      driftX: -10 + Math.random() * 20,
      driftY: -80 - Math.random() * 60,
    });
  }
  particles.value = items;
});

onUnmounted(() => {
  if (onlineTimer) {
    clearInterval(onlineTimer);
  }
});
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
  <CustomCursor />
  <div class="blog-layout-wrapper shell-entered">
    <div class="status-bar shell-enter-1">
      <div class="status-bar-section">
        <span class="status-bar-dot"></span>
        <span class="status-bar-sep">|</span>
        <span>STATUS <span class="path-sep">://</span> MONITOR</span>
      </div>
      <div class="status-bar-section">
        <span class="status-bar-sep">|</span>
        <span>{{ siteConfig.subtitle }}</span>
      </div>
    </div>

    <div class="shell">
      <main
        class="shell-main"
        :class="{
          'reading-mode': route.path !== '/',
          'left-collapsed': leftPanelCollapsed,
        }"
      >
        <aside
          class="left-panel shell-enter-3"
          :class="{ collapsed: leftPanelCollapsed }"
        >
          <div class="left-panel-shell">
            <button
              class="left-panel-toggle"
              :class="{ hidden: leftPanelCollapsed }"
              type="button"
              :aria-expanded="!leftPanelCollapsed"
              aria-label="收起左侧面板"
              @click="toggleLeftPanel"
            >
              <span>MIN</span>
              <span class="path-sep">//</span>
              <span>PANEL</span>
            </button>

            <div
              class="left-panel-player-wrap"
              :class="{ hidden: leftPanelCollapsed }"
            >
              <FuiMusicWidget />
            </div>

            <button
              class="collapsed-vinyl-button"
              :class="{ visible: leftPanelCollapsed }"
              type="button"
              aria-label="展开播放器面板"
              :aria-hidden="!leftPanelCollapsed"
              :tabindex="leftPanelCollapsed ? 0 : -1"
              @click="toggleLeftPanel"
            >
              <span class="collapsed-vinyl-disc">
                <span class="collapsed-vinyl-ring ring-outer"></span>
                <span class="collapsed-vinyl-ring ring-inner"></span>
                <span class="collapsed-vinyl-label"></span>
                <span class="collapsed-vinyl-center"></span>
              </span>
            </button>
          </div>
        </aside>

        <section class="content-panel shell-enter-3">
          <div class="content-panel-shell">
            <div class="content-panel-head">
              <div>
                <p class="rail-label">
                  ROUTE <span class="path-sep">://</span>
                  {{ getRouteDisplayLabel(route.path) }}
                </p>
              </div>
            </div>

            <div class="content-panel-scroll">
              <RouterView v-slot="{ Component }">
                <Transition name="page" mode="out-in">
                  <component
                    :is="Component"
                    :key="
                      String(
                        route.name ?? route.path.split('/')[1] ?? route.path,
                      )
                    "
                  />
                </Transition>
              </RouterView>
            </div>
          </div>
        </section>

        <nav class="diagonal-rail">
          <div class="glow-frame" aria-hidden="true"></div>
          <div class="glow-frame-inner" aria-hidden="true"></div>
          <div class="diagonal-rail-inner">
            <RouterLink
              v-for="item in navigationItems"
              :key="item.to"
              :to="item.to"
              class="diagonal-link"
              :class="{ active: isActiveRoute(item.to) }"
            >
              <span class="nav-dot"></span>
              <span class="nav-label">{{ item.label }}</span>
              <span class="nav-sublabel">{{ item.name }}</span>
            </RouterLink>
          </div>
        </nav>
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell-main {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(480px, 23%) minmax(0, 77%);
  flex: 1;
  min-height: 0;
  transition: grid-template-columns 0.46s ease;
}

.shell-main.left-collapsed {
  grid-template-columns: 116px minmax(0, 1fr);
}

.rail-label {
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
}

.content-panel {
  min-width: 0;
  min-height: 0;
  border-left: 1px solid var(--line);
  box-shadow: inset 1px 0 0 color-mix(in srgb, var(--line) 56%, transparent);
  padding: 24px 92px 24px 28px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.left-panel {
  min-width: 0;
  min-height: 0;
  width: 100%;
  padding: 24px;
  overflow: hidden;
  transition:
    padding 0.46s ease,
    width 0.46s ease;
  background: transparent;
}

.left-panel-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 24px;
  width: 100%;
  height: 100%;
  padding: 28px;
  border: 1px solid var(--fui-border-color);
  border-radius: 28px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-strong) 88%, transparent),
      transparent
    ),
    var(--fui-widget-bg);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--fui-border-color) 58%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 24px 60px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  transition:
    width 0.46s ease,
    padding 0.46s ease,
    border-radius 0.46s ease,
    box-shadow 0.46s ease,
    background 0.46s ease,
    transform 0.46s ease;
}

.left-panel-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: flex-end;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid color-mix(in srgb, var(--fui-border-color) 94%, var(--line));
  border-radius: 999px;
  background: color-mix(in srgb, var(--fui-widget-bg) 70%, transparent);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  max-height: 42px;
  overflow: hidden;
  opacity: 1;
  transform: translateX(0) scale(1);
  transform-origin: top right;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease,
    opacity 0.46s ease,
    transform 0.46s ease,
    max-height 0.46s ease,
    margin 0.46s ease,
    padding 0.46s ease,
    width 0.46s ease,
    border-width 0.46s ease;
}

.left-panel-toggle:hover {
  color: var(--text-main);
  border-color: var(--accent);
  background: var(--nav-hover-bg);
}

.left-panel-toggle.hidden {
  width: 0;
  max-height: 0;
  padding-left: 0;
  padding-right: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin: 0;
  opacity: 0;
  transform: translateX(18px) scale(0.96);
  pointer-events: none;
  border-width: 0;
}

.left-panel-player-wrap {
  flex: 1;
  min-height: 0;
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
}

.left-panel-player-wrap.hidden {
  width: 0;
  max-height: 0;
  opacity: 0;
  transform: translateX(-30px) scale(0.94);
  pointer-events: none;
}

.left-panel.collapsed {
  padding: 24px 14px;
}

.left-panel.collapsed .left-panel-shell {
  align-items: center;
  justify-content: space-between;
  width: 88px;
  padding: 18px 10px;
  border-radius: 24px;
  transform: translateX(-2px);
}

.left-panel.collapsed .left-panel-toggle {
  align-self: center;
}

.collapsed-vinyl-button {
  position: relative;
  align-self: center;
  width: 72px;
  height: 72px;
  margin-top: auto;
  margin-bottom: auto;
  border: 1px solid color-mix(in srgb, var(--fui-border-color) 94%, var(--line));
  border-radius: 50%;
  background:
    radial-gradient(
      circle at 35% 30%,
      rgba(255, 255, 255, 0.16),
      transparent 30%
    ),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-strong) 80%, transparent),
      transparent
    ),
    var(--fui-widget-bg);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 18px 30px rgba(0, 0, 0, 0.14);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  opacity: 0;
  transform: translateX(-18px) scale(0.84);
  pointer-events: none;
  transition:
    transform 0.46s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.46s ease;
}

.collapsed-vinyl-button.visible {
  opacity: 1;
  transform: translateX(0) scale(1);
  pointer-events: auto;
}

.collapsed-vinyl-button:hover {
  transform: translateX(-2px) scale(1.03);
  border-color: var(--accent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 22px 36px rgba(0, 0, 0, 0.16);
}

.collapsed-vinyl-disc {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: radial-gradient(
    circle at center,
    #1b1b1b 0 17%,
    #090909 18% 34%,
    #121212 35% 54%,
    #050505 55% 100%
  );
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 0 14px rgba(255, 255, 255, 0.05);
}

.collapsed-vinyl-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.collapsed-vinyl-ring.ring-outer {
  inset: 7px;
}

.collapsed-vinyl-ring.ring-inner {
  inset: 16px;
}

.collapsed-vinyl-label {
  position: absolute;
  inset: 50%;
  width: 16px;
  height: 16px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent) 38%, #1f1f1f),
    #121212 72%
  );
}

.collapsed-vinyl-center {
  position: absolute;
  inset: 50%;
  width: 4px;
  height: 4px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: #d2d2d2;
}

.diagonal-rail {
  position: absolute;
  top: 0;
  right: 0;
  width: 64px;
  height: 100%;
  z-index: 2;
  pointer-events: none;
}

.diagonal-rail-inner {
  position: fixed;
  right: 10px;
  top: 50%;
  height: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 32px;
  pointer-events: auto;
  transform: perspective(600px) rotateY(-12deg) skewY(4deg) translateY(-50%);
  transform-origin: right center;
}

.diagonal-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border: 1px solid transparent;
  border-radius: 16px;
  color: var(--text-muted);
  text-decoration: none;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  writing-mode: vertical-rl;
  transition:
    color 0.25s ease,
    border-color 0.25s ease,
    background 0.25s ease;
}

.diagonal-link:hover,
.diagonal-link.active {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--line) 88%, transparent);
  background: color-mix(in srgb, var(--fui-widget-bg) 82%, transparent);
}

.nav-dot {
  display: block;
  width: 3px;
  height: 3px;
  margin-bottom: 4px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 4px currentColor;
  flex-shrink: 0;
}

.diagonal-link.active .nav-dot {
  box-shadow: 0 0 8px var(--accent);
}

.nav-sublabel {
  font-size: 0.65rem;
  opacity: 0.45;
  writing-mode: vertical-rl;
  letter-spacing: 0.4em;
  transition: opacity 0.25s ease;
}

.diagonal-link:hover .nav-sublabel {
  opacity: 0.6;
}

.glow-frame {
  position: absolute;
  top: 0;
  right: 0;
  width: 2px;
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
  opacity: 0.68;
  animation: frame-pulse 4s ease-in-out infinite;
  pointer-events: none;
}

.glow-frame-inner {
  position: absolute;
  top: 10%;
  right: 6px;
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
  white-space: nowrap;
}

.content-panel-shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  min-height: 0;
}

.content-panel-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 4px 0;
  margin-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--line) 84%, transparent);
}

.content-panel-scroll {
  min-height: 0;
  max-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 10px 40px 4px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.content-panel-scroll::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.content-panel-scroll::-webkit-scrollbar-track,
.content-panel-scroll::-webkit-scrollbar-thumb {
  background: transparent;
}

.content-panel-scroll::-webkit-scrollbar-thumb {
  border-radius: 0;
  border: 0;
}

.reading-mode .content-panel {
  padding-left: 28px;
  padding-right: 100px;
}

.reading-mode .content-panel-scroll {
  padding-left: 4px;
}

.reading-mode .content-panel-scroll > * {
  width: 100%;
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

@media (max-width: 1100px) {
  .shell-main {
    grid-template-columns: 1fr;
    height: auto;
  }

  .diagonal-rail {
    display: none;
  }

  .left-panel {
    padding: 24px 24px 0;
  }

  .content-panel {
    padding: 28px;
    border-left: 0;
  }

  .content-panel-shell,
  .content-panel-scroll {
    height: auto;
  }

  .content-panel-scroll {
    overflow: visible;
    padding: 8px 0 28px;
  }

  .reading-mode .content-panel {
    padding-left: 28px;
    padding-right: 28px;
  }

  .reading-mode .content-panel-scroll {
    padding-left: 0;
  }
}

@media (max-width: 980px) {
  .shell-main {
    grid-template-columns: minmax(250px, 32%) minmax(0, 68%);
  }

  .shell-main.left-collapsed {
    grid-template-columns: 104px minmax(0, 1fr);
  }

  .left-panel {
    padding: 18px;
  }

  .left-panel-shell {
    padding: 20px;
    border-radius: 24px;
  }

  .content-panel {
    padding-left: 22px;
  }
}

@media (max-width: 820px) {
  .shell-main {
    grid-template-columns: 1fr;
  }

  .left-panel {
    padding: 18px 18px 0;
  }

  .left-panel-shell {
    padding: 18px;
    border-radius: 18px;
  }

  .content-panel {
    padding: 20px;
  }

  .content-panel-head {
    padding-left: 0;
    padding-right: 0;
  }
}
</style>
