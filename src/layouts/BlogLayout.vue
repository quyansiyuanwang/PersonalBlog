<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  Suspense,
  ref,
  onMounted,
  onUnmounted,
  watch,
} from "vue";
import { RouterView, useRoute } from "vue-router";
import { useSubtitle } from "../lib/subtitle";
import { useTocState } from "../lib/tocKey";
import { useTheme } from "../lib/theme";
import { useAudioSignal } from "../lib/audioSignal";
import { useNavigationItems } from "../composables/useNavigationItems";
import { usePanelGeometry } from "../composables/usePanelGeometry";

const CustomCursor = defineAsyncComponent(
  () => import("../components/CustomCursor.vue"),
);

const ParticleField = defineAsyncComponent(
  () => import("../components/ParticleField.vue"),
);

const StatusBar = defineAsyncComponent(
  () => import("../components/StatusBar.vue"),
);

const FloatingPlayer = defineAsyncComponent(
  () => import("../components/FloatingPlayer.vue"),
);

const FuiCatDotMatrix = defineAsyncComponent(
  () => import("../components/FuiCatDotMatrix.vue"),
);

const ScrollMinimap = defineAsyncComponent(
  () => import("../components/ScrollMinimap.vue"),
);

const route = useRoute();
const routeKey = computed(() =>
  String(route.name ?? route.path.split("/")[1] ?? route.path),
);
const leftPanelCollapsed = ref(false);
const isPostRoute = computed(() => route.path.startsWith("/post"));
const isLeftPanelHalfCollapsed = ref(false);
const subtitle = useSubtitle();
const { theme, toggleTheme } = useTheme();
const { stats: signalStats } = useAudioSignal();

const SignalConsole = defineAsyncComponent(
  () => import("../components/SignalConsole.vue"),
);

const DiagonalNavRail = defineAsyncComponent(
  () => import("../components/DiagonalNavRail.vue"),
);

const LeftPanelToc = defineAsyncComponent(
  () => import("../components/LeftPanelToc.vue"),
);

const ContentPanelHead = defineAsyncComponent(
  () => import("../components/ContentPanelHead.vue"),
);

const SignalCube = defineAsyncComponent(
  () => import("../components/SignalCube.vue"),
);

const shellMainRef = ref<HTMLElement | null>(null);
const leftPanelShellRef = ref<HTMLElement | null>(null);
const contentScrollRef = ref<HTMLElement | null>(null);

// ── TOC data from active post view ──
const {
  headings: tocHeadings,
  activeId: tocActiveId,
  readyState: tocReadyState,
  showToc,
} = useTocState();

const {
  isDesktop,
  syncViewportState,
  syncLeftPanelGeometry,
  animateLeftPanelTo,
  animateLeftPanelHeightTo,
  getTargetLeftHeight,
  getHalfCollapsedLeftWidth,
  getExpandedLeftWidth,
  getExpandedPostLeftHeight,
  cleanup: cleanupGeometry,
} = usePanelGeometry(
  shellMainRef,
  leftPanelShellRef,
  leftPanelCollapsed,
  isLeftPanelHalfCollapsed,
  showToc,
);

const { navigationItems } = useNavigationItems();

const playerExpanded = ref(false);


watch(
  () => route.fullPath,
  () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    contentScrollRef.value?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  },
);

watch(isPostRoute, (shouldHalfCollapse) => {
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

  const panelShell = leftPanelShellRef.value;
  const panel = panelShell?.parentElement;
  const panelHeight = panel ? panel.getBoundingClientRect().height : 0;
  const targetHeight = panel
    ? shouldHalfCollapse
      ? getExpandedPostLeftHeight(panelHeight)
      : getTargetLeftHeight(panelHeight)
    : undefined;

  animateLeftPanelTo(targetWidth, targetHeight);
});

