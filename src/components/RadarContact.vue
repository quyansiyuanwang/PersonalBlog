<script setup lang="ts">
import { ref, computed } from 'vue'

function seededRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
    s ^= s >>> 16
    return (s >>> 0) / 0xffffffff
  }
}

const rng = seededRng(0xb8ffca42)
const R = 42
const CX = 50, CY = 50

const SCATTER = (() => {
  const dots: { x: number; y: number; r: number; op: number; pd: number }[] = []
  while (dots.length < 50) {
    const a = rng() * Math.PI * 2
    const d = Math.sqrt(rng()) * R * 0.96
    const x = CX + d * Math.cos(a)
    const y = CY + d * Math.sin(a)
    if ((x - CX) ** 2 + (y - CY) ** 2 < R * R) {
      const ang = (((Math.atan2(y - CY, x - CX) + Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      dots.push({ x, y, r: 0.18 + rng() * 0.45, op: 0.04 + rng() * 0.16, pd: -(6 - 6 * ang / (Math.PI * 2)) })
    }
  }
  return dots
})()

// Major ticks every 30°, minor ticks every 5° (skip multiples of 30°)
const TICKS = Array.from({ length: 72 }, (_, i) => {
  const deg = i * 5
  const isMajor = deg % 30 === 0
  const a = (deg - 90) * Math.PI / 180
  const inner = isMajor ? R - 1.8 : R - 0.9
  const outer = isMajor ? R + 0.6 : R + 0.2
  return {
    x1: CX + inner * Math.cos(a), y1: CY + inner * Math.sin(a),
    x2: CX + outer * Math.cos(a), y2: CY + outer * Math.sin(a),
    major: isMajor,
  }
})

const CARDINALS = [
  { label: 'N', a: -90 }, { label: 'E', a: 0 },
  { label: 'S', a: 90 },  { label: 'W', a: 180 },
].map(c => ({
  label: c.label,
  x: CX + (R + 6) * Math.cos(c.a * Math.PI / 180),
  y: CY + (R + 6) * Math.sin(c.a * Math.PI / 180),
}))

interface ContactNode {
  id: string; label: string; value: string
  angle: number; distance: number; url?: string
  paintDelay: number
}
interface NodePos extends ContactNode {
  x: number; y: number; lx: number; ly: number; anchor: string
}

const nodes: ContactNode[] = [
  { id: 'mail',   label: 'MAIL',   value: 'quyansiyuanwang@qq.com',     angle: 0,   distance: 0.75, url: 'mailto:quyansiyuanwang@qq.com',      paintDelay: 0  },
  { id: 'github', label: 'GITHUB', value: 'github.com/quyansiyuanwang', angle: 120, distance: 0.75, url: 'https://github.com/quyansiyuanwang', paintDelay: -4 },
  { id: 'target', label: 'TARGET', value: '前端 / 后端 / 全栈实习生',      angle: 240, distance: 0.75, paintDelay: -2 },
]

const activeNode = ref<NodePos | null>(null)

const nodePositions = computed<NodePos[]>(() =>
  nodes.map(n => {
    const rad = (n.angle - 90) * Math.PI / 180
    const r = R * n.distance
    const x = CX + r * Math.cos(rad)
    const y = CY + r * Math.sin(rad)
    const a = n.angle
    let lx = x, ly = y, anchor = 'middle'
    if (a <= 40)         { ly = y - 12; anchor = 'middle' }
    else if (a < 140)    { lx = x + 12; anchor = 'start'  }
    else if (a <= 220)   { ly = y + 12; anchor = 'middle' }
    else                 { lx = x - 12; anchor = 'end'    }
    return { ...n, x, y, lx, ly, anchor }
  })
)

function activate(n: NodePos) { activeNode.value = n }
function deactivate() { activeNode.value = null }
function toggleNode(n: NodePos) {
  activeNode.value = activeNode.value?.id === n.id ? null : n
}
function activateById(id: string) {
  const n = nodePositions.value.find(p => p.id === id)
  if (n) activeNode.value = n
}
</script>

<template>
  <div class="rc">
    <!-- Left: radar -->
    <div class="rc-wrap">
      <div class="rc-sweep" aria-hidden="true" />

      <svg class="rc-svg" viewBox="-8 -8 116 116" role="img" aria-label="雷达联系面板">
        <defs>
          <radialGradient id="rcBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stop-color="var(--fui-cyan)" stop-opacity="0.06" />
            <stop offset="65%"  stop-color="var(--fui-cyan)" stop-opacity="0.025" />
            <stop offset="100%" stop-color="var(--fui-cyan)" stop-opacity="0" />
          </radialGradient>
          <clipPath id="rcClip">
            <circle cx="50" cy="50" r="42" />
          </clipPath>
        </defs>

        <circle cx="50" cy="50" r="42" fill="url(#rcBg)" />

        <g clip-path="url(#rcClip)">
          <circle v-for="(d, i) in SCATTER" :key="i"
            :cx="d.x" :cy="d.y" :r="d.r"
            fill="var(--fui-cyan)"
            class="scatter-dot"
            :style="{ '--op': d.op, '--scat-pd': `${d.pd}s` }" />
        </g>

        <!-- range rings (dashed, outer solid) -->
        <circle cx="50" cy="50" r="11" class="ring" />
        <circle cx="50" cy="50" r="21" class="ring" />
        <circle cx="50" cy="50" r="32" class="ring" />
        <circle cx="50" cy="50" r="42" class="ring ring-outer" />

        <!-- range labels -->
        <text x="50.8" y="39.5" class="rlbl" text-anchor="start">25</text>
        <text x="50.8" y="29.5" class="rlbl" text-anchor="start">50</text>
        <text x="50.8" y="18.5" class="rlbl" text-anchor="start">75</text>

        <!-- tick marks (major + minor) -->
        <g>
          <line v-for="(t, i) in TICKS" :key="i"
            :x1="t.x1" :y1="t.y1" :x2="t.x2" :y2="t.y2"
            :class="t.major ? 'tick-major' : 'tick-minor'" />
        </g>

        <!-- crosshairs (short segments, not full-width) -->
        <line x1="50" y1="9"  x2="50" y2="22"  class="cross" />
        <line x1="50" y1="78" x2="50" y2="91"  class="cross" />
        <line x1="9"  y1="50" x2="22" y2="50"  class="cross" />
        <line x1="78" y1="50" x2="91" y2="50"  class="cross" />

        <!-- cardinal labels -->
        <text v-for="c in CARDINALS" :key="c.label"
          :x="c.x" :y="c.y" class="card" text-anchor="middle" dominant-baseline="central">
          {{ c.label }}
        </text>

        <!-- axis dashes to nodes -->
        <line v-for="p in nodePositions" :key="'ax-'+p.id"
          class="axis" :x1="50" :y1="50" :x2="p.x" :y2="p.y" />

        <!-- contact nodes -->
        <g v-for="p in nodePositions" :key="'nd-'+p.id"
          class="node"
          :class="[`node-${p.id}`, { 'node-on': activeNode?.id === p.id }]"
          :style="{ '--pd': `${p.paintDelay}s` }"
          @mouseenter="activate(p)" @mouseleave="deactivate"
          @click="toggleNode(p)"
          role="button" :tabindex="0"
          :aria-label="`${p.label}: ${p.value}`"
          @keydown.enter="toggleNode(p)" @keydown.space.prevent="toggleNode(p)"
        >
          <!-- hit area -->
          <circle :cx="p.x" :cy="p.y" r="10" fill="transparent" />
          <!-- inner group scales on hover/active -->
          <g class="node-group">
            <circle :cx="p.x" :cy="p.y" r="2.5" class="blip-ring r1" />
            <circle :cx="p.x" :cy="p.y" r="2.5" class="blip-ring r2" />
            <circle :cx="p.x" :cy="p.y" r="2.5" class="blip-ring r3" />
            <circle :cx="p.x" :cy="p.y" r="4.2" class="blip-halo" />
            <circle :cx="p.x" :cy="p.y" r="6.5" class="blip-select" />
            <circle :cx="p.x" :cy="p.y" r="1.8" class="blip-core" />
          </g>
        </g>

        <!-- node labels -->
        <text v-for="p in nodePositions" :key="'lb-'+p.id"
          class="nlabel" :x="p.lx" :y="p.ly" :text-anchor="p.anchor"
          dominant-baseline="central" pointer-events="none"
        >{{ p.label }}</text>

        <!-- center mark -->
        <circle cx="50" cy="50" r="1.2" class="center-dot" />
        <line x1="48.2" y1="50" x2="51.8" y2="50" class="center-cross" />
        <line x1="50" y1="48.2" x2="50" y2="51.8" class="center-cross" />
      </svg>

      <!-- HUD corners -->
      <span class="hud-corner tl" aria-hidden="true" />
      <span class="hud-corner tr" aria-hidden="true" />
      <span class="hud-corner bl" aria-hidden="true" />
      <span class="hud-corner br" aria-hidden="true" />

      <!-- status strip -->
      <div class="rc-status" aria-hidden="true">
        <span class="rc-status-dot" />
        <span>SCANNING</span>
        <span class="rc-sep">│</span>
        <span>3 CONTACTS</span>
        <span class="rc-sep">│</span>
        <span>HOVER NODE</span>
      </div>
    </div>

    <!-- Right: permanent contact list -->
    <div class="clist" role="list">
      <div
        v-for="p in nodePositions" :key="p.id"
        class="citem"
        :class="{ 'citem-on': activeNode?.id === p.id }"
        role="listitem"
        :tabindex="0"
        :aria-label="`${p.label}: ${p.value}`"
        @mouseenter="activateById(p.id)"
        @mouseleave="deactivate"
        @click="toggleNode(p)"
        @keydown.enter="toggleNode(p)"
        @keydown.space.prevent="toggleNode(p)"
      >
        <div class="citem-head">
          <span class="citem-label">{{ p.label }}</span>
          <span class="citem-bearing">{{ String(p.angle).padStart(3, '0') }}°</span>
        </div>
        <div class="citem-val">{{ p.value }}</div>
        <a v-if="p.url"
          :href="p.url" target="_blank" rel="noopener noreferrer"
          class="citem-link" @click.stop>
          <span>{{ p.url.startsWith('mailto') ? '发送邮件' : '打开链接' }}</span>
          <span class="citem-arr">→</span>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ── */
.rc {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

.rc-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
}

.rc-svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
  position: relative;
  z-index: 1;
}

/* ── Phosphor sweep ── */
.rc-sweep {
  position: absolute;
  top: 13.5%; left: 13.5%;
  width: 73%; height: 73%;
  border-radius: 50%;
  pointer-events: none;
  animation: sweep-rot 6s linear infinite;
  background: conic-gradient(
    from 0deg at 50% 50%,
    transparent 0deg,
    transparent 275deg,
    color-mix(in srgb, var(--fui-cyan) 4%,  transparent) 300deg,
    color-mix(in srgb, var(--fui-cyan) 14%, transparent) 330deg,
    color-mix(in srgb, var(--fui-cyan) 36%, transparent) 360deg
  );
  mask-image: radial-gradient(circle, black 55%, transparent 88%);
  -webkit-mask-image: radial-gradient(circle, black 55%, transparent 88%);
  mix-blend-mode: color-dodge;
}
:root:not([data-theme='dark']) .rc-sweep {
  mix-blend-mode: multiply;
  background: conic-gradient(
    from 0deg at 50% 50%,
    transparent 0deg,
    transparent 275deg,
    color-mix(in srgb, var(--fui-cyan) 6%,  transparent) 300deg,
    color-mix(in srgb, var(--fui-cyan) 20%, transparent) 330deg,
    color-mix(in srgb, var(--fui-cyan) 44%, transparent) 360deg
  );
  mask-image: radial-gradient(circle, black 55%, transparent 88%);
  -webkit-mask-image: radial-gradient(circle, black 55%, transparent 88%);
}
@keyframes sweep-rot {
  to { transform: rotate(360deg); }
}

/* ── Scatter dots ── */
.scatter-dot {
  fill-opacity: var(--op);
  animation: scatter-blip 6s linear infinite;
  animation-delay: var(--scat-pd);
}
@keyframes scatter-blip {
  0%   { fill-opacity: var(--op); }
  2%   { fill-opacity: min(1, calc(var(--op) * 6)); }
  40%  { fill-opacity: calc(var(--op) * 2); }
  100% { fill-opacity: var(--op); }
}

/* ── Rings ── */
.ring {
  fill: none;
  stroke: var(--fui-cyan);
  stroke-width: 0.25;
  stroke-dasharray: 0.5 1.5;
  opacity: 0.14;
}
.ring-outer {
  stroke-dasharray: none;
  stroke-width: 0.4;
  opacity: 0.28;
}

/* ── Crosshairs ── */
.cross {
  stroke: var(--fui-cyan);
  stroke-width: 0.2;
  stroke-dasharray: 1.5 1;
  opacity: 0.12;
}

/* ── Tick marks ── */
.tick-major {
  stroke: var(--fui-cyan);
  stroke-width: 0.4;
  opacity: 0.32;
}
.tick-minor {
  stroke: var(--fui-cyan);
  stroke-width: 0.22;
  opacity: 0.16;
}

/* ── Axis dashes ── */
.axis {
  stroke: var(--fui-cyan);
  stroke-width: 0.28;
  stroke-dasharray: 0.8 2;
  opacity: 0.12;
}

/* ── Labels ── */
.rlbl {
  fill: var(--fui-cyan);
  font-family: var(--font-mono);
  font-size: 2px;
  opacity: 0.3;
}
.card {
  fill: var(--fui-cyan);
  font-family: var(--font-hud);
  font-size: 2.8px;
  font-weight: 700;
  letter-spacing: 0.05em;
  opacity: 0.35;
}
.nlabel {
  fill: var(--text-main);
  font-family: var(--font-hud);
  font-size: 2.8px;
  font-weight: 700;
  letter-spacing: 0.14em;
  opacity: 0.82;
}

/* ── Center mark ── */
.center-dot  { fill: var(--fui-cyan); opacity: 0.65; }
.center-cross { stroke: var(--fui-cyan); stroke-width: 0.25; opacity: 0.5; }

/* ── Blips ── */
.node { cursor: crosshair; outline: none; }
.node:focus-visible .node-group { transform: scale(1.3); }

.node-group {
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-box: fill-box;
  transform-origin: center;
}
.node:hover .node-group {
  transform: scale(1.45);
}
.node-on .node-group {
  transform: scale(1.25);
}

.blip-core {
  fill: var(--fui-cyan);
  filter: drop-shadow(0 0 1.5px var(--fui-cyan));
  animation: blip-paint 6s linear infinite;
  animation-delay: var(--pd);
}
.node-on .blip-core {
  fill: #fff;
  filter: drop-shadow(0 0 2.5px var(--fui-cyan)) drop-shadow(0 0 5px var(--fui-cyan));
  animation: none;
  opacity: 1;
  r: 2.4;
}

.blip-select {
  fill: none;
  stroke: var(--fui-cyan);
  stroke-width: 0.5;
  stroke-dasharray: 2.5 1.5;
  opacity: 0;
  transition: opacity 0.18s ease;
}
.node-on .blip-select {
  opacity: 0.7;
}
.blip-halo {
  fill: var(--fui-cyan);
  opacity: 0.07;
  animation: halo-paint 6s linear infinite;
  animation-delay: var(--pd);
}
.blip-ring {
  fill: none;
  stroke: var(--fui-cyan);
  stroke-width: 0.45;
  opacity: 0;
}
.blip-ring.r1 {
  animation: ring-expand 6s linear infinite;
  animation-delay: var(--pd);
}
.blip-ring.r2 {
  animation: ring-expand 6s linear infinite;
  animation-delay: calc(var(--pd) - 0.5s);
}
.blip-ring.r3 {
  animation: ring-expand 6s linear infinite;
  animation-delay: calc(var(--pd) - 1.0s);
}

@keyframes blip-paint {
  0%   { opacity: 1;    r: 2.2; }
  4%   { opacity: 1;    r: 2.8; }
  25%  { opacity: 0.72; r: 2.0; }
  80%  { opacity: 0.38; }
  100% { opacity: 0.38; }
}
@keyframes halo-paint {
  0%  { opacity: 0.2; r: 5.5; }
  4%  { opacity: 0.28; r: 7.5; }
  30% { opacity: 0.09; r: 4.5; }
  100%{ opacity: 0.06; r: 4.2; }
}
@keyframes ring-expand {
  0%   { r: 2.5; opacity: 0.65; }
  4%   { r: 2.5; opacity: 0.75; }
  35%  { r: 9;   opacity: 0.12; }
  65%  { r: 13;  opacity: 0;    }
  100% { r: 2.5; opacity: 0;    }
}

/* ── HUD corners ── */
.hud-corner {
  position: absolute;
  width: 13px; height: 13px;
  border-color: var(--fui-cyan);
  border-style: solid;
  opacity: 0.3;
}
.hud-corner.tl { top: 2px;    left: 2px;    border-width: 1.5px 0 0 1.5px; }
.hud-corner.tr { top: 2px;    right: 2px;   border-width: 1.5px 1.5px 0 0; }
.hud-corner.bl { bottom: 2px; left: 2px;    border-width: 0 0 1.5px 1.5px; }
.hud-corner.br { bottom: 2px; right: 2px;   border-width: 0 1.5px 1.5px 0; }

/* ── Status strip ── */
.rc-status {
  position: absolute;
  bottom: 6px; left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 0.56rem;
  letter-spacing: 0.1em;
  color: var(--fui-cyan);
  opacity: 0.45;
  white-space: nowrap;
  pointer-events: none;
}
.rc-status-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--fui-cyan);
  animation: dot-blink 2s ease-in-out infinite;
}
.rc-sep { opacity: 0.4; }
@keyframes dot-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.15; }
}

