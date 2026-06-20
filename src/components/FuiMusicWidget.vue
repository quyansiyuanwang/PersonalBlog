<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { musicTracks } from '../lib/music'

const tracks = musicTracks

const audioRef = ref<HTMLAudioElement | null>(null)
const currentIndex = ref(0)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const isReady = ref(false)
const isLoading = ref(false)
const pendingPlayAfterLoad = ref(false)
const rotationDeg = ref(0)
const preloadedTrackId = ref<string | null>(null)
const requestedTrackId = ref<string | null>(null)

let animationFrameId: number | null = null
let lastFrameTime = 0
let preloadToken = 0
let readinessToken = 0

const currentTrack = computed(() => tracks[currentIndex.value])
const currentTrackUrl = computed(() => new URL(currentTrack.value.url, window.location.href).href)
const progressPercent = computed(() => {
  if (!duration.value) {
    return 0
  }

  return Math.min((currentTime.value / duration.value) * 100, 100)
})

const statusLabel = computed(() => {
  if (isLoading.value) {
    return '[BUFFER]'
  }

  if (!isReady.value) {
    return '[LOAD]'
  }

  return isPlaying.value ? '[PLAY]' : '[PAUSE]'
})

const currentTrackStateLabel = computed(() => {
  if (isLoading.value) {
    return 'LOADING'
  }

  if (isPlaying.value) {
    return 'PLAYING'
  }

  if (isReady.value) {
    return 'READY'
  }

  return 'LOAD'
})

const armActive = computed(() => isPlaying.value)
const recordStyle = computed(() => ({
  transform: `rotate(${rotationDeg.value}deg)`,
}))

function stopRotationLoop() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  lastFrameTime = 0
}

function stepRotation(timestamp: number) {
  if (!isPlaying.value) {
    stopRotationLoop()
    return
  }

  if (!lastFrameTime) {
    lastFrameTime = timestamp
  }

  const delta = timestamp - lastFrameTime
  lastFrameTime = timestamp
  rotationDeg.value = (rotationDeg.value - delta * 0.042 + 360) % 360
  animationFrameId = requestAnimationFrame(stepRotation)
}

function startRotationLoop() {
  if (animationFrameId !== null) {
    return
  }

  animationFrameId = requestAnimationFrame(stepRotation)
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '00:00'
  }

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function syncTrack() {
  const audio = audioRef.value
  if (!audio) {
    return
  }

  const shouldResumePlayback = isPlaying.value || pendingPlayAfterLoad.value

  preloadToken += 1
  isReady.value = false
  isLoading.value = true
  pendingPlayAfterLoad.value = shouldResumePlayback
  currentTime.value = 0
  duration.value = 0
  preloadedTrackId.value = null
  requestedTrackId.value = currentTrack.value.id
  audio.pause()
  audio.src = currentTrackUrl.value
  audio.load()
}

function isCurrentTrackRequestActive() {
  const audio = audioRef.value
  if (!audio) {
    return false
  }

  return requestedTrackId.value === currentTrack.value.id && audio.src === currentTrackUrl.value
}

function hasActiveTrackRequest() {
  return isLoading.value && requestedTrackId.value !== null
}

async function ensureTrackReady(autoplay = false) {
  const audio = audioRef.value
  if (!audio) {
    return false
  }

  if (preloadedTrackId.value === currentTrack.value.id && isReady.value) {
    if (autoplay) {
      try {
        await audio.play()
        return true
      } catch {
        isPlaying.value = false
        return false
      }
    }

    return true
  }

  pendingPlayAfterLoad.value = autoplay
  if (isCurrentTrackRequestActive()) {
    return false
  }

  if (audio.src !== currentTrackUrl.value) {
    syncTrack()
  }
  return false
}

async function togglePlayback() {
  const audio = audioRef.value
  if (!audio) {
    return
  }

  if (isPlaying.value) {
    audio.pause()
    return
  }

  if (!(await ensureTrackReady(true))) {
    return
  }
}

function playNext() {
  currentIndex.value = (currentIndex.value + 1) % tracks.length
}

function selectTrack(index: number) {
  if (index === currentIndex.value) {
    return
  }

  if (hasActiveTrackRequest()) {
    return
  }

  currentIndex.value = index
}

function seekTrack(event: MouseEvent) {
  const audio = audioRef.value
  const target = event.currentTarget as HTMLButtonElement | null
  if (!audio || !target || !duration.value) {
    return
  }

  const rect = target.getBoundingClientRect()
  const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
  audio.currentTime = ratio * duration.value
}

function handleLoadedMetadata() {
  const audio = audioRef.value
  if (!audio) {
    return
  }

  duration.value = audio.duration
}

