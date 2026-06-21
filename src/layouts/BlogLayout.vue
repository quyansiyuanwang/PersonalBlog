<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  ref,
  onMounted,
  onUnmounted,
  watch,
} from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { useSubtitle } from "../lib/subtitle";
import { useTocState } from "../lib/tocKey";
import { warmupBackgroundResources } from "../lib/startup";
import router from "../router/index.ts";

const CustomCursor = defineAsyncComponent(
  () => import("../components/CustomCursor.vue"),
);

const FuiMusicWidget = defineAsyncComponent(
  () => import("../components/FuiMusicWidget.vue"),
);

const route = useRoute();
const leftPanelCollapsed = ref(false);
const isPostRoute = computed(() => route.path.startsWith("/post"));
const isLeftPanelHalfCollapsed = ref(false);
const subtitle = useSubtitle();
const playerExpanded = ref(true);
const cubeTiltX = ref(-12);
const cubeTiltY = ref(18);
const isCubeVisible = ref(false);
const cubePosition = ref({ x: 28, y: 22 });
const isCubeDragging = ref(false);
const cubeFragments = ref<CubeFragment[]>([]);
const shellMainRef = ref<HTMLElement | null>(null);
const contentScrollRef = ref<HTMLElement | null>(null);
let leftPanelAnimationFrame: number | null = null;
let cubePhysicsFrame: number | null = null;
let cubeFragmentTimer: number | null = null;
let cubeDragOffset = { x: 0, y: 0 };
let cubeVelocity = { x: 0, y: 0 };
let cubeAngularVelocity = { x: 0, y: 0 };
let cubeAngularAcceleration = { x: 0, y: 0 };
let lastCubePointer = { x: 0, y: 0, time: 0 };

interface CubeFragment {
  id: number;
  originX: number;
  originY: number;
  x: number;
  y: number;
  rotate: number;
  size: number;
}

// ── TOC data from active post view ──
const { headings: tocHeadings, activeId: tocActiveId, showToc } = useTocState();

const navigationItems = [
  { name: "首页", to: "/home", label: "HOME", jump: true, hide: false },
  { name: "归档", to: "/archive", label: "ARCHIVE", jump: true, hide: false },
  { name: "标签", to: "/tags", label: "TAGS", jump: true, hide: false },
  { name: "关于", to: "/about", label: "ABOUT", jump: true, hide: false },
  {
    name: "返回",
    to: "/back",
    label: "BACK",
    jump: false,
    fn: () => router.replace("/"),
    hide: false,
  },
];

function isActiveRoute(path: string) {
  if (path === "/tags") {
    return route.path.startsWith("/tags");
  }

  return route.path === path;
}

function getExpandedLeftWidth(shellWidth: number) {
  return Math.round(shellWidth * 0.4);
}

function getHalfCollapsedLeftWidth(shellWidth: number) {
  return Math.round(shellWidth * 0.22);
}

function getCollapsedLeftWidth() {
  return 116;
}

function easeOutQuart(progress: number) {
  return 1 - Math.pow(1 - progress, 4);
}

function getTargetLeftWidth(shellWidth: number) {
  if (leftPanelCollapsed.value) {
    return getCollapsedLeftWidth();
  }

  return isLeftPanelHalfCollapsed.value
    ? getHalfCollapsedLeftWidth(shellWidth)
    : getExpandedLeftWidth(shellWidth);
}

function animateLeftPanelTo(targetWidth: number) {
  const shellMain = shellMainRef.value;

  if (!shellMain) {
    return;
  }

  if (leftPanelAnimationFrame) {
    cancelAnimationFrame(leftPanelAnimationFrame);
    leftPanelAnimationFrame = null;
  }

  const shellWidth = shellMain.getBoundingClientRect().width;
  const startWidth = shellWidth * getComputedLeftRatio(shellMain);
  const duration = 520;
  const startedAt = performance.now();

  const tick = (now: number) => {
    const elapsed = now - startedAt;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutQuart(progress);
    const currentWidth = startWidth + (targetWidth - startWidth) * eased;

    shellMain.style.gridTemplateColumns = `${currentWidth}px minmax(0, 1fr)`;

    if (progress < 1) {
      leftPanelAnimationFrame = requestAnimationFrame(tick);
      return;
    }

    leftPanelAnimationFrame = null;
    shellMain.style.gridTemplateColumns = `${targetWidth}px minmax(0, 1fr)`;
  };

  leftPanelAnimationFrame = requestAnimationFrame(tick);
}

