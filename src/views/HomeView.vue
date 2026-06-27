<script setup lang="ts">
import PostMeta from '../components/PostMeta.vue'
import { getAllPosts, getTagMap } from '../lib/posts'
import { siteConfig } from '../lib/site'
import { useSubtitle } from '../lib/subtitle'
import { useScrollReveal } from '../lib/scrollReveal'
import { computed, ref, onMounted, onUnmounted } from 'vue'

const posts = getAllPosts()
const tagMap = getTagMap()
const subtitle = useSubtitle()
const { observe } = useScrollReveal()

const tags = computed(() =>
	Object.entries(tagMap).sort(([, a], [, b]) => b.length - a.length)
)

const totalPosts = computed(() => posts.length)
const totalTags = computed(() => tags.value.length)
const totalReadingTime = computed(() =>
	posts.reduce((sum, p) => sum + p.readingTime, 0)
)
const dateRange = computed(() => {
	if (posts.length === 0) return ''
	const dates = posts.map((p) => p.frontmatter.date).sort()
	return `${dates[0].slice(0, 4)} — ${dates[dates.length - 1].slice(0, 4)}`
})

const bootPhase = ref<'booting' | 'online'>('booting')
const bootLines = ref<string[]>([])
const bootLog = [
	'[SYS] SIGNAL HUB v2.4.1 — BOOT SEQUENCE',
	'[SYS] 4 P-CORES · 8 E-CORES · 32 GB LPDDR5',
	'[SYS] 1 TB NVMe · 10 GbE LINK UP',
	'[SYS] 4 RECORDS · 19 TAGS · SENSORS NOMINAL',
	'[SYS] READY',
]

const signalBars = ref([0.55, 0.72, 0.38, 0.64])
let bootTimer: ReturnType<typeof setTimeout> | null = null
let barTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
	let i = 0
	const tick = () => {
		if (i < bootLog.length) {
			bootLines.value.push(bootLog[i])
			i++
			bootTimer = setTimeout(tick, 160)
		} else {
			bootTimer = setTimeout(() => { bootPhase.value = 'online' }, 500)
		}
	}
	tick()

	barTimer = setInterval(() => {
		signalBars.value = signalBars.value.map(
			(base) => Math.max(0.25, Math.min(1, base + (Math.random() - 0.5) * 0.3))
		)
	}, 2000)
})

onUnmounted(() => {
	if (bootTimer) clearTimeout(bootTimer)
	if (barTimer) clearInterval(barTimer)
})

const stats = computed(() => [
	{ value: totalPosts.value, label: 'POSTS', ratio: Math.min(totalPosts.value / 15, 1) },
	{ value: totalTags.value, label: 'TAGS', ratio: Math.min(totalTags.value / 25, 1) },
	{ value: totalReadingTime.value, label: 'MIN READ', ratio: Math.min(totalReadingTime.value / 200, 1) },
	{ value: '25–26', label: 'RANGE', ratio: 1 },
])

</script>