async function markTrackReady() {
  const audio = audioRef.value
  if (!audio) {
    return
  }

  if (audio.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return
  }

  const token = ++readinessToken

  preloadedTrackId.value = currentTrack.value.id
  requestedTrackId.value = null
  isReady.value = true
  isLoading.value = false

  if (!pendingPlayAfterLoad.value) {
    return
  }

  pendingPlayAfterLoad.value = false

  try {
    await audio.play()
    if (token !== readinessToken) {
      return
    }
  } catch {
    isPlaying.value = false
  }
}

function handleLoadedData() {
  void markTrackReady()
}

function handleCanPlay() {
  void markTrackReady()
}

function handleCanPlayThrough() {
  void markTrackReady()
}

function handleTimeUpdate() {
  const audio = audioRef.value
  if (!audio) {
    return
  }

  currentTime.value = audio.currentTime
}

function handlePlay() {
  isPlaying.value = true
}

function handlePause() {
  isPlaying.value = false
}

function handleEnded() {
  pendingPlayAfterLoad.value = true
  playNext()
}

function handleWaiting() {
  if (!isReady.value) {
    isLoading.value = true
  }
}

function handleError() {
  isLoading.value = false
  isReady.value = false
  pendingPlayAfterLoad.value = false
  requestedTrackId.value = null
  isPlaying.value = false
}

watch(currentIndex, () => {
  syncTrack()
})

watch(isPlaying, (playing) => {
  if (playing) {
    startRotationLoop()
    return
  }

  stopRotationLoop()
})

onMounted(() => {
  syncTrack()
})

onBeforeUnmount(() => {
  stopRotationLoop()
  audioRef.value?.pause()
})
</script>

<template>
  <div class="fui-music-widget" :class="{ playing: isPlaying }">
    <audio
      ref="audioRef"
      preload="auto"
      @canplay="handleCanPlay"
      @canplaythrough="handleCanPlayThrough"
      @ended="handleEnded"
      @error="handleError"
      @loadeddata="handleLoadedData"
      @loadedmetadata="handleLoadedMetadata"
      @pause="handlePause"
      @play="handlePlay"
      @timeupdate="handleTimeUpdate"
      @waiting="handleWaiting"
    ></audio>

    <div class="fui-widget-header">
      <span class="fui-label">AUDIO_PLAYER</span>
      <span class="fui-status">{{ statusLabel }}</span>
    </div>

    <div class="vinyl-stage">
      <button
        class="tonearm-button"
        :class="{ active: armActive }"
        type="button"
        @click="togglePlayback"
      >
        <span class="tonearm-pivot">
          <span class="tonearm-base"></span>
          <span class="tonearm-arm"></span>
        </span>
      </button>

      <div class="vinyl-record" :style="recordStyle">
        <div class="vinyl-ring ring-1"></div>
        <div class="vinyl-ring ring-2"></div>
        <div class="vinyl-ring ring-3"></div>
        <div class="vinyl-label">
          <span class="vinyl-label-title">{{ currentTrack.title }}</span>
          <span class="vinyl-label-artist">{{ currentTrack.artist }}</span>
        </div>
        <div class="vinyl-center"></div>
      </div>
    </div>

    <div class="fui-track-meta">
      <span class="fui-track-name">{{ currentTrack.title }}</span>
      <span class="fui-track-artist">{{ currentTrack.artist }}</span>
    </div>

    <div class="fui-playlist">
      <button
        v-for="(track, index) in tracks"
        :key="track.id"
        class="fui-playlist-item"
        :class="{
          active: currentTrack.id === track.id,
          ready: preloadedTrackId === track.id,
        }"
        type="button"
        @click="selectTrack(index)"
      >
        <span class="fui-playlist-copy">
          <span class="fui-playlist-title">{{ track.title }}</span>
          <span class="fui-playlist-artist">{{ track.artist }}</span>
        </span>
        <span class="fui-playlist-state">{{ currentTrack.id === track.id ? currentTrackStateLabel : 'QUEUE' }}</span>
      </button>
    </div>

    <div class="fui-progress">
      <span class="fui-time">{{ formatTime(currentTime) }}</span>
      <button class="fui-progress-bar" type="button" @click="seekTrack">
        <div class="fui-progress-fill" :style="{ width: `${progressPercent}%` }"></div>
      </button>
      <span class="fui-time">{{ formatTime(duration) }}</span>
    </div>
  </div>
</template>

<style scoped>
.fui-music-widget {
  border: 1px solid var(--fui-border-color);
  border-radius: 24px;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.05), transparent 40%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.14), transparent 20%),
    var(--fui-widget-bg);
  padding: 18px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  color: var(--fui-cyan);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 18px 40px rgba(0, 0, 0, 0.18);
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fui-widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--fui-border-color);
}

.fui-label {
  opacity: 0.7;
  text-transform: uppercase;
}

.fui-status {
  opacity: 0.4;
  font-size: 0.68rem;
}

.vinyl-stage {
  position: relative;
  width: 280px;
  height: 280px;
  margin: 12px 0 18px;
  padding: 0;
  margin-inline: auto;
}