/* ── Contact list ── */
.clist {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-top: 4px;
}

.citem {
  padding: 10px 12px 10px 14px;
  border-left: 2px solid transparent;
  border-bottom: 1px solid var(--fui-border-color);
  cursor: pointer;
  transition: border-left-color 0.18s ease, background 0.18s ease, padding-left 0.18s ease;
  user-select: none;
  outline: none;
}
.citem:first-child { border-top: 1px solid var(--fui-border-color); }
.citem:hover,
.citem-on {
  border-left-color: var(--fui-cyan);
  background: var(--accent-soft);
  padding-left: 18px;
}
.citem:focus-visible {
  outline: 1px solid var(--fui-cyan);
  outline-offset: -2px;
  border-radius: 3px;
}

.citem-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 3px;
}
.citem-label {
  font-family: var(--font-hud);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--fui-cyan);
}
.citem-bearing {
  font-family: var(--font-mono);
  font-size: 0.54rem;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  opacity: 0.45;
}
.citem-val {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-main);
  word-break: break-all;
  margin-bottom: 6px;
  line-height: 1.35;
}
.citem-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-hud);
  font-size: 0.6rem;
  color: var(--accent);
  text-decoration: none;
  letter-spacing: 0.05em;
  transition: gap 0.15s ease;
}
.citem-link:hover { gap: 8px; }
.citem-arr { transition: transform 0.15s ease; }
.citem-link:hover .citem-arr { transform: translateX(2px); }

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .rc-sweep, .blip-core, .blip-halo, .blip-ring, .rc-status-dot, .scatter-dot {
    animation: none;
  }
  .node-group { transition: none; }
  .citem { transition: none; }
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .rc {
    grid-template-columns: 1fr;
  }
  .rc-wrap { max-width: 380px; margin: 0 auto; }
}
@media (max-width: 560px) {
  .rc-wrap { max-width: 100%; }
}
</style>