function getComputedLeftRatio(shellMain: HTMLElement) {
  const columns = window.getComputedStyle(shellMain).gridTemplateColumns;
  const leftColumn = Number.parseFloat(columns.split(" ")[0] ?? "0");
  const shellWidth = shellMain.getBoundingClientRect().width;

  if (!shellWidth || !leftColumn) {
    if (leftPanelCollapsed.value) {
      return getCollapsedLeftWidth() / Math.max(shellWidth, 1);
    }

    return isLeftPanelHalfCollapsed.value ? 0.22 : 0.4;
  }

  return leftColumn / shellWidth;
}

function syncLeftPanelWidth() {
  const shellMain = shellMainRef.value;
  if (!shellMain || leftPanelAnimationFrame) {
    return;
  }

  const shellWidth = shellMain.getBoundingClientRect().width;
  shellMain.style.gridTemplateColumns = `${getTargetLeftWidth(shellWidth)}px minmax(0, 1fr)`;
}

function scrollToHeading(id: string) {
  const el = document.getElementById(id);
  const scroller = contentScrollRef.value;

  if (el && scroller) {
    const scrollerTop = scroller.getBoundingClientRect().top;
    const targetTop = el.getBoundingClientRect().top;

    scroller.scrollTo({
      top: scroller.scrollTop + targetTop - scrollerTop - 12,
      behavior: "smooth",
    });
  }
}

function tiltSignalCube(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
  const offsetY = (event.clientY - rect.top) / rect.height - 0.5;

  cubeAngularAcceleration = {
    x: cubeAngularAcceleration.x - offsetY * 280,
    y: cubeAngularAcceleration.y + offsetX * 320,
  };
}

function stopCubePhysics() {
  if (cubePhysicsFrame) {
    cancelAnimationFrame(cubePhysicsFrame);
    cubePhysicsFrame = null;
  }
}

function getCubeBounds(target: HTMLElement) {
  const parent = target.offsetParent as HTMLElement | null;

  if (!parent) {
    return null;
  }

  const parentRect = parent.getBoundingClientRect();

  return {
    parentRect,
    maxX: Math.max(parentRect.width - target.offsetWidth - 10, 0),
    maxY: Math.max(parentRect.height - target.offsetHeight - 10, 0),
  };
}

