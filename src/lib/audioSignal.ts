import { computed, reactive } from 'vue'

export type AudioSignalMode = 'IDLE' | 'LOAD' | 'PLAY' | 'PAUSE' | 'ERROR'

const BAR_COUNT = 14
const idleBars = [34, 58, 42, 76, 48, 64, 36, 82, 54, 68, 40, 72, 46, 60]

const signalState = reactive({
  bars: [...idleBars],
  mode: 'IDLE' as AudioSignalMode,
  node: '00',
  ping: '--MS',
  level: 0,
})

function normalizeLevel(value: number) {
  return Math.max(0, Math.min(1, value))
}

export function setAudioSignalMode(mode: AudioSignalMode) {
  signalState.mode = mode
}

export function updateAudioSignalBars(values: number[], level: number) {
  const normalizedLevel = normalizeLevel(level)
  signalState.level = normalizedLevel
  signalState.node = String(Math.max(1, Math.round(normalizedLevel * 99))).padStart(2, '0')
  signalState.ping = `${Math.round(12 + normalizedLevel * 36)}MS`

  for (let index = 0; index < BAR_COUNT; index += 1) {
    const value = values[index] ?? 0
    signalState.bars[index] = Math.round(12 + normalizeLevel(value) * 88)
  }
}

export function resetAudioSignalBars() {
  signalState.level = 0
  signalState.node = '00'
  signalState.ping = '--MS'
  signalState.bars.splice(0, BAR_COUNT, ...idleBars)
}

export function useAudioSignal() {
  const stats = computed(() => [
    { label: 'NODE', value: signalState.node },
    { label: 'PING', value: signalState.ping },
    { label: 'MODE', value: signalState.mode },
  ])

  return {
    bars: signalState.bars,
    stats,
    mode: computed(() => signalState.mode),
  }
}