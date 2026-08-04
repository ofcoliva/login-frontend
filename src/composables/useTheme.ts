import { readonly, ref } from 'vue'

const THEME_STORAGE_KEY = 'theme'

const isDark = ref(false)

export function initTheme(): void {
  const stored = readStoredTheme()
  if (stored) {
    applyTheme(stored)
    return
  }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  isDark.value = prefersDark
}

export function toggleTheme(): void {
  const next = isDark.value ? 'light' : 'dark'
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // storage indisponível (ex.: modo privado) — segue apenas em memória
  }
  applyTheme(next)
}

function readStoredTheme(): 'light' | 'dark' | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function applyTheme(theme: 'light' | 'dark'): void {
  isDark.value = theme === 'dark'
  document.documentElement.dataset.theme = theme
}

export function useTheme() {
  return {
    isDark: readonly(isDark),
    toggleTheme,
    initTheme,
  }
}