function runCubePhysics(target: HTMLElement) {
  stopCubePhysics();

  let lastTime = performance.now();
  const gravity = 1800;
  const bounce = 0.62;
  const friction = 0.985;
  const angularDrag = 0.992;
  const impactSpin = 0.34;

  const tick = (now: number) => {
    const bounds = getCubeBounds(target);

    if (!bounds || isCubeDragging.value) {
      cubePhysicsFrame = null;
      return;
    }

    const deltaSeconds = Math.min((now - lastTime) / 1000, 0.032);
    lastTime = now;
    cubeVelocity.y += gravity * deltaSeconds;
    cubeVelocity.x *= friction;
    cubeAngularVelocity.x += cubeAngularAcceleration.x * deltaSeconds;
    cubeAngularVelocity.y += cubeAngularAcceleration.y * deltaSeconds;
    cubeAngularVelocity.x *= angularDrag;
    cubeAngularVelocity.y *= angularDrag;
    cubeAngularAcceleration = { x: 0, y: 0 };

    let nextX = cubePosition.value.x + cubeVelocity.x * deltaSeconds;
    let nextY = cubePosition.value.y + cubeVelocity.y * deltaSeconds;

    if (nextX <= 10) {
      nextX = 10;
      cubeVelocity.x = Math.abs(cubeVelocity.x) * bounce;
      cubeAngularVelocity.y += cubeVelocity.y * impactSpin;
    } else if (nextX >= bounds.maxX) {
      nextX = bounds.maxX;
      cubeVelocity.x = -Math.abs(cubeVelocity.x) * bounce;
      cubeAngularVelocity.y -= cubeVelocity.y * impactSpin;
    }

    if (nextY <= 10) {
      nextY = 10;
      cubeVelocity.y = Math.abs(cubeVelocity.y) * bounce;
      cubeAngularVelocity.x -= cubeVelocity.x * impactSpin;
    } else if (nextY >= bounds.maxY) {
      nextY = bounds.maxY;
      cubeVelocity.y = -Math.abs(cubeVelocity.y) * bounce;
      cubeVelocity.x *= 0.82;
      cubeAngularVelocity.x += cubeVelocity.x * impactSpin;
    }

    cubePosition.value = { x: nextX, y: nextY };
    cubeTiltX.value += cubeAngularVelocity.x * deltaSeconds;
    cubeTiltY.value += cubeAngularVelocity.y * deltaSeconds;

    if (
      Math.abs(cubeVelocity.x) < 8 &&
      Math.abs(cubeVelocity.y) < 18 &&
      Math.abs(cubeAngularVelocity.x) < 4 &&
      Math.abs(cubeAngularVelocity.y) < 4 &&
      nextY >= bounds.maxY - 1
    ) {
      cubeVelocity = { x: 0, y: 0 };
      cubePhysicsFrame = null;
      return;
    }

    cubePhysicsFrame = requestAnimationFrame(tick);
  };

  cubePhysicsFrame = requestAnimationFrame(tick);
}

function dropSignalCube() {
  isCubeVisible.value = true;
  cubeFragments.value = [];

  if (cubeFragmentTimer) {
    clearTimeout(cubeFragmentTimer);
    cubeFragmentTimer = null;
  }

  stopCubePhysics();
  cubePosition.value = { x: 28, y: 22 };
  cubeVelocity = { x: 120, y: 0 };
  cubeAngularVelocity = { x: 220, y: -160 };
  cubeAngularAcceleration = { x: 0, y: 0 };
  cubeTiltX.value = -36;
  cubeTiltY.value = 24;

  requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>(".signal-cube-dragger");

    if (target) {
      runCubePhysics(target);
    }
  });
}

function explodeSignalCube() {
  const fragmentCount = 18;
  const centerX = cubePosition.value.x + 38;
  const centerY = cubePosition.value.y + 38;

  stopCubePhysics();
  isCubeDragging.value = false;
  isCubeVisible.value = false;
  cubeVelocity = { x: 0, y: 0 };
  cubeAngularVelocity = { x: 0, y: 0 };
  cubeAngularAcceleration = { x: 0, y: 0 };

  cubeFragments.value = Array.from({ length: fragmentCount }, (_, index) => {
    const angle = (Math.PI * 2 * index) / fragmentCount + Math.random() * 0.34;
    const distance = 34 + Math.random() * 78;

    return {
      id: Date.now() + index,
      originX: centerX,
      originY: centerY,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 18,
      rotate: -160 + Math.random() * 320,
      size: 4 + Math.random() * 10,
    };
  });

  cubeFragmentTimer = window.setTimeout(() => {
    cubeFragments.value = [];
    cubeFragmentTimer = null;
  }, 720);
}

function toggleSignalCube() {
  if (isCubeVisible.value) {
    explodeSignalCube();
    return;
  }

  dropSignalCube();
}

function startCubeDrag(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement;
  const bounds = getCubeBounds(target);

  if (!bounds) {
    return;
  }

  stopCubePhysics();
  cubeDragOffset = {
    x: event.clientX - bounds.parentRect.left - cubePosition.value.x,
    y: event.clientY - bounds.parentRect.top - cubePosition.value.y,
  };
  cubeVelocity = { x: 0, y: 0 };
  cubeAngularAcceleration = { x: 0, y: 0 };
  lastCubePointer = { x: event.clientX, y: event.clientY, time: performance.now() };

  isCubeDragging.value = true;
  target.setPointerCapture(event.pointerId);
  tiltSignalCube(event);
}

