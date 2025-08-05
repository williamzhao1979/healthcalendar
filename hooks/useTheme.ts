'use client'

import { useState, useEffect, useCallback } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // Get system preference
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }, [])

  // Resolve actual theme based on setting
  const resolveTheme = useCallback((themeValue: Theme): 'light' | 'dark' => {
    if (themeValue === 'system') {
      return getSystemTheme()
    }
    return themeValue
  }, [getSystemTheme])

  // Apply theme to document
  const applyTheme = useCallback((resolvedTheme: 'light' | 'dark') => {
    if (typeof window === 'undefined') return
    
    const root = document.documentElement
    
    if (resolvedTheme === 'dark') {
      root.setAttribute('data-theme', 'dark')
      root.classList.add('dark')
    } else {
      root.setAttribute('data-theme', 'light')
      root.classList.remove('dark')
    }
  }, [])

  // Change theme
  const changeTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme)
    
    // Save to localStorage
    try {
      localStorage.setItem('healthcalendar_theme', newTheme)
    } catch (error) {
      console.warn('Failed to save theme preference:', error)
    }

    // Apply immediately
    const resolved = resolveTheme(newTheme)
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [resolveTheme, applyTheme])

  // Toggle between light and dark (skip system)
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    changeTheme(newTheme)
  }, [resolvedTheme, changeTheme])

  // Initialize theme on mount
  useEffect(() => {
    let savedTheme: Theme = 'system'
    
    // Load saved theme
    try {
      const saved = localStorage.getItem('healthcalendar_theme') as Theme
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        savedTheme = saved
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error)
    }

    setTheme(savedTheme)
    const resolved = resolveTheme(savedTheme)
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [resolveTheme, applyTheme])

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const resolved = e.matches ? 'dark' : 'light'
        setResolvedTheme(resolved)
        applyTheme(resolved)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme, applyTheme])

  return {
    theme,
    resolvedTheme,
    changeTheme,
    toggleTheme,
    getSystemTheme
  }
}