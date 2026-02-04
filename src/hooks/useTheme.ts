import { useState, useEffect, useCallback, useRef } from 'react'
import { flushSync } from 'react-dom'
import { STORAGE_KEY_THEME_MODE, THEME_SWITCH_DISABLE_MS } from '../constants'

export type ThemeMode = 'system' | 'light' | 'dark'

export function useTheme(options?: { disableAnimation?: boolean; isHeavy?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME_MODE)
    return (saved as ThemeMode) || 'system'
  })
  
  const skipNextTransitionRef = useRef(false)

  // 获取系统偏好
  const getSystemPreference = useCallback(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }, [])

  // 实际应用的主题
  const resolvedTheme = mode === 'system' ? getSystemPreference() : mode

  // 应用主题到 DOM
  useEffect(() => {
    const root = document.documentElement
    const shouldSkip = skipNextTransitionRef.current || options?.disableAnimation || options?.isHeavy

    if (shouldSkip) {
      root.setAttribute('data-theme-transition', 'off')
      skipNextTransitionRef.current = false
    }
    
    if (mode === 'system') {
      root.removeAttribute('data-mode')
    } else {
      root.setAttribute('data-mode', mode)
    }

    if (shouldSkip) {
      setTimeout(() => {
        root.removeAttribute('data-theme-transition')
      }, THEME_SWITCH_DISABLE_MS)
    }

    localStorage.setItem(STORAGE_KEY_THEME_MODE, mode)
  }, [mode, options?.disableAnimation, options?.isHeavy])

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      // 仅在 system 模式下需要触发重渲染
      if (mode === 'system') {
        // 强制重渲染
        skipNextTransitionRef.current = true
        setMode('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [mode])

  const setTheme = useCallback((newMode: ThemeMode) => {
    skipNextTransitionRef.current = true
    setMode(newMode)
  }, [])

  const toggleTheme = useCallback(() => {
    skipNextTransitionRef.current = true
    setMode(prev => {
      if (prev === 'system') return 'dark'
      if (prev === 'dark') return 'light'
      return 'system'
    })
  }, [])

  const setThemeWithAnimation = useCallback((newMode: ThemeMode, event?: React.MouseEvent, meta?: { isHeavy?: boolean }) => {
    const prefersReducedMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const shouldDisableAnimation = prefersReducedMotion || options?.disableAnimation || options?.isHeavy || meta?.isHeavy

    // @ts-ignore - View Transitions API types might not be available
    if (shouldDisableAnimation || !document.startViewTransition || !event) {
      skipNextTransitionRef.current = true
      const root = document.documentElement
      root.setAttribute('data-theme-transition', 'off')
      setMode(newMode)
      setTimeout(() => {
        root.removeAttribute('data-theme-transition')
      }, THEME_SWITCH_DISABLE_MS)
      return
    }

    const x = event.clientX
    const y = event.clientY
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const root = document.documentElement
    root.setAttribute('data-theme-transition', 'off')

    // @ts-ignore
    const transition = document.startViewTransition(() => {
      skipNextTransitionRef.current = true
      flushSync(() => {
        setMode(newMode)
      })
    })

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 350,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        }
      )
    }).finally(() => {
      setTimeout(() => {
        root.removeAttribute('data-theme-transition')
      }, THEME_SWITCH_DISABLE_MS)
    })
  }, [options?.disableAnimation, options?.isHeavy])

  return {
    mode,
    resolvedTheme,
    setTheme,
    toggleTheme,
    setThemeWithAnimation,
    setThemeImmediate: setTheme,
    isDark: resolvedTheme === 'dark',
  }
}