function moveCubeDrag(event: PointerEvent) {
  tiltSignalCube(event);

  if (!isCubeDragging.value) {
    return;
  }

  const target = event.currentTarget as HTMLElement;
  const bounds = getCubeBounds(target);

  if (!bounds) {
    return;
  }

  const now = performance.now();
  const deltaSeconds = Math.max((now - lastCubePointer.time) / 1000, 0.001);
  cubeVelocity = {
    x: (event.clientX - lastCubePointer.x) / deltaSeconds,
    y: (event.clientY - lastCubePointer.y) / deltaSeconds,
  };
  cubeAngularVelocity = {
    x: cubeAngularVelocity.x + cubeVelocity.y * 0.18,
    y: cubeAngularVelocity.y - cubeVelocity.x * 0.18,
  };
  lastCubePointer = { x: event.clientX, y: event.clientY, time: now };

  const nextX = event.clientX - bounds.parentRect.left - cubeDragOffset.x;
  const nextY = event.clientY - bounds.parentRect.top - cubeDragOffset.y;

  cubePosition.value = {
    x: Math.min(Math.max(nextX, 10), bounds.maxX),
    y: Math.min(Math.max(nextY, 10), bounds.maxY),
  };
}

function stopCubeDrag(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement;
  isCubeDragging.value = false;
  if (target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId);
  }
  runCubePhysics(target);
}

watch(
  () => route.fullPath,
  () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    contentScrollRef.value?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  },
);

watch(
  isPostRoute,
  (shouldHalfCollapse) => {
    isLeftPanelHalfCollapsed.value = shouldHalfCollapse;

    if (shouldHalfCollapse) {
      playerExpanded.value = false;
    }

    if (leftPanelCollapsed.value) {
      return;
    }

    const shellMain = shellMainRef.value;
    if (!shellMain) {
      return;
    }

    const shellWidth = shellMain.getBoundingClientRect().width;
    const targetWidth = shouldHalfCollapse
      ? getHalfCollapsedLeftWidth(shellWidth)
      : getExpandedLeftWidth(shellWidth);

    animateLeftPanelTo(targetWidth);
  },
);

watch([leftPanelCollapsed, isLeftPanelHalfCollapsed], ([collapsed, halfCollapsed]) => {
  if ((collapsed || halfCollapsed) && isCubeVisible.value) {
    explodeSignalCube();
  }
});

function getRouteDisplayLabel(path: string) {
  if (path === "/") {
    return "ROUTES";
  }

  if (path === "/home") {
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
  isLeftPanelHalfCollapsed.value = isPostRoute.value;
  if (isPostRoute.value) {
    playerExpanded.value = false;
  }
  syncLeftPanelWidth();
  window.addEventListener("resize", syncLeftPanelWidth);

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

  const idleWindow = window as Window & {
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout: number },
    ) => number;
  };

  if (typeof idleWindow.requestIdleCallback === "function") {
    idleWindow.requestIdleCallback(
      () => {
        void warmupBackgroundResources();
      },
      { timeout: 1500 },
    );
    return;
  }

  window.setTimeout(() => {
    void warmupBackgroundResources();
  }, 180);
});

