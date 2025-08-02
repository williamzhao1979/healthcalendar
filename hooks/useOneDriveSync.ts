"use client"

import { useState, useEffect, useCallback } from "react"
import { adminService } from "@/lib/adminService"

interface SyncStatus {
  isConnected: boolean
  isSyncing: boolean
  lastSyncTime: string | null
  error: string | null
}

export const useOneDriveSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    isSyncing: false,
    lastSyncTime: null,
    error: null,
  })

  // 检查连接状态
  const checkConnection = useCallback(async () => {
    try {
      const isConnected = await adminService.getSetting("oneDriveConnected")
      const lastSyncTime = await adminService.getSetting("lastSyncTime")

      setSyncStatus((prev) => ({
        ...prev,
        isConnected: !!isConnected,
        lastSyncTime: lastSyncTime || null,
        error: null,
      }))
    } catch (error) {
      setSyncStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error",
      }))
    }
  }, [])

  // 连接到 OneDrive
  const connectToOneDrive = useCallback(async () => {
    try {
      setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }))

      // 这里应该实现实际的 OneDrive 连接逻辑
      // 目前只是模拟
      await new Promise((resolve) => setTimeout(resolve, 2000))

      await adminService.setSetting("oneDriveConnected", true)
      await adminService.setSetting("lastSyncTime", new Date().toISOString())

      setSyncStatus((prev) => ({
        ...prev,
        isConnected: true,
        isSyncing: false,
        lastSyncTime: new Date().toISOString(),
      }))
    } catch (error) {
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : "Connection failed",
      }))
    }
  }, [])

  // 断开连接
  const disconnectFromOneDrive = useCallback(async () => {
    try {
      await adminService.setSetting("oneDriveConnected", false)
      setSyncStatus((prev) => ({
        ...prev,
        isConnected: false,
        error: null,
      }))
    } catch (error) {
      setSyncStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Disconnect failed",
      }))
    }
  }, [])

  // 同步数据
  const syncData = useCallback(async () => {
    if (!syncStatus.isConnected) {
      setSyncStatus((prev) => ({
        ...prev,
        error: "Not connected to OneDrive",
      }))
      return
    }

    try {
      setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }))

      // 获取所有数据
      const users = await adminService.getAllUsers()
      const stats = await adminService.getStats()

      // 这里应该实现实际的同步逻辑
      // 目前只是模拟
      await new Promise((resolve) => setTimeout(resolve, 3000))

      await adminService.setSetting("lastSyncTime", new Date().toISOString())

      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date().toISOString(),
      }))
    } catch (error) {
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : "Sync failed",
      }))
    }
  }, [syncStatus.isConnected])

  // 自动同步
  const enableAutoSync = useCallback(async (enabled: boolean) => {
    try {
      await adminService.setSetting("autoSyncEnabled", enabled)
    } catch (error) {
      setSyncStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to update auto sync setting",
      }))
    }
  }, [])

  // 初始化
  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  return {
    syncStatus,
    connectToOneDrive,
    disconnectFromOneDrive,
    syncData,
    enableAutoSync,
    checkConnection,
  }
}