<template>
	<div class="home-view page-stack" :ref="observe">
		<!-- ─── Zone 1: Hero + Telemetry (side by side) ─── -->
		<section class="reveal zone-top">
			<Transition name="boot-up">
				<div v-if="bootPhase === 'booting'" class="boot-panel">
					<pre class="boot-window"><code
						v-for="(line, i) in bootLines"
						:key="i"
						class="boot-line"
					>> {{ line }}<span v-if="i === bootLines.length - 1 && bootLines.length < bootLog.length" class="boot-csr">▊</span>
					</code></pre>
				</div>
			</Transition>

			<Transition name="hero-in">
				<div v-if="bootPhase === 'online'" class="hero-telemetry">
					<!-- left: hero -->
					<div class="hero-block">
						<div class="hero-tagline">
							<span class="hero-live"></span>
							<span>[LIVE]</span>
							<span class="hero-tag-sep">|</span>
							<span>{{ siteConfig.location }}</span>
							<span class="hero-tag-sep">|</span>
							<span class="hero-tag-uptime">UPTIME {{ posts.length }} RECORDS</span>
						</div>

						<h1 class="hero-title">{{ siteConfig.title }}</h1>

						<div class="hero-sub">
							<span class="hero-sub-text">{{ subtitle }}</span>
							<span class="hero-cur">_</span>
						</div>

						<p class="hero-desc">{{ siteConfig.description }}</p>

						<div class="hero-chips">
							<span class="hero-chip">BANDWIDTH: {{ tags.length }} CHANNELS</span>
							<span class="hero-chip">LATENCY: {{ totalReadingTime }} MIN</span>
						</div>
					</div>

					<!-- right: telemetry cards, 2x2 -->
					<div class="telemetry-panel">
						<div class="tele-hd">
							<span class="tele-hd-dot"></span>
							<span>TELEMETRY</span>
						</div>
						<div class="tele-list">
							<div
								v-for="(stat, idx) in stats"
								:key="stat.label"
								class="tele-row"
							>
								<div class="tele-meta">
									<span class="tele-lbl">{{ stat.label }}</span>
								</div>
								<div class="tele-gauge">
									<svg class="tele-ring" viewBox="0 0 100 100">
										<circle class="tele-track" cx="50" cy="50" r="42" />
										<circle
											class="tele-arc"
											cx="50" cy="50" r="42"
											:style="{ '--arc': `${264 - 264 * stat.ratio}` }"
										/>
									</svg>
									<span class="tele-val">{{ stat.value }}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</Transition>
		</section>

		<!-- ─── Zone 2: Transmission Log (staircase zigzag) ─── -->
		<section v-if="posts.length > 0" class="reveal zone-mid">
			<div class="section-rail">
				<span class="rail-tag">TRACE</span>
				<span class="rail-line"></span>
				<span class="rail-label">TRANSMISSION LOG — {{ posts.length }} EVENTS</span>
				<RouterLink to="/archive" class="rail-link">VIEW ALL &rarr;</RouterLink>
			</div>

			<div class="staircase">
				<article
					v-for="(post, index) in posts"
					:key="post.slug"
					class="stair-entry"
				>
					<!-- staircase node -->
					<div class="stair-node" aria-hidden="true">
						<span class="stair-dot" :style="{ '--pulse-delay': `${index * 0.5}s` }"></span>
						<span v-if="index < posts.length - 1" class="stair-arm"></span>
					</div>

					<!-- card -->
					<div class="stair-card">
						<div class="stair-head">
							<span class="stair-sig">SIG-{{ String(index + 1).padStart(3, '0') }}</span>
							<PostMeta :post="post" compact />
						</div>
						<h3 class="stair-title">
							<RouterLink :to="`/post/${post.slug}`">{{ post.frontmatter.title }}</RouterLink>
						</h3>
						<p class="stair-summary">{{ post.frontmatter.summary }}</p>
						<div class="stair-foot">
							<div class="stair-tags">
								<RouterLink v-for="tag in post.frontmatter.tags" :key="tag" :to="`/tags/${tag}`" class="stair-tag">#{{ tag }}</RouterLink>
							</div>
							<RouterLink :to="`/post/${post.slug}`" class="stair-open">READ &rarr;</RouterLink>
						</div>
					</div>
				</article>
			</div>
		</section>

		<!-- ─── Zone 3: Frequency Bands (full width) ─── -->
		<section v-if="tags.length > 0" class="reveal zone-bot">
			<div class="section-rail">
				<span class="rail-tag">BANDS</span>
				<span class="rail-line"></span>
				<span class="rail-label">{{ tags.length }} ACTIVE</span>
				<RouterLink to="/tags" class="rail-link">BROWSE ALL &rarr;</RouterLink>
			</div>
			<div class="freq-wave">
				<RouterLink
					v-for="([tag, tagPosts], _) in tags"
					:key="tag"
					:to="`/tags/${tag}`"
					class="freq-bar"
					:style="{
						'--h': `${0.2 + (tagPosts.length / tags[0][1].length) * 0.8}`,
					}"
				>
					<span class="freq-fill"></span>
					<span class="freq-name">{{ tag }}</span>
					<span class="freq-num">{{ tagPosts.length }}</span>
				</RouterLink>
			</div>
		</section>
	</div>
</template>

<style scoped>
/* ══════════════════════════════════════════════
   SIGNAL CONSOLE — LAYOUT
   ══════════════════════════════════════════════ */

.home-view {
	--crt: color-mix(in srgb, var(--accent) 3%, transparent);
	position: relative;
	display: grid;
	gap: 48px;
	padding: 6px 0 48px;
}

