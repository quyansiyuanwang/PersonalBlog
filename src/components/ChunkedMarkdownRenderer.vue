<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { renderMarkdown } from "../lib/markdown";

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

interface VisibleChunk {
  index: number;
  html: string;
}

const props = defineProps<{
  source: string;
  assetBase?: string;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const rangeStart = ref(0);
const rangeEnd = ref(0);
const headings = ref<HeadingItem[]>([]);
const activeHeadingId = ref<string | null>(null);
const htmlCache = ref<Array<string | undefined>>([]);
const chunkHeights = ref<number[]>([]);

let scrollAnimationFrame: number | null = null;
let postRenderAnimationFrame: number | null = null;
let activeScrollParent: HTMLElement | Window | null = null;
let isDisposed = false;
let pendingScrollTargetId: string | null = null;
let pendingScrollTargetFrame: number | null = null;
let pendingScrollTargetIndex = -1;
let pendingScrollAligning = false;
let pendingScrollStableFrames = 0;
let pendingScrollLastTop = -1;
let pendingScrollIdleFrames = 0;

const INITIAL_CHUNK_COUNT = 8;
const MAX_CHUNK_LENGTH = 900;
const DEFAULT_CHUNK_HEIGHT = 360;
const OVERSCAN_PX = 1800;
const SEEK_STEP_PX = 720;
const ANCHOR_OFFSET_PX = 48;
const ANCHOR_TOLERANCE_PX = 6;
const ANCHOR_STABLE_FRAME_COUNT = 3;
const ANCHOR_IDLE_FRAME_COUNT = 6;

const chunks = computed(() => splitMarkdownIntoChunks(props.source));
const visibleChunks = computed<VisibleChunk[]>(() => {
  const result: VisibleChunk[] = [];
  const start = Math.max(0, rangeStart.value);
  const end = Math.min(chunks.value.length, rangeEnd.value);

  for (let index = start; index < end; index += 1) {
    const html = htmlCache.value[index];

    if (html) {
      result.push({ index, html });
    }
  }

  return result;
});
const visibleChunkKey = computed(
  () => `${rangeStart.value}:${rangeEnd.value}:${htmlCache.value.length}`,
);
const isPreparingVisibleChunks = computed(
  () =>
    visibleChunks.value.length < Math.max(0, rangeEnd.value - rangeStart.value),
);
const topSpacerHeight = computed(() => getOffsetForIndex(rangeStart.value));
const bottomSpacerHeight = computed(() =>
  Math.max(0, getTotalEstimatedHeight() - getOffsetForIndex(rangeEnd.value)),
);

function splitOversizedChunk(chunk: string) {
  if (chunk.length <= MAX_CHUNK_LENGTH) {
    return [chunk];
  }

  const lines = chunk.split(/\r?\n/);
  const parts: string[] = [];
  let current: string[] = [];
  let inFence = false;

  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      inFence = !inFence;
    }

    current.push(line);

    const currentText = current.join("\n");
    if (
      !inFence &&
      (!line.trim() || /^\s{0,3}#{1,6}\s+/.test(line)) &&
      currentText.length >= MAX_CHUNK_LENGTH
    ) {
      parts.push(currentText.trim());
      current = [];
    }
  });

  if (current.length) {
    parts.push(current.join("\n").trim());
  }

  return parts.filter(Boolean);
}

function splitMarkdownIntoChunks(source: string) {
  const normalized = source.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return [];
  }

  const lines = normalized.split("\n");
  const sections: string[] = [];
  let current: string[] = [];
  let inFence = false;

  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      inFence = !inFence;
    }

    const isHeading = !inFence && /^\s{0,3}#{1,6}\s+/.test(line);

    if (isHeading && current.length) {
      sections.push(current.join("\n").trim());
      current = [line];
      return;
    }

    current.push(line);
  });

  if (current.length) {
    sections.push(current.join("\n").trim());
  }

  return sections
    .flatMap((section) => splitOversizedChunk(section))
    .filter(Boolean);
}

function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
    .replace(/\s+/g, "-");
}

