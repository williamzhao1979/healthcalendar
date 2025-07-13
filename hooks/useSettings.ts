"use client"

import { useState } from "react"
import dbService from "../services/db"

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)

  const loadSettings = async (userId: string) => {
    try {
      setIsLoading(true)
      const userSettings = await dbService.getUserSettings(userId)
      setSettings(userSettings)
    } catch (error) {
      console.error("Failed to load settings:", error)
      setSettings({})
    } finally {
      setIsLoading(false)
    }
  }

  const setSetting = async (userId: string, key: string, value: any) => {
    try {
      await dbService.setSetting(userId, key, value)
      setSettings((prev) => ({ ...prev, [key]: value }))
    } catch (error) {
      console.error("Failed to set setting:", error)
      throw error
    }
  }

  const getSetting = async (userId: string, key: string) => {
    try {
      const value = await dbService.getSetting(userId, key)
      return value
    } catch (error) {
      console.error("Failed to get setting:", error)
      return null
    }
  }

  return {
    settings,
    isLoading,
    loadSettings,
    setSetting,
    getSetting,
  }
}
