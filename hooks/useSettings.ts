"use client"

import { useState, useEffect } from "react"
import dbService, { type Settings } from "@/services/db"

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 加载设置
  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const loadedSettings = await dbService.getSettings()
      setSettings(loadedSettings)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }

  // 设置当前用户
  const setCurrentUser = async (userId: string) => {
    try {
      const updatedSettings = await dbService.updateSettings({ lastUserId: userId })
      setSettings(updatedSettings)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }

  // 更新设置
  const updateSettings = async (settingsData: Partial<Omit<Settings, "id" | "updatedAt">>) => {
    try {
      const updatedSettings = await dbService.updateSettings(settingsData)
      setSettings(updatedSettings)
      return updatedSettings
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }

  // 初始加载
  useEffect(() => {
    loadSettings()
  }, [])

  return {
    settings,
    isLoading,
    error,
    loadSettings,
    setCurrentUser,
    updateSettings,
  }
}
