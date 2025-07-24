import { useState, useEffect, useCallback } from 'react'
import { microsoftAuth } from '../lib/microsoftAuth'
import { dataExportService, ExportResult } from '../lib/dataExportService'
import MobileCompatibilityUtils from '../lib/mobileCompatibility'

export interface OneDriveSyncState {
  isAuthenticated: boolean
  isConnecting: boolean
  lastSyncTime: Date | null
  syncStatus: 'idle' | 'syncing' | 'success' | 'error'
  error: string | null
  userInfo: any | null
  exportResult: ExportResult | null
  isExporting: boolean
}

export interface OneDriveSyncActions {
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  checkConnection: () => Promise<void>
  startSync: () => Promise<void>
  exportData: (userId: string) => Promise<void>
  exportTable: (tableName: string, userId: string) => Promise<void>
  clearError: () => void
}

export const useOneDriveSync = (): [OneDriveSyncState, OneDriveSyncActions] => {
  const [state, setState] = useState<OneDriveSyncState>({
    isAuthenticated: false,
    isConnecting: false,
    lastSyncTime: null,
    syncStatus: 'idle',
    error: null,
    userInfo: null,
    exportResult: null,
    isExporting: false,
  })

  // 检查连接状态 - 增强错误容忍度
  const checkConnection = useCallback(async () => {
    try {
      await microsoftAuth.initialize()
      
      const isLoggedIn = microsoftAuth.isLoggedIn()
      const userInfo = microsoftAuth.getCurrentUser()
      
      if (isLoggedIn) {
        // 尝试静默获取令牌
        const token = await microsoftAuth.getTokenSilently()
        
        setState(prev => ({
          ...prev,
          isAuthenticated: !!token,
          userInfo: token ? userInfo : null,
          error: null,
        }))
      } else {
        setState(prev => ({
          ...prev,
          isAuthenticated: false,
          userInfo: null,
        }))
      }
    } catch (error) {
      console.error('Check connection failed:', error)
      
      // 对于初始化错误，不设置error状态，仅记录日志
      // 这样不会影响主应用的正常显示
      const errorMessage = error instanceof Error ? error.message : '连接检查失败'
      console.warn('OneDrive初始化失败，但不影响主应用功能:', errorMessage)
      
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        userInfo: null,
        // 不设置error，让主应用正常显示
        error: null,
      }))
    }
  }, [])

  // 连接OneDrive
  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }))
    
    try {
      // 先检查浏览器兼容性
      const compatibilityReport = MobileCompatibilityUtils.generateCompatibilityReport()
      if (compatibilityReport !== '浏览器兼容性良好') {
        console.warn('Browser compatibility issues:', compatibilityReport)
      }

      await microsoftAuth.initialize()
      const result = await microsoftAuth.login()
      
      // 确保应用文件夹存在
      await microsoftAuth.ensureAppFolder()
      
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        isConnecting: false,
        userInfo: result.account,
        error: null,
      }))
      
      console.log('OneDrive connection successful')
    } catch (error) {
      console.error('OneDrive connection failed:', error)
      
      // 使用移动端友好的错误信息
      const friendlyError = error instanceof Error 
        ? MobileCompatibilityUtils.getUserFriendlyErrorMessage(error)
        : '连接失败'
      
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        isConnecting: false,
        error: friendlyError,
      }))
    }
  }, [])

  // 断开连接
  const disconnect = useCallback(async () => {
    try {
      await microsoftAuth.logout()
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        userInfo: null,
        error: null,
      }))
      console.log('OneDrive disconnected')
    } catch (error) {
      console.error('OneDrive disconnect failed:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '断开连接失败',
      }))
    }
  }, [])

  // 开始同步
  const startSync = useCallback(async () => {
    if (!state.isAuthenticated) {
      setState(prev => ({ ...prev, error: '未连接到OneDrive' }))
      return
    }

    setState(prev => ({ ...prev, syncStatus: 'syncing', error: null }))
    
    try {
      // TODO: 实现实际的同步逻辑
      // 这里先模拟同步过程
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setState(prev => ({
        ...prev,
        syncStatus: 'success',
        lastSyncTime: new Date(),
      }))
      
      console.log('Sync completed successfully')
    } catch (error) {
      console.error('Sync failed:', error)
      setState(prev => ({
        ...prev,
        syncStatus: 'error',
        error: error instanceof Error ? error.message : '同步失败',
      }))
    }
  }, [state.isAuthenticated])

  // 导出所有数据
  const exportData = useCallback(async (userId: string) => {
    if (!state.isAuthenticated) {
      setState(prev => ({ ...prev, error: '未连接到OneDrive' }))
      return
    }

    setState(prev => ({ 
      ...prev, 
      isExporting: true, 
      error: null,
      exportResult: null 
    }))
    
    try {
      console.log(`Starting data export for user: ${userId}`)
      const result = await dataExportService.exportAllTables(userId)
      
      setState(prev => ({
        ...prev,
        isExporting: false,
        exportResult: result,
        lastSyncTime: new Date(),
        syncStatus: result.success ? 'success' : 'error',
        error: result.success ? null : result.errors.join(', ')
      }))
      
      console.log('Data export completed:', result)
    } catch (error) {
      console.error('Data export failed:', error)
      setState(prev => ({
        ...prev,
        isExporting: false,
        syncStatus: 'error',
        error: error instanceof Error ? error.message : '数据导出失败',
      }))
    }
  }, [state.isAuthenticated])

  // 导出单个表
  const exportTable = useCallback(async (tableName: string, userId: string) => {
    if (!state.isAuthenticated) {
      setState(prev => ({ ...prev, error: '未连接到OneDrive' }))
      return
    }

    setState(prev => ({ 
      ...prev, 
      isExporting: true, 
      error: null,
      exportResult: null 
    }))
    
    try {
      console.log(`Exporting table: ${tableName} for user: ${userId}`)
      const result = await dataExportService.exportTable(tableName, userId)
      
      setState(prev => ({
        ...prev,
        isExporting: false,
        exportResult: result,
        lastSyncTime: new Date(),
        syncStatus: result.success ? 'success' : 'error',
        error: result.success ? null : result.errors.join(', ')
      }))
      
      console.log('Table export completed:', result)
    } catch (error) {
      console.error('Table export failed:', error)
      setState(prev => ({
        ...prev,
        isExporting: false,
        syncStatus: 'error',
        error: error instanceof Error ? error.message : '表导出失败',
      }))
    }
  }, [state.isAuthenticated])

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // 组件挂载时进行轻量级检查，不调用可能有问题的初始化
  useEffect(() => {
    // 只在浏览器环境中进行基本检查
    if (typeof window !== 'undefined') {
      // 检查基本环境，但不强制初始化MSAL
      const hasBasicSupport = !!(window.localStorage && window.indexedDB)
      if (!hasBasicSupport) {
        console.warn('浏览器缺少基本功能支持，OneDrive同步可能不可用')
      }
    }
  }, [])

  const actions: OneDriveSyncActions = {
    connect,
    disconnect,
    checkConnection,
    startSync,
    exportData,
    exportTable,
    clearError,
  }

  return [state, actions]
}

// 辅助函数：格式化同步时间
export const formatSyncTime = (date: Date | null): string => {
  if (!date) return '从未同步'
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}小时前`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}天前`
}