/* ── shared rails ── */
.section-rail {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 16px;
}
.rail-tag {
	font-family: var(--font-mono);
	font-size: 0.58rem;
	letter-spacing: 0.1em;
	color: var(--accent);
	opacity: 0.4;
	border: 1px solid color-mix(in srgb, var(--accent) 15%, transparent);
	padding: 1px 6px;
	border-radius: 3px;
}
.rail-line {
	flex: 0 0 24px;
	height: 1px;
	background: color-mix(in srgb, var(--accent) 25%, transparent);
}
.rail-label {
	font-family: var(--font-mono);
	font-size: 0.66rem;
	letter-spacing: 0.12em;
	color: var(--text-muted);
	opacity: 0.5;
	text-transform: uppercase;
	flex: 1;
}
.rail-link {
	font-family: var(--font-mono);
	font-size: 0.6rem;
	color: var(--accent);
	text-decoration: none;
	opacity: 0.35;
	transition: opacity 0.2s ease;
}
.rail-link:hover { opacity: 1; }

/* ═══════════════════ BOOT ═══════════════════ */

.boot-panel {
	border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
	border-radius: 6px;
	background: color-mix(in srgb, #000 76%, var(--accent) 2%);
	overflow: hidden;
	box-shadow: 0 0 24px color-mix(in srgb, var(--accent) 5%, transparent);
}
.boot-window {
	margin: 0;
	padding: 16px;
	display: grid;
	gap: 2px;
}
.boot-line {
	display: block;
	font-family: var(--font-mono);
	font-size: 0.7rem;
	line-height: 1.7;
	color: color-mix(in srgb, var(--accent) 64%, #fff 36%);
	opacity: 0;
	animation: fade-in 0.2s ease forwards;
	white-space: pre;
}
@keyframes fade-in { to { opacity: 0.85; } }
.boot-csr {
	animation: blk 0.5s step-end infinite;
	color: var(--accent);
}
@keyframes blk { 0%,100% { opacity:1; } 50% { opacity:0; } }

.boot-up-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; position: absolute; }
.boot-up-leave-to { opacity: 0; transform: scale(0.97); }

/* ═══════════════════ HERO + TELEMETRY ═══════════════════ */

.zone-top { position: relative; min-height: 200px; }

.hero-telemetry {
	display: grid;
	grid-template-columns: 1.5fr 1fr;
	gap: 28px;
	align-items: start;
}

/* left: hero */
.hero-block {
	display: grid;
	gap: 14px;
	padding: 8px 0;
}
.hero-tagline {
	display: flex;
	align-items: center;
	gap: 6px;
	font-family: var(--font-mono);
	font-size: 0.62rem;
	color: var(--text-muted);
}
.hero-live {
	display: block;
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: #27c93f;
	animation: live-pulse 1.6s ease-in-out infinite;
	box-shadow: 0 0 6px #27c93f;
}
@keyframes live-pulse {
	0%,100% { opacity: 1; }
	50% { opacity: 0.3; }
}
.hero-tag-sep { opacity: 0.2; }
.hero-tag-uptime { opacity: 0.4; }

.hero-title {
	margin: 0;
	font-family: var(--font-heading);
	font-size: clamp(3.4rem, 9vw, 7.6rem);
	font-weight: 500;
	letter-spacing: 0.02em;
	line-height: 0.9;
	color: var(--text-main);
	text-shadow:
		0 0 30px color-mix(in srgb, var(--accent) 8%, transparent),
		0 0 80px color-mix(in srgb, var(--accent) 3%, transparent);
}

.hero-sub {
	font-family: var(--font-mono);
	font-size: 0.98rem;
	color: var(--accent);
	min-height: 1.8em;
	text-shadow: 0 0 14px color-mix(in srgb, var(--accent) 18%, transparent);
}
.hero-sub-text { white-space: pre-wrap; }
.hero-cur { animation: cur-blink 0.8s step-end infinite; }
@keyframes cur-blink { 0%,100% { opacity:1; } 50% { opacity:0; } }

.hero-desc {
	margin: 0;
	max-width: 52ch;
	color: var(--text-muted);
	font-size: 0.9rem;
	line-height: 1.8;
	opacity: 0.7;
}

.hero-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}
.hero-chip {
	font-family: var(--font-mono);
	font-size: 0.56rem;
	padding: 3px 8px;
	border: 1px solid color-mix(in srgb, var(--line) 28%, transparent);
	border-radius: 3px;
	color: var(--text-muted);
	opacity: 0.4;
	letter-spacing: 0.04em;
}