.vinyl-record {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background:
    radial-gradient(circle at center, #191919 0 14%, #060606 15% 29%, #101010 30% 46%, #050505 47% 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow:
    inset 0 0 0 2px rgba(255, 255, 255, 0.03),
    inset 0 0 36px rgba(255, 255, 255, 0.04),
    0 20px 40px rgba(0, 0, 0, 0.25);
  transform-origin: 50% 50%;
  will-change: transform;
}

.vinyl-ring {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
}

.ring-1 {
  inset: 18px;
}

.ring-2 {
  inset: 42px;
}

.ring-3 {
  inset: 66px;
}

.vinyl-label {
  position: absolute;
  inset: 50%;
  width: 88px;
  height: 88px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: linear-gradient(135deg, color-mix(in srgb, var(--fui-cyan) 30%, #1a1a1a), #121212 70%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
  padding: 10px;
  box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.08);
}

.vinyl-label-title,
.vinyl-label-artist {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vinyl-label-title {
  font-size: 0.54rem;
  opacity: 0.9;
}

.vinyl-label-artist {
  font-size: 0.44rem;
  opacity: 0.58;
}

.vinyl-center {
  position: absolute;
  inset: 50%;
  width: 14px;
  height: 14px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: #d2d2d2;
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.35);
}

.tonearm-button {
  position: absolute;
  top: 6px;
  left: 250px;
  width: 70px;
  height: 228px;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.tonearm-pivot,
.tonearm-base,
.tonearm-arm {
  position: absolute;
  display: block;
}

.tonearm-pivot {
  top: 8px;
  left: 22px;
  width: 72px;
  height: 190px;
  transform-origin: 13px 13px;
  transform: rotate(0deg);
  transition: transform 0.4s ease;
  z-index: 3;
}

.tonearm-base {
  top: 0;
  left: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #969696, #4e4e4e 55%, #222 100%);
  box-shadow:
    inset 0 0 5px rgba(255, 255, 255, 0.18),
    0 4px 10px rgba(0, 0, 0, 0.2);
  z-index: 2;
}

.tonearm-arm {
  top: 16px;
  left: 9px;
  width: 8px;
  height: 156px;
  border-radius: 999px;
  background: linear-gradient(180deg, #b3b3b3 0%, #d9d9d9 28%, #7d7d7d 75%, #5f5f5f 100%);
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.18);
}

.tonearm-arm::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -3px;
  width: 2px;
  height: 18px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: linear-gradient(180deg, #dcdcdc, #4d4d4d);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.16);
}

.tonearm-button.active .tonearm-pivot {
  transform: rotate(23deg);
}

.fui-track-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  margin-bottom: 14px;
  text-align: center;
}

.fui-track-name {
  font-size: 0.78rem;
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fui-track-artist {
  font-size: 0.68rem;
  opacity: 0.4;
}

.fui-playlist {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
}

.fui-playlist::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.fui-playlist-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--fui-border-color) 92%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--fui-widget-bg) 72%, transparent);
  color: inherit;
  text-align: left;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.fui-playlist-item:hover {
  border-color: var(--fui-cyan);
  transform: translateX(3px);
}

.fui-playlist-item.active {
  border-color: var(--fui-cyan);
  background: color-mix(in srgb, var(--fui-cyan) 10%, var(--fui-widget-bg));
}

.fui-playlist-item.ready:not(.active) {
  border-color: color-mix(in srgb, var(--fui-cyan) 35%, var(--fui-border-color));
}

.fui-playlist-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.fui-playlist-title,
.fui-playlist-artist {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fui-playlist-title {
  font-size: 0.72rem;
  opacity: 0.9;
}

.fui-playlist-artist {
  font-size: 0.62rem;
  opacity: 0.45;
}

.fui-playlist-state {
  flex-shrink: 0;
  font-size: 0.58rem;
  opacity: 0.5;
}

.fui-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.fui-time {
  font-size: 0.68rem;
  opacity: 0.5;
  min-width: 4ch;
}

.fui-progress-bar {
  flex: 1;
  height: 8px;
  background: var(--fui-border-color);
  border: 0;
  border-radius: 999px;
  overflow: hidden;
  padding: 0;
  appearance: none;
}

.fui-progress-fill {
  height: 100%;
  width: 0;
  background: var(--fui-cyan);
  border-radius: 999px;
  box-shadow: var(--fui-cyan-glow);
}

.fui-controls {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.fui-btn {
  min-width: 42px;
  height: 34px;
  border: 1px solid var(--fui-border-color);
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: 0.76rem;
  opacity: 0.7;
  letter-spacing: 0.04em;
  transition: opacity 0.2s, border-color 0.2s, transform 0.2s, background 0.2s;
}

.fui-btn:hover {
  opacity: 1;
  border-color: var(--fui-cyan);
  transform: translateY(-1px);
}

.fui-btn-primary {
  min-width: 52px;
  background: color-mix(in srgb, var(--fui-cyan) 12%, transparent);
}
</style>