onUnmounted(() => {
  window.removeEventListener("resize", syncLeftPanelWidth);

  if (leftPanelAnimationFrame) {
    cancelAnimationFrame(leftPanelAnimationFrame);
  }

  stopCubePhysics();

  if (cubeFragmentTimer) {
    clearTimeout(cubeFragmentTimer);
  }

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
        <span>{{ subtitle }}</span>
      </div>
    </div>

    <div class="shell">
      <main
        ref="shellMainRef"
        class="shell-main"
        :class="{
          'reading-mode': route.name !== 'routes',
          'post-reading-mode': isPostRoute,
          'left-collapsed': leftPanelCollapsed,
        }"
      >
        <aside
          class="left-panel shell-enter-3"
          :class="{ collapsed: leftPanelCollapsed, 'post-panel': isPostRoute }"
        >
          <div class="left-panel-shell">
            <button
              v-if="!leftPanelCollapsed && !isLeftPanelHalfCollapsed"
              class="cube-drop-lever"
              type="button"
              :aria-pressed="!isCubeVisible"
              aria-label="投放信号核心方块"
              @click="toggleSignalCube"
            >
              <span class="lever-label">CORE</span>
              <span class="lever-track" aria-hidden="true">
                <span class="lever-handle"></span>
              </span>
            </button>
            <nav
              v-if="route.name !== 'routes'"
              class="diagonal-rail"
              aria-label="主导航"
            >
              <div class="glow-frame" aria-hidden="true"></div>
              <div class="glow-frame-inner" aria-hidden="true"></div>
              <div class="diagonal-rail-inner">
                <RouterLink
                  v-for="(item, index) in navigationItems.filter(
                    (i) => !i.hide,
                  )"
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
            <!-- TOC in left panel -->
            <div
              class="left-panel-toc-wrap"
              :class="{ hidden: leftPanelCollapsed }"
            >
              <nav v-if="showToc" class="toc" aria-label="目录">
                <div class="toc-title-row">
                  <h4 class="toc-title">目录</h4>
                  <span>{{ tocHeadings.length }} SECTIONS</span>
                </div>
                <ul class="toc-list">
                  <li
                    v-for="h in tocHeadings"
                    :key="h.id"
                    class="toc-item"
                    :class="{
                      [`toc-level-${h.level}`]: true,
                      'toc-active': tocActiveId === h.id,
                    }"
                  >
                    <a
                      class="toc-link"
                      :href="`#${h.id}`"
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

            <div
              class="left-panel-footer"
              :class="{ hidden: leftPanelCollapsed }"
            >
              <!-- <div class="side-meter">
                <span>ACTIVE NODE</span>
                <strong>{{ activeHeadingText }}</strong>
              </div>
              <div class="side-stats">
                <span>
                  <strong>{{ tocHeadings.length }}</strong>
                  <small>章节</small>
                </span>
                <span>
                  <strong>{{ showToc ? "ON" : "IDLE" }}</strong>
                  <small>目录</small>
                </span>
              </div> -->
            </div>
            <button
              v-if="isCubeVisible"
              class="signal-cube-dragger"
              :class="{ dragging: isCubeDragging }"
              type="button"
              :style="{
                '--cube-x': cubePosition.x + 'px',
                '--cube-y': cubePosition.y + 'px',
                '--cube-tilt-x': cubeTiltX + 'deg',
                '--cube-tilt-y': cubeTiltY + 'deg',
              }"
              aria-label="可拖动的信号核心方块"
              @pointerdown="startCubeDrag"
              @pointermove="moveCubeDrag"
              @pointerup="stopCubeDrag"
              @pointercancel="stopCubeDrag"
            >
              <span class="signal-cube-scene" aria-hidden="true">
                <span class="signal-cube">
                  <span class="cube-face cube-front"></span>
                  <span class="cube-face cube-back"></span>
                  <span class="cube-face cube-right"></span>
                  <span class="cube-face cube-left"></span>
                  <span class="cube-face cube-top"></span>
                  <span class="cube-face cube-bottom"></span>
                </span>
                <span class="cube-core"></span>
              </span>
            </button>
            <span
              v-for="fragment in cubeFragments"
              :key="fragment.id"
              class="cube-fragment"
              :style="{
                '--fragment-origin-x': fragment.originX + 'px',
                '--fragment-origin-y': fragment.originY + 'px',
                '--fragment-x': fragment.x + 'px',
                '--fragment-y': fragment.y + 'px',
                '--fragment-rotate': fragment.rotate + 'deg',
                '--fragment-size': fragment.size + 'px',
              }"
              aria-hidden="true"
            ></span>
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

            <div ref="contentScrollRef" class="content-panel-scroll">
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
      </main>
    </div>

    <!-- Floating music widget -->
    <div class="floating-player" :class="{ collapsed: !playerExpanded }">
      <div class="floating-player-dock">
        <div class="floating-player-card">
          <FuiMusicWidget />
        </div>
        <button
          class="player-ear"
          :title="playerExpanded ? '收起' : '展开'"
          @click="playerExpanded = !playerExpanded"
        >
          <span class="ear-arrow">{{ playerExpanded ? "◀" : "▶" }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shell-main {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 40% 60%;
  flex: 1;
  min-height: 0;
  will-change: grid-template-columns;
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

.cube-drop-lever {
  position: absolute;
  top: 12px;
  left: 14px;
  z-index: 5;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 7px 9px;
  border: 1px solid color-mix(in srgb, var(--fui-border-color) 70%, transparent);
  border-radius: 2px;
  background:
    linear-gradient(180deg, rgba(184, 255, 202, 0.08), transparent),
    color-mix(in srgb, var(--black) 48%, transparent);
  color: color-mix(in srgb, var(--fui-cyan) 82%, var(--text-muted));
  font-family: var(--font-hud);
  font-size: 0.5rem;
  letter-spacing: 0.12em;
  cursor: pointer;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.025),
    0 0 16px rgba(64, 224, 208, 0.06);
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.cube-drop-lever:hover {
  border-color: color-mix(in srgb, var(--fui-cyan) 88%, transparent);
  color: var(--text-main);
  box-shadow:
    inset 0 0 12px rgba(184, 255, 202, 0.06),
    0 0 18px rgba(64, 224, 208, 0.14);
}

.lever-label {
  line-height: 1;
  opacity: 0.76;
  writing-mode: vertical-rl;
}

.lever-track {
  position: relative;
  display: block;
  width: 14px;
  height: 48px;
  border: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(64, 224, 208, 0.16), rgba(184, 255, 202, 0.03)),
    color-mix(in srgb, var(--surface) 70%, transparent);
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.36);
}

