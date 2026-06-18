import { useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'filr-web:theme'

const THEME_COLORS: Record<Theme, string> = {
  dark: '#101922',
  light: '#f1f5fa',
}

function applyThemeColor(theme: Theme) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = THEME_COLORS[theme]
}

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark'
}

export function useTheme(): [Theme, (t: Theme) => void] {
  // The theme is applied on the workspace wrapper (data-theme), so the
  // logged-out auth screen always stays on the brand's dark gradient.
  const [theme, setThemeState] = useState<Theme>(() => {
    const initial = readInitialTheme()
    applyThemeColor(initial)
    return initial
  })

  function setTheme(next: Theme) {
    setThemeState(next)
    applyThemeColor(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore storage errors (private mode)
    }
  }

  return [theme, setTheme]
}
