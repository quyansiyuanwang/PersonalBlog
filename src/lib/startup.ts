import { prefetchRouteComponents } from '../router'
import { musicTracks } from './music'

const DEFAULT_MIN_SPLASH_MS = 2600
const MUSIC_PRELOAD_COUNT = 2

let warmupPromise: Promise<void> | null = null
const audioWarmers: HTMLAudioElement[] = []

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function warmAudioTrack(url: string) {
  return new Promise<void>((resolve) => {
    const audio = new Audio()
    let settled = false

    const finish = () => {
      if (settled) {
        return
      }

      settled = true
      audio.removeEventListener('loadeddata', finish)
      audio.removeEventListener('canplay', finish)
      audio.removeEventListener('error', finish)
      resolve()
    }

    audio.preload = 'auto'
    audio.src = url
    audioWarmers.push(audio)
    audio.addEventListener('loadeddata', finish, { once: true })
    audio.addEventListener('canplay', finish, { once: true })
    audio.addEventListener('error', finish, { once: true })
    audio.load()

    window.setTimeout(finish, 3500)
  })
}

async function runStartupTasks() {
  const musicTasks = musicTracks.slice(0, MUSIC_PRELOAD_COUNT).map((track) => warmAudioTrack(track.url))

  await Promise.allSettled([
    prefetchRouteComponents(),
    ...musicTasks,
  ])
}

export function initializeStartupPreload(minSplashMs = DEFAULT_MIN_SPLASH_MS) {
  if (!warmupPromise) {
    warmupPromise = runStartupTasks().then(() => undefined)
  }

  return Promise.all([
    sleep(minSplashMs),
    warmupPromise,
  ]).then(() => undefined)
}