.lever-track::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 6px;
  bottom: 6px;
  width: 1px;
  background: linear-gradient(180deg, var(--fui-cyan), transparent 50%, var(--line));
  opacity: 0.36;
  transform: translateX(-50%);
}

.lever-handle {
  position: absolute;
  left: 50%;
  top: auto;
  bottom: 3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--text-muted);
  box-shadow:
    0 0 8px rgba(184, 255, 202, 0.12),
    inset 0 0 0 1px rgba(255, 255, 255, 0.28);
  transform: translate3d(-50%, -32px, 0);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.cube-drop-lever[aria-pressed="false"] .lever-handle {
  background: var(--fui-cyan);
  box-shadow:
    0 0 10px rgba(64, 224, 208, 0.8),
    0 0 20px rgba(184, 255, 202, 0.26),
    inset 0 0 0 1px rgba(255, 255, 255, 0.4);
  transform: translate3d(-50%, 0, 0);
}

.content-panel {
  min-width: 0;
  min-height: 0;
  border-left: 1px solid var(--line);
  box-shadow:
    inset 1px 0 0 color-mix(in srgb, var(--line) 56%, transparent),
    inset 24px 0 80px rgba(184, 255, 202, 0.025);
  padding: 24px 28px;
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

.left-panel.post-panel {
  padding-top: 12px;
  padding-bottom: 12px;
}

.left-panel-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 18px;
  width: 100%;
  height: 70%;
  padding: 28px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(184, 255, 202, 0.045), transparent 22%),
    repeating-linear-gradient(
      0deg,
      transparent 0 9px,
      rgba(184, 255, 202, 0.018) 10px
    ),
    color-mix(in srgb, var(--surface) 74%, transparent);
  box-shadow: inset 0 0 36px rgba(184, 255, 202, 0.03);
  transition:
    width 0.46s ease,
    padding 0.46s ease,
    border-radius 0.46s ease,
    box-shadow 0.46s ease,
    background 0.46s ease,
    transform 0.46s ease;
}

.left-panel.post-panel .left-panel-shell {
  height: 100%;
  min-height: 0;
  padding-block: 18px;
}

.left-panel-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--fui-border-color) 82%, transparent);
  border-radius: 2px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-soft) 74%, transparent),
      transparent 52%
    ),
    color-mix(in srgb, var(--dark-gray) 82%, transparent);
  box-shadow: inset 0 -1px 0 rgba(184, 255, 202, 0.16);
  transition:
    opacity 0.46s ease,
    transform 0.46s ease,
    max-height 0.46s ease,
    padding 0.46s ease,
    border-width 0.46s ease;
}