watch(showToc, () => {
  if (!isPostRoute.value || leftPanelCollapsed.value) {
    return;
  }

  const panelShell = leftPanelShellRef.value;
  const panel = panelShell?.parentElement;
  if (!panel) {
    return;
  }

  animateLeftPanelHeightTo(
    getTargetLeftHeight(panel.getBoundingClientRect().height),
  );
});

onMounted(() => {
  syncViewportState();
  isLeftPanelHalfCollapsed.value = isPostRoute.value;
  if (isPostRoute.value) {
    playerExpanded.value = false;
  }
  syncLeftPanelGeometry();
  window.addEventListener("resize", syncViewportState);
  window.addEventListener("resize", syncLeftPanelGeometry);
});

onUnmounted(() => {
  window.removeEventListener("resize", syncViewportState);
  window.removeEventListener("resize", syncLeftPanelGeometry);

  cleanupGeometry();
});
</script>

<template>
  <ParticleField />
  <CustomCursor />
  <div class="blog-layout-wrapper shell-entered">
    <StatusBar
    :subtitle="subtitle"
    :theme="theme"
    :is-desktop="isDesktop"
    @toggle-theme="toggleTheme"
  />

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
          :class="{
            collapsed: leftPanelCollapsed,
            'post-panel': isPostRoute,
            'has-toc': showToc,
          }"
        >
          <div ref="leftPanelShellRef" class="left-panel-shell">
            <div class="left-panel-cat-bg" aria-hidden="true">
              <div class="left-panel-cat-bg-inner">
                <FuiCatDotMatrix />
              </div>
            </div>
            <SignalCube
              :disabled="leftPanelCollapsed || isLeftPanelHalfCollapsed"
            />
            <DiagonalNavRail
              :items="navigationItems"
              :visible="route.name !== 'routes'"
              :active-route-path="route.path"
            />
            <LeftPanelToc
              :headings="tocHeadings"
              :active-id="tocActiveId"
              :ready-state="tocReadyState"
              :visible="!leftPanelCollapsed"
              :show-toc="showToc"
            />

            <div
              class="left-panel-footer"
              :class="{ hidden: leftPanelCollapsed }"
            ></div>
          </div>
          <SignalConsole
            :visible="!leftPanelCollapsed && !isLeftPanelHalfCollapsed"
            :stats="signalStats"
          />
        </aside>

        <section class="content-panel">
          <Transition name="page" mode="out-in" appear>
            <div class="content-panel-shell" :key="routeKey">
              <ContentPanelHead :route-path="route.path" />

              <div ref="contentScrollRef" class="content-panel-scroll">
                <RouterView v-slot="{ Component }">
                  <Suspense>
                    <div class="route-view-root">
                      <component :is="Component" :key="routeKey" />
                    </div>
                    <template #fallback>
                      <div
                        class="page-loading-shell"
                        aria-live="polite"
                        aria-busy="true"
                      >
                        <div class="page-loading-grid" aria-hidden="true">
                          <span></span>
                          <span></span>
                          <span></span>
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                        <p class="page-loading-copy">Loading page...</p>
                      </div>
                    </template>
                  </Suspense>
                </RouterView>
              </div>
              <ScrollMinimap :scroll-target="contentScrollRef" />
            </div>
          </Transition>
        </section>
      </main>
    </div>

    <!-- Floating music widget -->
    <FloatingPlayer
      :expanded="playerExpanded"
      @toggle="playerExpanded = !playerExpanded"
    />
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

.page-loading-shell {
  display: grid;
  gap: 18px;
  min-height: min(42vh, 420px);
  align-content: center;
  justify-items: start;
  padding: 28px 4px;
}

.page-loading-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(72px, 110px));
  gap: 10px;
}

.page-loading-grid span {
  height: 14px;
  border-radius: 2px;
  border: 1px solid color-mix(in srgb, var(--line) 72%, transparent);
  background:
    linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, var(--accent) 24%, transparent),
      transparent
    ),
    color-mix(in srgb, var(--surface-strong) 72%, transparent);
  background-size: 220% 100%;
  animation: page-loading-scan 1.2s linear infinite;
}

