import { ref, watchEffect } from 'vue'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'paper-scape-theme'
const theme = ref<ThemeMode>('light')

function applyTheme(mode: ThemeMode) {
  theme.value = mode
  document.documentElement.dataset.theme = mode
  localStorage.setItem(STORAGE_KEY, mode)
}

export function initializeTheme() {
  const stored = localStorage.getItem(STORAGE_KEY)
  const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  applyTheme(stored === 'dark' || stored === 'light' ? stored : preferredDark ? 'dark' : 'light')
}

export function useTheme() {
  watchEffect(() => {
    document.documentElement.dataset.theme = theme.value
  })

  function toggleTheme() {
    applyTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  return {
    theme,
    toggleTheme,
  }
}