/* right: telemetry */
.telemetry-panel {
	border: 1px solid color-mix(in srgb, var(--line) 35%, transparent);
	border-radius: 6px;
	background: color-mix(in srgb, var(--surface) 35%, transparent);
	overflow: hidden;
}
.tele-hd {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 8px 14px;
	font-family: var(--font-mono);
	font-size: 0.6rem;
	color: var(--text-muted);
	opacity: 0.4;
	letter-spacing: 0.08em;
	border-bottom: 1px solid color-mix(in srgb, var(--line) 30%, transparent);
}
.tele-hd-dot {
	display: block;
	width: 4px; height: 4px;
	border-radius: 50%;
	background: var(--accent);
	opacity: 0.3;
}

.tele-list {
	display: grid;
	gap: 0;
}

.tele-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 12px 14px 12px 18px;
	border-bottom: 1px solid color-mix(in srgb, var(--line) 12%, transparent);
}
.tele-row:last-child { border-bottom: none; }

.tele-meta {
	display: grid;
	gap: 2px;
}

.tele-lbl {
	font-family: var(--font-mono);
	font-size: 0.7rem;
	letter-spacing: 0.12em;
	color: var(--text-muted);
	opacity: 0.55;
	font-weight: 500;
}

.tele-gauge {
	position: relative;
	width: 60px;
	height: 60px;
	display: grid;
	place-items: center;
	flex-shrink: 0;
}

.tele-ring {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	transform: rotate(-90deg);
}
.tele-track {
	fill: none;
	stroke: color-mix(in srgb, var(--line) 35%, transparent);
	stroke-width: 5;
}
.tele-arc {
	fill: none;
	stroke: var(--accent);
	stroke-width: 5;
	stroke-linecap: round;
	stroke-dasharray: 264;
	stroke-dashoffset: var(--arc, 264);
	transition: stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1);
	filter: drop-shadow(0 0 5px color-mix(in srgb, var(--accent) 30%, transparent));
}
.tele-val {
	font-family: var(--font-mono);
	font-size: 0.85rem;
	font-weight: 600;
	color: var(--accent);
	z-index: 1;
	line-height: 1;
}

.hero-in-enter-active { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.hero-in-enter-from { opacity: 0; transform: translateY(16px); }

/* ═══════════════════ STAIRCASE TIMELINE ═══════════════════ */

.staircase {
	display: grid;
	gap: 0;
}

.stair-entry {
	display: flex;
	gap: 0;
	position: relative;
}

.stair-node {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 36px;
	flex-shrink: 0;
	padding-top: 28px;
	position: relative;
	z-index: 1;
}

.stair-dot {
	display: block;
	width: 12px;
	height: 12px;
	border-radius: 50%;
	border: 2px solid var(--accent);
	background: var(--bg);
	flex-shrink: 0;
	z-index: 2;
	box-shadow: 0 0 6px color-mix(in srgb, var(--accent) 15%, transparent);
	animation: stair-pulse 3s ease-in-out var(--pulse-delay, 0s) infinite;
}
@keyframes stair-pulse {
	0%,100% { box-shadow: 0 0 6px color-mix(in srgb, var(--accent) 12%, transparent); }
	50% { box-shadow: 0 0 18px color-mix(in srgb, var(--accent) 28%, transparent); }
}

.stair-arm {
	display: block;
	width: 2px;
	flex: 1;
	min-height: 100%;
	background: linear-gradient(180deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 10%, transparent) 100%);
	opacity: 0.15;
}

.stair-card {
	flex: 1;
	display: grid;
	gap: 5px;
	padding: 16px 18px;
	min-width: 0;
	margin: 14px 0;
	border-radius: 6px;
	border: 1px solid color-mix(in srgb, var(--line) 30%, transparent);
	background: color-mix(in srgb, var(--surface) 25%, transparent);
	position: relative;
	transition:
		border-color 0.25s ease,
		background 0.25s ease,
		box-shadow 0.25s ease;
}
.stair-card::before {
	content: '';
	position: absolute;
	left: 0;
	top: 14px;
	bottom: 14px;
	width: 2px;
	border-radius: 1px;
	background: linear-gradient(180deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 15%, transparent) 100%);
	opacity: 0;
	transition: opacity 0.25s ease;
}
.stair-card:hover {
	border-color: color-mix(in srgb, var(--accent) 22%, transparent);
	background: color-mix(in srgb, var(--accent) 3%, transparent);
	box-shadow: 0 0 24px color-mix(in srgb, var(--accent) 5%, transparent);
}
.stair-card:hover::before { opacity: 0.5; }