.left-panel-hero.hidden,
.left-panel-footer.hidden {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
  transform: translateX(-18px) scale(0.96);
  pointer-events: none;
  border-width: 0;
  overflow: hidden;
}

.side-kicker {
  margin: 0 0 8px;
  font-family: var(--font-hud);
  font-size: 0.62rem;
  letter-spacing: 0.24em;
  color: var(--accent);
  opacity: 0.86;
}

.left-panel-hero h3 {
  margin: 0;
  font-family: var(--font-heading);
  font-size: clamp(1.25rem, 2.1vw, 2rem);
  line-height: 1.25;
  letter-spacing: 0.13em;
  color: var(--text-main);
  text-transform: uppercase;
}

.side-route-chip {
  max-width: 42%;
  padding: 6px 8px;
  border: 1px solid color-mix(in srgb, var(--line) 78%, transparent);
  border-radius: 2px;
  overflow: hidden;
  color: var(--text-muted);
  font-family: var(--font-hud);
  font-size: 0.58rem;
  letter-spacing: 0.1em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.left-panel-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: flex-end;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid color-mix(in srgb, var(--fui-border-color) 94%, var(--line));
  border-radius: 2px;
  background: color-mix(in srgb, var(--dark-gray) 78%, transparent);
  color: var(--text-muted);
  font-family: var(--font-hud);
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
  width: 42px;
  max-height: 120px;
  padding: 10px 8px;
  margin: auto 0;
  opacity: 1;
  transform: translateX(0) scale(1);
  pointer-events: auto;
  writing-mode: vertical-rl;
  align-self: center;
  border-width: 1px;
}

/* ── TOC in left panel ── */
.left-panel-toc-wrap {
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

.left-panel-toc-wrap.hidden {
  width: 0;
  max-height: 0;
  opacity: 0;
  transform: translateX(-30px) scale(0.94);
  pointer-events: none;
}

.toc-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--line) 58%, transparent);
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
  height: 100%;
  overflow-y: auto;
  padding: 14px 10px 14px 14px;
  border: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
  border-radius: 2px;
  background:
    linear-gradient(90deg, rgba(184, 255, 202, 0.04), transparent 36%),
    color-mix(in srgb, var(--black) 34%, transparent);
  font-family: var(--font-mono);
  font-size: 0.76rem;
  line-height: 1.6;
  margin-right: 8%;
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

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1px;
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
  height: 100%;
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

.left-panel-footer {
  display: grid;
  gap: 12px;
  transition:
    opacity 0.46s ease,
    transform 0.46s ease,
    max-height 0.46s ease,
    padding 0.46s ease,
    border-width 0.46s ease;
}

.signal-cube-dragger {
  position: absolute;
  left: var(--cube-x);
  top: var(--cube-y);
  z-index: 3;
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  border: 0;
  background: transparent;
  color: var(--fui-cyan);
  cursor: grab;
  touch-action: none;
  user-select: none;
  filter: drop-shadow(0 0 14px rgba(64, 224, 208, 0.24));
  will-change: left, top;
}

.signal-cube-dragger.dragging {
  cursor: grabbing;
}

.cube-fragment {
  position: absolute;
  left: var(--fragment-origin-x);
  top: var(--fragment-origin-y);
  z-index: 4;
  width: var(--fragment-size);
  height: var(--fragment-size);
  border: 1px solid color-mix(in srgb, var(--fui-cyan) 90%, transparent);
  background: rgba(64, 224, 208, 0.1);
  box-shadow:
    0 0 10px rgba(64, 224, 208, 0.44),
    inset 0 0 6px rgba(184, 255, 202, 0.18);
  pointer-events: none;
  animation: cube-fragment-burst 0.72s cubic-bezier(0.18, 0.72, 0.24, 1) forwards;
}