.page-loading-grid span:nth-child(1) {
  width: 88px;
}
.page-loading-grid span:nth-child(2) {
  width: 118px;
  animation-delay: 0.08s;
}
.page-loading-grid span:nth-child(3) {
  width: 96px;
  animation-delay: 0.16s;
}
.page-loading-grid span:nth-child(4) {
  width: 124px;
  animation-delay: 0.24s;
}
.page-loading-grid span:nth-child(5) {
  width: 82px;
  animation-delay: 0.32s;
}
.page-loading-grid span:nth-child(6) {
  width: 108px;
  animation-delay: 0.4s;
}

.page-loading-copy {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

@keyframes page-loading-scan {
  0% {
    background-position: 200% 0;
    opacity: 0.52;
  }
  50% {
    opacity: 0.92;
  }
  100% {
    background-position: -20% 0;
    opacity: 0.52;
  }
}

.shell-main.left-collapsed {
  grid-template-columns: 116px minmax(0, 1fr);
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
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  overflow: visible;
}

.left-panel-shell {
  position: relative;
  isolation: isolate;
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
  height: auto;
  min-height: 0;
  padding-block: 18px;
  overflow: visible;
}

.left-panel-cat-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.left-panel-cat-bg-inner {
  position: absolute;
  inset: 0;
}

.left-panel-cat-bg-inner :deep(.cat-dot-matrix) {
  inset: 0;
  width: 100%;
  height: 100%;
}

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

.left-panel-footer {
  position: relative;
  z-index: 10;
  display: grid;
  gap: 12px;
  transition:
    opacity 0.46s ease,
    transform 0.46s ease,
    max-height 0.46s ease,
    padding 0.46s ease,
    border-width 0.46s ease;
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

.content-panel-shell {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  min-height: 0;
}

.content-panel-scroll {
  min-height: 0;
  max-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 28px 40px 4px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.route-view-root {
  width: 100%;
  min-width: 0;
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
  padding-right: 28px;
}

.reading-mode .content-panel-scroll > * {
  width: 100%;
}

@media (max-width: 1280px) {
  .shell-main {
    grid-template-columns: 1fr;
    height: auto;
  }

  .shell-main.left-collapsed {
    grid-template-columns: 1fr;
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
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
  }

  .shell-main.left-collapsed {
    grid-template-columns: 1fr;
  }

  .left-panel {
    padding: 18px;
  }

  .left-panel-shell {
    padding: 20px;
    border-radius: 24px;
    height: auto;
  }

  .content-panel {
    padding: 24px 22px;
    border-left: 0;
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
    min-height: 240px;
    padding: 18px;
    border-radius: 18px;
  }

  .left-panel.post-panel.has-toc .left-panel-shell {
    min-height: min(460px, 62dvh);
  }

  .left-panel-cat-bg {
    opacity: 0.38;
  }

  .left-panel-cat-bg-inner {
    inset: auto;
    top: 50%;
    left: 50%;
    width: min(70vw, 260px);
    height: min(70vw, 260px);
    transform: translate(-50%, -50%);
  }

  .left-panel.collapsed,
  .left-panel.collapsed .left-panel-shell {
    width: 100%;
    align-items: stretch;
    transform: none;
  }

.content-panel {
    padding: 20px;
  }

}

@media (max-width: 560px) {
  .left-panel {
    padding: 12px 12px 0;
  }

  .left-panel-shell {
    min-height: 210px;
    padding: 14px;
  }

  .left-panel.post-panel.has-toc .left-panel-shell {
    min-height: min(430px, 60dvh);
  }


  .left-panel-cat-bg {
    display: block;
    opacity: 0.3;
  }

  .left-panel-cat-bg-inner {
    width: min(62vw, 190px);
    height: min(62vw, 190px);
  }

  .content-panel {
    padding: 16px 12px 96px;
  }

}

</style>