.stair-head {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
}
.stair-sig {
	font-family: var(--font-mono);
	font-size: 0.6rem;
	color: var(--accent);
	opacity: 0.35;
	letter-spacing: 0.04em;
	border: 1px solid color-mix(in srgb, var(--accent) 12%, transparent);
	padding: 0 6px;
	border-radius: 3px;
}

.stair-title {
	margin: 0;
	font-size: 1rem;
	font-weight: 550;
	line-height: 1.38;
}
.stair-title a {
	color: var(--text-main);
	text-decoration: none;
	transition: color 0.2s ease;
}
.stair-title a:hover { color: var(--accent); }

.stair-summary {
	margin: 0;
	font-size: 0.82rem;
	line-height: 1.6;
	color: var(--text-muted);
	opacity: 0.65;
	display: -webkit-box;
	-webkit-line-clamp: 1;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.stair-foot {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin-top: 2px;
}
.stair-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 2px 6px;
}
.stair-tag {
	font-family: var(--font-mono);
	font-size: 0.6rem;
	color: var(--text-muted);
	text-decoration: none;
	opacity: 0.35;
	transition: opacity 0.2s ease, color 0.2s ease;
}
.stair-tag:hover { color: var(--accent); opacity: 1; }

.stair-open {
	font-family: var(--font-mono);
	font-size: 0.6rem;
	color: var(--accent);
	text-decoration: none;
	opacity: 0.35;
	flex-shrink: 0;
	transition: opacity 0.2s ease;
}
.stair-open:hover { opacity: 1; }

/* ═══════════════════ BOTTOM ZONE ═══════════════════ */

.zone-bot {
	border: 1px solid color-mix(in srgb, var(--line) 30%, transparent);
	border-radius: 6px;
	padding: 14px 14px 12px;
	background: color-mix(in srgb, var(--surface) 30%, transparent);
}

.freq-wave {
	display: flex;
	flex-wrap: wrap;
	gap: 2px;
	align-items: flex-end;
	min-height: 100px;
}
.freq-bar {
	display: grid;
	gap: 2px;
	text-decoration: none;
	align-items: center;
	justify-items: center;
	padding: 2px 3px;
	flex: 1 0 auto;
	min-width: 32px;
	max-width: 60px;
	border-radius: 3px;
	transition: background 0.2s ease;
}
.freq-bar:hover { background: color-mix(in srgb, var(--accent) 5%, transparent); }

.freq-fill {
	display: block;
	width: 100%;
	max-width: 22px;
	height: calc(50px * var(--h, 0.5));
	border-radius: 2px 2px 0 0;
	background: linear-gradient(180deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 10%, transparent) 100%);
	opacity: 0.35;
	transition: opacity 0.2s ease, box-shadow 0.2s ease;
}
.freq-bar:hover .freq-fill {
	opacity: 0.8;
	box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 25%, transparent);
}

.freq-name {
	font-family: var(--font-mono);
	font-size: 0.5rem;
	color: var(--text-muted);
	text-align: center;
	line-height: 1.2;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	opacity: 0.5;
}
.freq-num {
	font-family: var(--font-mono);
	font-size: 0.48rem;
	color: var(--accent);
	opacity: 0.25;
}

/* ═══════════════════ RESPONSIVE ═══════════════════ */

@media (max-width: 1024px) {
	.hero-telemetry {
		grid-template-columns: 1fr;
		gap: 20px;
	}
	.telemetry-panel {
		max-width: 360px;
	}
}

@media (max-width: 820px) {
	.home-view { gap: 36px; }

	.hero-title {
		font-size: clamp(2.6rem, 10vw, 4rem);
	}

	.stair-node { width: 28px; }
	.stair-card { padding: 12px 14px; }
	.stair-sig { font-size: 0.56rem; }

	.telemetry-panel { max-width: 100%; }

	.freq-bar { min-width: 28px; max-width: 48px; }
}

@media (max-width: 560px) {
	.home-view { gap: 28px; }

	.stair-dot { width: 8px; height: 8px; border-width: 1.5px; }

	.tele-row { padding: 10px 12px 10px 14px; }
	.tele-gauge { width: 48px; height: 48px; }
	.tele-val { font-size: 0.72rem; }
	.tele-lbl { font-size: 0.62rem; }
}
</style>