function estimateChunkHeight(chunk: string) {
  const lines = chunk.split(/\r?\n/);
  let height = 28;
  let inFence = false;
  let fenceLines = 0;

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inFence) {
        height += 36 + fenceLines * 22;
        fenceLines = 0;
      }

      inFence = !inFence;
      return;
    }

    if (inFence) {
      fenceLines += 1;
      return;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      height += /^#{1,2}\s+/.test(trimmed) ? 76 : 58;
      return;
    }

    if (/^!\[[^\]]*\]\(.+\)/.test(trimmed) || /<img\b/i.test(trimmed)) {
      height += 360;
      return;
    }

    if (/^\|.+\|$/.test(trimmed)) {
      height += 34;
      return;
    }

    if (!trimmed) {
      height += 12;
      return;
    }

    const wrappedLines = Math.max(1, Math.ceil(trimmed.length / 68));
    height += wrappedLines * 25;
  });

  if (inFence) {
    height += 36 + fenceLines * 22;
  }

  return Math.max(120, Math.ceil(height));
}

const chunkHeadings = computed(() => {
  let inFence = false;
  const slugCounts = new Map<string, number>();

  function getUniqueSlug(text: string) {
    const slug = slugifyHeading(text);

    if (!slug) {
      return "";
    }

    const count = slugCounts.get(slug) ?? 0;
    slugCounts.set(slug, count + 1);

    return count === 0 ? slug : `${slug}-${count}`;
  }

  return chunks.value.map((chunk) => {
    const result: HeadingItem[] = [];

    chunk.split(/\r?\n/).forEach((line) => {
      if (line.trim().startsWith("```")) {
        inFence = !inFence;
        return;
      }

      if (inFence) {
        return;
      }

      const match = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
      if (!match) {
        return;
      }

      const text = match[2].replace(/[#`*_~]/g, "").trim();
      const id = getUniqueSlug(text);

      if (id) {
        result.push({
          id,
          text,
          level: match[1].length,
        });
      }
    });

    return result;
  });
});

function syncHeadings() {
  headings.value = chunkHeadings.value.flat();
}

function syncActiveHeading() {
  if (pendingScrollTargetId) {
    activeHeadingId.value = pendingScrollTargetId;
    return;
  }

  const flatHeadings = headings.value;

  if (flatHeadings.length === 0) {
    activeHeadingId.value = null;
    return;
  }

  const { localScrollTop } = getMarkdownScrollMetrics();
  const currentIndex = findIndexForOffset(localScrollTop + 96);

  for (
    let index = Math.min(currentIndex, chunkHeadings.value.length - 1);
    index >= 0;
    index -= 1
  ) {
    const firstHeading = chunkHeadings.value[index]?.[0];

    if (firstHeading) {
      activeHeadingId.value = firstHeading.id;
      return;
    }
  }

  activeHeadingId.value = flatHeadings[0]?.id ?? null;
}

function ensureRenderedRange(start: number, end: number) {
  const safeStart = Math.max(0, Math.min(start, chunks.value.length));
  const safeEnd = Math.max(safeStart, Math.min(end, chunks.value.length));
  const nextHtmlCache = htmlCache.value.slice();
  let changed = false;

  for (let index = safeStart; index < safeEnd; index += 1) {
    const chunk = chunks.value[index];

    if (chunk && !nextHtmlCache[index]) {
      nextHtmlCache[index] = renderMarkdown(chunk, {
        assetBase: props.assetBase,
      });
      changed = true;
    }
  }

  if (changed) {
    htmlCache.value = nextHtmlCache;
  }
}

async function renderMermaid() {
  await nextTick();
  if (isDisposed) return;

  const el = containerRef.value;
  if (!el) return;

  const blocks = el.querySelectorAll<HTMLElement>(
    ".mermaid:not([data-processed])",
  );
  if (blocks.length === 0) return;

  try {
    const mermaid = await import("mermaid");
    mermaid.default.initialize({
      startOnLoad: false,
      theme: "neutral",
      securityLevel: "loose",
    });

    await Promise.all(
      Array.from(blocks).map(async (block, index) => {
        const source = block.textContent?.trim() ?? "";

        if (!source) {
          return;
        }

        try {
          const id = `mermaid-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`;
          const { svg, bindFunctions } = await mermaid.default.render(
            id,
            source,
          );
          block.innerHTML = svg;
          block.dataset.processed = "true";
          bindFunctions?.(block);
        } catch (error) {
          block.classList.add("mermaid-error");
          block.dataset.processed = "true";
          block.textContent = source;
          console.warn("Mermaid render failed:", error);
        }
      }),
    );

    scheduleMeasureVisibleChunks();
  } catch {
    // mermaid failed silently — raw code is still visible
  }
}

function replaceMissingImage(image: HTMLImageElement) {
  const source =
    image.currentSrc || image.src || image.getAttribute("src") || "image";
  const fallback = document.createElement("span");
  fallback.className = "markdown-image-fallback";
  fallback.textContent = `Image not found: ${source.split("/").pop() ?? source}`;
  image.replaceWith(fallback);
}

function prepareImages() {
  if (isDisposed) return;

  const el = containerRef.value;
  if (!el) return;

  el.querySelectorAll<HTMLImageElement>(
    "img.markdown-image:not([data-fallback-ready])",
  ).forEach((image) => {
    image.dataset.fallbackReady = "true";
    image.addEventListener("error", () => replaceMissingImage(image), {
      once: true,
    });
    image.addEventListener("load", scheduleMeasureVisibleChunks, {
      once: true,
    });

    if (image.complete && image.naturalWidth === 0) {
      replaceMissingImage(image);
    }
  });
}

function findScrollParent(element: HTMLElement) {
  let current = element.parentElement;

  while (current) {
    const style = window.getComputedStyle(current);
    const canScroll = /(auto|scroll)/.test(
      `${style.overflowY}${style.overflow}`,
    );

    if (canScroll && current.scrollHeight > current.clientHeight) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function getScrollParent() {
  const container = containerRef.value;
  return container ? findScrollParent(container) : null;
}

function getScrollMetrics() {
  const scroller = getScrollParent();

  if (scroller) {
    return {
      scrollTop: scroller.scrollTop,
      viewportHeight: scroller.clientHeight,
    };
  }

  return {
    scrollTop: window.scrollY,
    viewportHeight: window.innerHeight,
  };
}

function getMarkdownScrollMetrics() {
  const container = containerRef.value;
  const metrics = getScrollMetrics();

  if (!container) {
    return {
      localScrollTop: metrics.scrollTop,
      viewportHeight: metrics.viewportHeight,
    };
  }

  const scroller = getScrollParent();

  if (scroller) {
    const containerOffset =
      container.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop;

    return {
      localScrollTop: Math.max(0, metrics.scrollTop - containerOffset),
      viewportHeight: metrics.viewportHeight,
    };
  }

  const containerOffset =
    container.getBoundingClientRect().top + window.scrollY;

  return {
    localScrollTop: Math.max(0, window.scrollY - containerOffset),
    viewportHeight: metrics.viewportHeight,
  };
}

function getOffsetForIndex(index: number) {
  let offset = 0;
  const max = Math.min(index, chunks.value.length);

  for (let current = 0; current < max; current += 1) {
    offset += chunkHeights.value[current] ?? DEFAULT_CHUNK_HEIGHT;
  }

  return offset;
}

function getTotalEstimatedHeight() {
  return getOffsetForIndex(chunks.value.length);
}

function findIndexForOffset(offset: number) {
  let currentOffset = 0;
  const heights = chunkHeights.value;

  for (let index = 0; index < chunks.value.length; index += 1) {
    const nextOffset = currentOffset + (heights[index] ?? DEFAULT_CHUNK_HEIGHT);

    if (nextOffset >= offset) {
      return index;
    }

    currentOffset = nextOffset;
  }

  return Math.max(0, chunks.value.length - 1);
}

function updateVisibleRange() {
  if (chunks.value.length === 0) {
    rangeStart.value = 0;
    rangeEnd.value = 0;
    syncActiveHeading();
    return;
  }

  const { localScrollTop, viewportHeight } = getMarkdownScrollMetrics();
  const start = findIndexForOffset(Math.max(0, localScrollTop - OVERSCAN_PX));
  const targetEnd =
    findIndexForOffset(localScrollTop + viewportHeight + OVERSCAN_PX) + 1;
  const end = Math.min(chunks.value.length, Math.max(targetEnd, start + 1));

  ensureRenderedRange(start, end);

  rangeStart.value = start;
  rangeEnd.value = end;
  syncActiveHeading();
}

function measureVisibleChunks() {
  const el = containerRef.value;
  if (!el) return;

  const nextHeights = chunkHeights.value.slice();
  let changed = false;

  el.querySelectorAll<HTMLElement>("[data-chunk-index]").forEach((chunk) => {
    const index = Number(chunk.dataset.chunkIndex);
    const height = Math.max(1, Math.ceil(chunk.getBoundingClientRect().height));

    if (Number.isFinite(index) && nextHeights[index] !== height) {
      nextHeights[index] = height;
      changed = true;
    }
  });

  if (changed) {
    chunkHeights.value = nextHeights;
    updateVisibleRange();
  }
}

function scheduleMeasureVisibleChunks() {
  if (isDisposed || typeof window === "undefined") return;

  window.requestAnimationFrame(() => {
    if (isDisposed) return;
    measureVisibleChunks();
  });
}

function schedulePostRenderWork() {
  if (
    isDisposed ||
    postRenderAnimationFrame !== null ||
    typeof window === "undefined"
  ) {
    return;
  }

  postRenderAnimationFrame = window.requestAnimationFrame(() => {
    if (isDisposed) return;

    postRenderAnimationFrame = null;
    prepareImages();
    void renderMermaid();
    scheduleMeasureVisibleChunks();
    schedulePendingScrollCorrection();
  });
}

function scheduleVisibleRangeUpdate() {
  if (
    isDisposed ||
    scrollAnimationFrame !== null ||
    typeof window === "undefined"
  ) {
    return;
  }

  scrollAnimationFrame = window.requestAnimationFrame(() => {
    if (isDisposed) return;

    scrollAnimationFrame = null;
    updateVisibleRange();
    scheduleMeasureVisibleChunks();
  });
}

function noteScrollActivity() {
  scheduleVisibleRangeUpdate();
}

function bindScrollParent() {
  const nextScrollParent = getScrollParent() ?? window;

  if (activeScrollParent === nextScrollParent) {
    return;
  }

  if (activeScrollParent) {
    activeScrollParent.removeEventListener("scroll", noteScrollActivity);
  }

  activeScrollParent = nextScrollParent;
  activeScrollParent.addEventListener("scroll", noteScrollActivity, {
    passive: true,
  });
}

function resetRendering() {
  isDisposed = false;
  pendingScrollTargetId = null;
  pendingScrollTargetIndex = -1;
  pendingScrollAligning = false;
  pendingScrollStableFrames = 0;
  pendingScrollLastTop = -1;
  pendingScrollIdleFrames = 0;
  htmlCache.value = [];
  rangeStart.value = 0;
  rangeEnd.value = 0;
  chunkHeights.value = chunks.value.map(
    (chunk) => estimateChunkHeight(chunk) || DEFAULT_CHUNK_HEIGHT,
  );

  const initialCount = Math.min(chunks.value.length, INITIAL_CHUNK_COUNT);
  ensureRenderedRange(0, initialCount);
  rangeStart.value = 0;
  rangeEnd.value = initialCount;
  syncHeadings();
  syncActiveHeading();

  void nextTick(() => {
    if (isDisposed) return;

    bindScrollParent();
    updateVisibleRange();
    schedulePostRenderWork();
  });
}

function ensureHeadingVisible(id: string, options: { scroll?: boolean } = {}) {
  const index = chunkHeadings.value.findIndex((items) =>
    items.some((item) => item.id === id),
  );

  if (index < 0) {
    return;
  }

  activeHeadingId.value = id;

  if (options.scroll) {
    pendingScrollTargetId = id;
    pendingScrollTargetIndex = index;
    pendingScrollAligning = false;
    pendingScrollStableFrames = 0;
    pendingScrollLastTop = -1;
    pendingScrollIdleFrames = 0;
    schedulePendingScrollCorrection();
    return;
  }

  ensureRenderedRange(Math.max(0, index - 2), index + 6);
  rangeStart.value = Math.max(0, index - 2);
  rangeEnd.value = Math.min(chunks.value.length, index + 6);

  void nextTick(() => {
    if (isDisposed) return;

    if (options.scroll) {
      scrollToAnchor(id);
    }

    schedulePostRenderWork();
  });
}

function schedulePendingScrollCorrection() {
  if (
    isDisposed ||
    pendingScrollTargetFrame !== null ||
    typeof window === "undefined"
  ) {
    return;
  }

  pendingScrollTargetFrame = window.requestAnimationFrame(() => {
    pendingScrollTargetFrame = null;
    correctPendingScrollTarget();
  });
}

function correctPendingScrollTarget() {
  const id = pendingScrollTargetId;

  if (!id || isDisposed) {
    return;
  }

  const target = document.getElementById(id);

  if (!target) {
    pendingScrollAligning = false;
    pendingScrollStableFrames = 0;
    pendingScrollLastTop = -1;
    pendingScrollIdleFrames = 0;
    seekTowardPendingTarget();
    schedulePendingScrollCorrection();
    return;
  }

  const alignment = scrollToAnchor(id, pendingScrollAligning);

  if (!alignment.aligned) {
    pendingScrollAligning = alignment.started;
    pendingScrollStableFrames = 0;

    const currentTop = getScrollMetrics().scrollTop;
    if (Math.abs(currentTop - pendingScrollLastTop) < 1) {
      pendingScrollIdleFrames += 1;
    } else {
      pendingScrollIdleFrames = 0;
    }

    pendingScrollLastTop = currentTop;

    if (pendingScrollIdleFrames >= ANCHOR_IDLE_FRAME_COUNT) {
      pendingScrollAligning = false;
      pendingScrollIdleFrames = 0;
    }

    schedulePendingScrollCorrection();
    return;
  }

  pendingScrollStableFrames += 1;
  pendingScrollIdleFrames = 0;

  if (pendingScrollStableFrames < ANCHOR_STABLE_FRAME_COUNT) {
    pendingScrollAligning = true;
    schedulePendingScrollCorrection();
    return;
  }

  pendingScrollTargetId = null;
  pendingScrollTargetIndex = -1;
  pendingScrollAligning = false;
  pendingScrollStableFrames = 0;
  pendingScrollLastTop = -1;
  pendingScrollIdleFrames = 0;
  syncActiveHeading();
}

function getEstimatedScrollTopForIndex(index: number) {
  const scroller = getScrollParent();
  const container = containerRef.value;
  const targetTop = Math.max(0, getOffsetForIndex(index) - ANCHOR_OFFSET_PX);

  if (scroller) {
    const containerOffset = container
      ? container.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop
      : 0;

    return Math.max(0, containerOffset + targetTop);
  }

  const containerTop = container?.getBoundingClientRect().top ?? 0;
  return Math.max(0, window.scrollY + containerTop + targetTop - ANCHOR_OFFSET_PX);
}

function seekTowardPendingTarget() {
  if (pendingScrollTargetIndex < 0) {
    return;
  }

  const scroller = getScrollParent();
  const estimatedTop = getEstimatedScrollTopForIndex(pendingScrollTargetIndex);

  if (scroller) {
    const delta = estimatedTop - scroller.scrollTop;
    if (Math.abs(delta) < 2) {
      ensureRenderedRange(
        Math.max(0, pendingScrollTargetIndex - 4),
        pendingScrollTargetIndex + 8,
      );
    }

    const nextTop = Math.max(
      0,
      scroller.scrollTop +
        Math.sign(delta) * Math.min(Math.abs(delta), SEEK_STEP_PX),
    );
    scroller.scrollTo({ top: nextTop, behavior: "auto" });
    updateVisibleRange();
    scheduleMeasureVisibleChunks();
    return;
  }

  const delta = estimatedTop - window.scrollY;
  if (Math.abs(delta) < 2) {
    ensureRenderedRange(
      Math.max(0, pendingScrollTargetIndex - 4),
      pendingScrollTargetIndex + 8,
    );
  }

  const nextTop = Math.max(
    0,
    window.scrollY + Math.sign(delta) * Math.min(Math.abs(delta), SEEK_STEP_PX),
  );
  window.scrollTo({ top: nextTop, behavior: "auto" });
  updateVisibleRange();
  scheduleMeasureVisibleChunks();
}

function scrollToAnchor(id: string, alreadyStarted = false) {
  const target = document.getElementById(id);
  const container = containerRef.value;

  if (!target || !container) {
    return { aligned: false, started: alreadyStarted };
  }

  const scroller = getScrollParent();

  if (!scroller) {
    const statusBarHeight =
      document.querySelector<HTMLElement>(".status-bar")?.offsetHeight ?? 0;
    const top =
      target.getBoundingClientRect().top +
      window.scrollY -
      statusBarHeight -
      ANCHOR_OFFSET_PX;
    const nextTop = Math.max(0, top);

    if (Math.abs(window.scrollY - nextTop) > ANCHOR_TOLERANCE_PX) {
      if (alreadyStarted) {
        return { aligned: false, started: true };
      }

      window.scrollTo({
        top: nextTop,
        behavior: "smooth",
      });
      return { aligned: false, started: true };
    }

    return { aligned: true, started: alreadyStarted };
  }

  const scrollerTop = scroller.getBoundingClientRect().top;
  const targetTop = target.getBoundingClientRect().top;
  const nextTop = Math.max(
    0,
    scroller.scrollTop + targetTop - scrollerTop - ANCHOR_OFFSET_PX,
  );

  if (Math.abs(scroller.scrollTop - nextTop) > ANCHOR_TOLERANCE_PX) {
    if (alreadyStarted) {
      return { aligned: false, started: true };
    }

    scroller.scrollTo({
      top: nextTop,
      behavior: "smooth",
    });
    return { aligned: false, started: true };
  }

  return { aligned: true, started: alreadyStarted };
}

function handleMarkdownClick(event: MouseEvent) {
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
    'a[href^="#"]',
  );

  if (!link) {
    return;
  }

  const id = decodeURIComponent(link.hash.slice(1));
  if (!id) {
    return;
  }

  event.preventDefault();
  ensureHeadingVisible(id, { scroll: true });

  void nextTick(() => {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#${encodeURIComponent(id)}`,
    );
  });
}

watch(
  [chunks, () => props.assetBase],
  () => {
    resetRendering();
  },
  { immediate: true },
);

watch(visibleChunkKey, () => {
  void nextTick(() => {
    schedulePostRenderWork();
  });
});

onBeforeUnmount(() => {
  isDisposed = true;

  if (typeof window !== "undefined") {
    if (scrollAnimationFrame !== null) {
      window.cancelAnimationFrame(scrollAnimationFrame);
    }

    if (postRenderAnimationFrame !== null) {
      window.cancelAnimationFrame(postRenderAnimationFrame);
    }

    if (pendingScrollTargetFrame !== null) {
      window.cancelAnimationFrame(pendingScrollTargetFrame);
    }
  }

  if (activeScrollParent) {
    activeScrollParent.removeEventListener("scroll", noteScrollActivity);
  }
});

defineExpose({ activeHeadingId, headings, ensureHeadingVisible });
</script>

<template>
  <div class="chunked-markdown-renderer">
    <div
      ref="containerRef"
      class="markdown-wrapper markdown-body"
      @click="handleMarkdownClick"
    >
      <div
        v-if="topSpacerHeight > 0"
        class="markdown-spacer"
        :style="{ height: `${topSpacerHeight}px` }"
        aria-hidden="true"
      ></div>
      <div
        v-for="chunk in visibleChunks"
        :key="chunk.index"
        class="markdown-chunk"
        :data-chunk-index="chunk.index"
        v-html="chunk.html"
      ></div>
      <div
        v-if="bottomSpacerHeight > 0"
        class="markdown-spacer"
        :style="{ height: `${bottomSpacerHeight}px` }"
        aria-hidden="true"
      ></div>
    </div>

    <div
      v-if="isPreparingVisibleChunks"
      class="chunk-progress"
      aria-live="polite"
    >
      <span class="chunk-progress-bar"></span>
      <span class="chunk-progress-text">Preparing more sections...</span>
    </div>
  </div>
</template>

<style scoped>
.chunked-markdown-renderer {
  display: grid;
  gap: 0;
  min-width: 0;
  max-width: 100%;
}

.chunk-progress {
  display: grid;
  gap: 10px;
  padding: 10px 0 4px;
}

.chunk-progress-bar {
  width: min(160px, 42%);
  height: 2px;
  background: var(--accent);
  opacity: 0.55;
}

.chunk-progress-text {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.markdown-spacer {
  min-height: 1px;
  pointer-events: none;
}

.markdown-chunk {
  min-width: 0;
  max-width: 100%;
}
</style>
