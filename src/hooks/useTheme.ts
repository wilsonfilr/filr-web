import { useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'filr-web:theme'

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark'
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme)

  // The theme is applied on the workspace wrapper (data-theme), so the
  // logged-out auth screen always stays on the brand's dark gradient.

  function setTheme(next: Theme) {
    setThemeState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore storage errors (private mode)
    }
  }

  return [theme, setTheme]
}