@keyframes cube-fragment-burst {
  0% {
    opacity: 1;
    transform: translate3d(-50%, -50%, 0) rotate(0deg) scale(1);
  }

  68% {
    opacity: 0.72;
  }

  100% {
    opacity: 0;
    transform: translate3d(
        calc(var(--fragment-x) - 50%),
        calc(var(--fragment-y) - 50%),
        0
      )
      rotate(var(--fragment-rotate)) scale(0.22);
    filter: blur(3px);
  }
}

.signal-cube-scene {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  perspective: 520px;
  pointer-events: none;
}

.signal-cube-scene::before {
  content: "";
  position: absolute;
  inset: auto 14px 3px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(64, 224, 208, 0.2), transparent 70%);
  filter: blur(2px);
}

.signal-cube {
  position: relative;
  width: 38px;
  height: 38px;
  transform-style: preserve-3d;
  transform: rotateX(var(--cube-tilt-x)) rotateY(var(--cube-tilt-y));
}

.cube-face {
  position: absolute;
  inset: 0;
  border: 1px solid color-mix(in srgb, var(--fui-cyan) 92%, transparent);
  background: transparent;
  box-shadow:
    0 0 8px rgba(64, 224, 208, 0.2),
    inset 0 0 10px rgba(184, 255, 202, 0.035);
  backface-visibility: hidden;
}

.cube-front {
  transform: translateZ(19px);
}

.cube-back {
  transform: rotateY(180deg) translateZ(19px);
}

.cube-right {
  transform: rotateY(90deg) translateZ(19px);
}

.cube-left {
  transform: rotateY(-90deg) translateZ(19px);
}

.cube-top {
  transform: rotateX(90deg) translateZ(19px);
}

.cube-bottom {
  transform: rotateX(-90deg) translateZ(19px);
}

.cube-core {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 2;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(circle, #ffffff 0 12%, var(--fui-cyan) 32%, transparent 72%);
  box-shadow:
    0 0 10px rgba(255, 255, 255, 0.5),
    0 0 24px rgba(64, 224, 208, 0.82),
    0 0 52px rgba(184, 255, 202, 0.28);
  transform: translate3d(-50%, -50%, 0);
  animation: cube-core-pulse 1.8s ease-in-out infinite;
  pointer-events: none;
}

@keyframes cube-core-pulse {
  0%,
  100% {
    transform: translate3d(-50%, -50%, 0) scale(0.86);
    opacity: 0.76;
  }

  50% {
    transform: translate3d(-50%, -50%, 0) scale(1.18);
    opacity: 1;
  }
}

.side-meter {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px dashed
    color-mix(in srgb, var(--fui-border-color) 82%, transparent);
  border-radius: 2px;
  background: color-mix(in srgb, var(--dark-gray) 72%, transparent);
}

.side-meter span,
.side-stats small {
  font-family: var(--font-hud);
  font-size: 0.58rem;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  opacity: 0.62;
}

.side-meter strong {
  overflow: hidden;
  color: var(--text-main);
  font-size: 0.82rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.side-stats span {
  display: grid;
  gap: 2px;
  padding: 12px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--surface-strong) 72%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--line) 48%, transparent);
}

.side-stats strong {
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  letter-spacing: 0.08em;
}

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

/* 小耳朵 — 紧贴卡片右侧 */
.player-ear {
  flex-shrink: 0;
  width: var(--player-ear-width);
  height: 180px;
  border: 1px solid var(--fui-border-color);
  border-left: none;
  border-radius: 0 10px 10px 0;
  background: #111111;
  color: var(--fui-cyan);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
  transition:
    background 0.25s ease,
    border-radius 0.3s ease;
  font-size: 0.6rem;
  opacity: 0.7;
}

.player-ear:hover {
  background: #1a1a1a;
  opacity: 1;
}

.ear-arrow {
  display: block;
  line-height: 1;
}

.floating-player.collapsed .player-ear {
  border-left: 1px solid var(--fui-border-color);
  border-radius: 10px;
}

@media (max-width: 820px) {
  .floating-player {
    --player-left-offset: 12px;
    bottom: 100px;
  }
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
  right: 4px;
  width: 54px;
  height: 100%;
  z-index: 2;
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
  padding-right: 28px;
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
