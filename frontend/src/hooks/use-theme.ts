import { useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'feedloop-theme'

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme): void {
  const resolved = theme === 'system' ? getSystemTheme() : theme
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'system'
  })

  // Apply theme whenever it changes
  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  // Sync with system preference when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((t: Theme) => setThemeState(t), [])

  // Simple toggle: light ↔ dark (ignores system after first toggle)
  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const resolved = prev === 'system' ? getSystemTheme() : prev
      return resolved === 'dark' ? 'light' : 'dark'
    })
  }, [])

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && getSystemTheme() === 'dark')

  return { theme, setTheme, toggleTheme, isDark }
}
