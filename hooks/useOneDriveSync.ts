import { useState, useEffect, useCallback } from 'react'
import { microsoftAuth } from '../lib/microsoftAuth'
import { dataExportService, ExportResult } from '../lib/dataExportService'
import MobileCompatibilityUtils from '../lib/mobileCompatibility'

export interface OneDriveSyncState {
  isAuthenticated: boolean
  isConnecting: boolean
  lastSyncTime: Date | null | undefined
  syncStatus: 'idle' | 'syncing' | 'success' | 'error'
  error: string | null
  userInfo: any | null
  exportResult: ExportResult | null
  isExporting: boolean
  isOneDriveAvailable: boolean
  unavailabilityReason: string | null
  isLoadingFiles?: boolean
  files?: any[]
  selectedFileContent?: string
  isLoadingFileContent?: boolean
}

export interface OneDriveSyncActions {
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  checkConnection: () => Promise<void>
  startSync: (userId: string) => Promise<void>
  exportData: (userId: string) => Promise<void>
  exportTable: (tableName: string, userId: string) => Promise<void>
  importUsers: () => Promise<void>
  clearError: () => void
  loadFiles: () => Promise<void>
  loadFileContent: (fileId: string, fileName: string, isFolder?: boolean) => Promise<void>
  syncIDBOneDriveUsers: () => Promise<void>
  syncIDBOneDriveMyRecords: () => Promise<void>
  syncIDBOneDriveStoolRecords: () => Promise<void>
  syncIDBOneDrivePeriodRecords: () => Promise<void>
  syncIDBOneDriveMealRecords: () => Promise<void>
  // 附件相关方法
  uploadAttachment: (file: File, recordType: string, recordId: string) => Promise<string>
  deleteAttachment: (fileName: string) => Promise<void>
  getAttachmentUrl: (fileName: string) => Promise<string>
  listAttachments: (recordId?: string) => Promise<string[]>
}

// 全局状态存储
let globalState: OneDriveSyncState = {
  isAuthenticated: false,
  isConnecting: false,
  lastSyncTime: null, // 明确设置为null而不是undefined
  syncStatus: 'idle',
  error: null,
  userInfo: null,
  exportResult: null,
  isExporting: false,
  isOneDriveAvailable: true,
  unavailabilityReason: null,
}

// 状态监听器
const stateListeners = new Set<(state: OneDriveSyncState) => void>()

// 更新全局状态的函数
const updateGlobalState = (newState: Partial<OneDriveSyncState>) => {
  // 调试日志
  if ('lastSyncTime' in newState) {
    console.log('🔄 Updating global state lastSyncTime:', newState.lastSyncTime ? newState.lastSyncTime.toISOString() : newState.lastSyncTime)
  }
  
  globalState = { ...globalState, ...newState }
  
  // 确保lastSyncTime始终是有效值
  if (globalState.lastSyncTime === undefined) {
    console.warn('⚠️ lastSyncTime is undefined, setting to null')
    globalState.lastSyncTime = null
  }
  
  stateListeners.forEach(listener => listener(globalState))
}

// 从 localStorage 恢复状态
const restoreStateFromStorage = () => {
  try {
    console.log('🔄 Attempting to restore state from localStorage...')
    const savedAuthState = localStorage.getItem('healthcalendar_auth_state')
    console.log('📋 Saved auth state exists:', !!savedAuthState)
    
    if (savedAuthState) {
      const authData = JSON.parse(savedAuthState)
      console.log('📊 Auth data parsed:', {
        isAuthenticated: authData.isAuthenticated,
        timestamp: authData.timestamp ? new Date(authData.timestamp).toISOString() : 'no timestamp',
        lastSyncTime: authData.lastSyncTime || 'no lastSyncTime',
        userInfo: authData.userInfo?.username || authData.userInfo?.displayName || 'no userInfo'
      })
      
      // 检查状态是否过期（24小时）
      const isExpired = Date.now() - authData.timestamp > 24 * 60 * 60 * 1000
      console.log('⏰ Auth state expired?', isExpired)
      
      if (!isExpired && authData.isAuthenticated) {
        let lastSyncTime = null
        
        // 优先使用保存的lastSyncTime
        if (authData.lastSyncTime) {
          try {
            lastSyncTime = new Date(authData.lastSyncTime)
            // 验证日期是否有效
            if (isNaN(lastSyncTime.getTime())) {
              console.warn('⚠️ Invalid lastSyncTime in auth state, using null')
              lastSyncTime = null
            } else {
              console.log('✅ Restored lastSyncTime from auth state:', lastSyncTime.toISOString())
            }
          } catch (e) {
            console.warn('❌ Failed to parse lastSyncTime from auth state:', e)
            lastSyncTime = null
          }
        }
        
        // 如果主auth state中没有lastSyncTime或为null，尝试从备份获取
        if (!lastSyncTime || authData.lastSyncTime === null) {
          const backupSyncTime = localStorage.getItem('healthcalendar_last_sync_backup')
          console.log('🔍 lastSyncTime is null in auth state, looking for backup sync time:', !!backupSyncTime)
          
          if (backupSyncTime) {
            try {
              lastSyncTime = new Date(backupSyncTime)
              // 验证日期是否有效
              if (isNaN(lastSyncTime.getTime())) {
                console.warn('⚠️ Invalid backup sync time, using null')
                lastSyncTime = null
              } else {
                console.log('✅ Restored lastSyncTime from backup:', lastSyncTime.toISOString())
                
                // 同时更新auth state中的lastSyncTime以保持一致性
                authData.lastSyncTime = lastSyncTime.toISOString()
                localStorage.setItem('healthcalendar_auth_state', JSON.stringify(authData))
                console.log('🔄 Updated auth state with backup sync time')
              }
            } catch (e) {
              console.warn('❌ Failed to parse backup sync time:', e)
              lastSyncTime = null
            }
          }
        }
        
        console.log('🎯 Updating global state with restored data:', {
          isAuthenticated: authData.isAuthenticated,
          userInfo: authData.userInfo,
          lastSyncTime: lastSyncTime ? lastSyncTime.toISOString() : null
        })
        
        updateGlobalState({
          isAuthenticated: authData.isAuthenticated,
          userInfo: authData.userInfo,
          lastSyncTime: lastSyncTime,
        })
      } else {
        console.log('❌ Auth state expired or not authenticated, skipping restore')
      }
    } else {
      console.log('💭 No saved auth state found in localStorage')
    }
  } catch (error) {
    console.warn('❌ Failed to restore state from localStorage:', error)
  }
}

// URL缓存和请求队列管理
const urlCache = new Map<string, { url: string; timestamp: number }>()
const pendingRequests = new Map<string, Promise<string>>()
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存
const MAX_CONCURRENT_REQUESTS = 3 // 最大并发请求数
let activeRequests = 0

// 定期清理过期缓存
const cleanupCache = () => {
  const now = Date.now()
  const keysToDelete: string[] = []
  
  urlCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_DURATION) {
      keysToDelete.push(key)
    }
  })
  
  keysToDelete.forEach(key => urlCache.delete(key))
}

// 每2分钟清理一次缓存
if (typeof window !== 'undefined') {
  setInterval(cleanupCache, 2 * 60 * 1000)
}

// 初始化时恢复状态
if (typeof window !== 'undefined') {
  restoreStateFromStorage()
}

export const useOneDriveSync = (): [OneDriveSyncState, OneDriveSyncActions] => {
  const [state, setState] = useState<OneDriveSyncState>(globalState)

  // 监听全局状态变化
  useEffect(() => {
    const listener = (newState: OneDriveSyncState) => {
      setState(newState)
    }
    stateListeners.add(listener)
    
    return () => {
      stateListeners.delete(listener)
    }
  }, [])

  // 本地状态更新函数 - 同时更新全局状态和本地状态
  const updateState = useCallback((newState: Partial<OneDriveSyncState>) => {
    updateGlobalState(newState)
  }, [])

  // 辅助函数：更新localStorage中的同步时间
  const updateSyncTimeInStorage = useCallback((syncTime: Date) => {
    try {
      console.log('💾 Updating sync time in localStorage:', syncTime.toISOString())
      
      const savedAuthState = localStorage.getItem('healthcalendar_auth_state')
      if (savedAuthState) {
        const authData = JSON.parse(savedAuthState)
        authData.lastSyncTime = syncTime.toISOString()
        localStorage.setItem('healthcalendar_auth_state', JSON.stringify(authData))
        console.log('✅ Updated lastSyncTime in auth state')
      } else {
        console.log('⚠️ No auth state found, creating new one with sync time')
        const newAuthData = {
          isAuthenticated: globalState.isAuthenticated,
          userInfo: globalState.userInfo,
          lastSyncTime: syncTime.toISOString(),
          timestamp: Date.now()
        }
        localStorage.setItem('healthcalendar_auth_state', JSON.stringify(newAuthData))
      }
      
      // 同时保存一个备份时间戳
      localStorage.setItem('healthcalendar_last_sync_backup', syncTime.toISOString())
      console.log('✅ Updated backup sync time')
    } catch (error) {
      console.warn('❌ Failed to update sync time in localStorage:', error)
    }
  }, [])

  // 检查连接状态 - 增强持久化认证支持
  const checkConnection = useCallback(async () => {
    try {
      console.log('🔄 checkConnection...')
      // First check if OneDrive is available at all
      const isOneDriveAvailable = microsoftAuth.isOneDriveAvailable()
      const unavailabilityReason = microsoftAuth.getUnavailabilityReason()
      
      updateState({
        isOneDriveAvailable,
        unavailabilityReason,
      })
  
      if (!isOneDriveAvailable) {
        console.warn('OneDrive not available:', unavailabilityReason)
        return
      }

      await microsoftAuth.initialize()
      
      // 首先检查重定向返回（Mobile关键）
      const redirectResult = await microsoftAuth.handleRedirectPromise()
      if (redirectResult) {
        console.log('Redirect authentication successful in checkConnection')
        updateState({
          isAuthenticated: true,
          userInfo: redirectResult.account,
          error: null,
        })
        
        // 保存认证状态到localStorage
        try {
          const currentSyncTime = globalState.lastSyncTime ? globalState.lastSyncTime.toISOString() : 
                                localStorage.getItem('healthcalendar_last_sync_backup')
          
          localStorage.setItem('healthcalendar_auth_state', JSON.stringify({
            isAuthenticated: true,
            userInfo: redirectResult.account,
            lastSyncTime: currentSyncTime,
            timestamp: Date.now()
          }))
          
          console.log('💾 Saved auth state after redirect with syncTime:', currentSyncTime)
        } catch (error) {
          console.warn('Failed to save auth state to localStorage after redirect:', error)
        }
        
        return
      }
      
      const isLoggedIn = microsoftAuth.isLoggedIn()
      const userInfo = microsoftAuth.getCurrentUser()
      
      if (isLoggedIn) {
          
        // 尝试静默获取令牌以验证会话有效性
        const token = await microsoftAuth.getTokenSilently()
        
        if (token) {
          updateState({
            isAuthenticated: true,
            userInfo: userInfo,
            error: null,
          })
          
          // 保存认证状态到localStorage
          try {
            const currentSyncTime = globalState.lastSyncTime ? globalState.lastSyncTime.toISOString() : 
                                  localStorage.getItem('healthcalendar_last_sync_backup')
            
            localStorage.setItem('healthcalendar_auth_state', JSON.stringify({
              isAuthenticated: true,
              userInfo: userInfo,
              lastSyncTime: currentSyncTime,
              timestamp: Date.now()
            }))
            
            console.log('💾 Saved auth state after silent login with syncTime:', currentSyncTime)
          } catch (error) {
            console.warn('Failed to save auth state to localStorage after silent login:', error)
          }
        } else {
          updateState({
            isAuthenticated: false,
            userInfo: null,
            error: null,
          })
        }
      } else {
        updateState({
          isAuthenticated: false,
          userInfo: null,
        })
      }

  
    } catch (error) {
      console.error('Check connection failed:', error)
      
      // 对于初始化错误，不设置error状态，仅记录日志
      // 这样不会影响主应用的正常显示
      const errorMessage = error instanceof Error ? error.message : '连接检查失败'
      console.warn('OneDrive初始化失败，但不影响主应用功能:', errorMessage)
      
      updateState({
        isAuthenticated: false,
        userInfo: null,
        // 不设置error，让主应用正常显示
        error: null,
      })
    }
  }, [])

  // 连接OneDrive
  const connect = useCallback(async () => {
    // Check if OneDrive is available before attempting connection
    if (!microsoftAuth.isOneDriveAvailable()) {
      const reason = microsoftAuth.getUnavailabilityReason()
      updateState({ 
        isConnecting: false, 
        error: reason || 'OneDrive功能不可用'
      })
      return
    }

    updateState({ isConnecting: true, error: null })
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
      
      updateState({
        isAuthenticated: true,
        isConnecting: false,
        userInfo: result.account,
        error: null,
      })
      
      // 保存认证状态到localStorage
      try {
        const currentSyncTime = globalState.lastSyncTime ? globalState.lastSyncTime.toISOString() : 
                              localStorage.getItem('healthcalendar_last_sync_backup')
        console.log('💾 Saving auth state with syncTime:', currentSyncTime )

        localStorage.setItem('healthcalendar_auth_state', JSON.stringify({
          isAuthenticated: true,
          userInfo: result.account,
          lastSyncTime: currentSyncTime,
          timestamp: Date.now()
        }))
        
        console.log('💾 Saved auth state after connect with syncTime:', currentSyncTime)
      } catch (error) {
        console.warn('Failed to save auth state to localStorage:', error)
      }
      
    } catch (error) {
      console.error('OneDrive connection failed:', error)
      
      // 使用移动端友好的错误信息
      const friendlyError = error instanceof Error 
        ? MobileCompatibilityUtils.getUserFriendlyErrorMessage(error)
        : '连接失败'
      
      updateState({
        isAuthenticated: false,
        isConnecting: false,
        error: friendlyError,
      })
    }
  }, [])

  // 断开连接
  const disconnect = useCallback(async () => {
    try {
      await microsoftAuth.logout()
      updateState({
        isAuthenticated: false,
        userInfo: null,
        error: null,
        lastSyncTime: null,
      })
      
      // 清除保存的认证状态
      try {
        localStorage.removeItem('healthcalendar_auth_state')
        localStorage.removeItem('healthcalendar_last_sync_backup')
      } catch (error) {
        console.warn('Failed to clear auth state from localStorage:', error)
      }
      
    } catch (error) {
      console.error('OneDrive disconnect failed:', error)
      updateState({
        error: error instanceof Error ? error.message : '断开连接失败',
      })
    }
  }, [])

  // 开始同步
  const startSync = useCallback(async (userId: string) => {
    if (!state.isAuthenticated) {
      updateState({error: '未连接到OneDrive' })
      return
    }
      // await dataExportService.syncFromOneDrive()
      // await dataExportService.readusers()
      // // 这里可以添加更多的同步逻辑，例如导入数据等
      // return
    updateState({syncStatus: 'syncing', error: null })
    
    try {
      // 导入所有表数据
      const result = await dataExportService.importAllTables(userId)
      
      if (result.success) {
        const syncTime = new Date()
        updateState({
          syncStatus: 'success',
          lastSyncTime: syncTime,
        })
        
        // 更新localStorage中的同步时间
        updateSyncTimeInStorage(syncTime)
        
        console.log(`✅ Sync completed successfully at ${syncTime.toISOString()}. Imported tables: ${result.importedTables.join(', ')}`)
      } else {
        // 部分成功或完全失败
        const errorMessage = result.errors.length > 0 
          ? result.errors.join('; ') 
          : '同步过程中出现未知错误'
        
        const syncTime = result.importedTables.length > 0 ? new Date() : globalState.lastSyncTime
        updateState({
          syncStatus: result.importedTables.length > 0 ? 'success' : 'error',
          lastSyncTime: syncTime,
          error: result.importedTables.length > 0 ? `部分导入成功，错误: ${errorMessage}` : errorMessage,
        })
        
        // 如果有部分成功，更新同步时间
        if (result.importedTables.length > 0 && syncTime) {
          updateSyncTimeInStorage(syncTime)
        }
        
        console.warn(`Sync completed with errors. Imported: ${result.importedTables.join(', ')}, Errors: ${result.errors.join(', ')}`)
      }
    } catch (error) {
      console.error('Sync failed:', error)
      updateState({
        syncStatus: 'error',
        error: error instanceof Error ? error.message : '同步失败',
      })
    }
  }, [state.isAuthenticated, updateSyncTimeInStorage])

  // 导出所有数据
  const exportData = useCallback(async (userId: string) => {
    if (!state.isAuthenticated) {
      updateState({error: '未连接到OneDrive' })
      return
    }

    updateState({ 
      isExporting: true, 
      error: null,
      exportResult: null 
    })
    
    try {
      console.log(`Starting data export for user: ${userId}`)
      const result = await dataExportService.exportAllTables(userId)
      
      const syncTime = new Date()
      updateState({

        isExporting: false,
        exportResult: result,
        lastSyncTime: syncTime,
        syncStatus: result.success ? 'success' : 'error',
        error: result.success ? null : result.errors.join(', ')
      })
      
      // 更新localStorage中的同步时间
      if (result.success) {
        updateSyncTimeInStorage(syncTime)
      }
      
      console.log('Data export completed:', result)
    } catch (error) {
      console.error('Data export failed:', error)
      updateState({

        isExporting: false,
        syncStatus: 'error',
        error: error instanceof Error ? error.message : '数据导出失败',
      })
    }
  }, [state.isAuthenticated, updateSyncTimeInStorage])

  // 导出单个表
  const exportTable = useCallback(async (tableName: string, userId: string) => {
    if (!state.isAuthenticated) {
      updateState({error: '未连接到OneDrive' })
      return
    }

    updateState({ 
      isExporting: true, 
      error: null,
      exportResult: null 
    })
    
    try {
      console.log(`Exporting table: ${tableName} for user: ${userId}`)
      const result = await dataExportService.exportTable(tableName, userId)
      
      const syncTime = new Date()
      updateState({

        isExporting: false,
        exportResult: result,
        lastSyncTime: syncTime,
        syncStatus: result.success ? 'success' : 'error',
        error: result.success ? null : result.errors.join(', ')
      })
      
      // 更新localStorage中的同步时间
      if (result.success) {
        updateSyncTimeInStorage(syncTime)
      }
      
      console.log('Table export completed:', result)
    } catch (error) {
      console.error('Table export failed:', error)
      updateState({

        isExporting: false,
        syncStatus: 'error',
        error: error instanceof Error ? error.message : '表导出失败',
      })
    }
  }, [state.isAuthenticated, updateSyncTimeInStorage])

  // 导入用户数据
  const importUsers = useCallback(async () => {
    if (!state.isAuthenticated) {
      updateState({error: '未连接到OneDrive' })
      return
    }

    updateState({ 
      syncStatus: 'syncing', 
      error: null,
      exportResult: null 
    })
    
    try {
      console.log('Starting users import from OneDrive...')
      const result = await dataExportService.importUsersFromOneDrive()
      
      updateState({

        syncStatus: result.success ? 'success' : 'error',
        lastSyncTime: new Date(),
        error: result.success ? null : result.errors.join(', '),
        exportResult: result.success ? {
          success: true,
          exportedFiles: [`已导入 ${result.importedCount} 个用户记录`],
          errors: result.errors,
          metadata: {
            version: '1.0',
            exportTime: new Date().toISOString(),
            userId: 'import',
            appVersion: '1.0',
            tables: ['users']
          }
        } : null
      })
      
      console.log('Users import completed:', result)
    } catch (error) {
      console.error('Users import failed:', error)
      updateState({

        syncStatus: 'error',
        error: error instanceof Error ? error.message : '用户导入失败',
      })
    }
  }, [state.isAuthenticated])

  // 清除错误
  const clearError = useCallback(() => {
    updateState({error: null })
  }, [])

  // 加载文件列表
  const loadFiles = useCallback(async () => {
    if (!state.isAuthenticated) {
      updateState({error: '未连接到OneDrive' })
      return
    }

    updateState({isLoadingFiles: true, error: null })
    
    try {
      const graphClient = microsoftAuth.getGraphClient()!
      console.log('Loading files from Apps/HealthCalendar...')
      
      // 获取 Apps/HealthCalendar 目录内容
      const response = await graphClient.api('/me/drive/root:/Apps/HealthCalendar:/children').get()
      
      updateState({

        isLoadingFiles: false,
        files: response.value || []
      })
      
      console.log(`Loaded ${response.value?.length || 0} files`)
      // console.log('Files:', state.files.values)
    } catch (error) {
      console.error('Failed to load files:', error)
      updateState({

        isLoadingFiles: false,
        error: error instanceof Error ? error.message : '加载文件列表失败'
      })
    }
  }, [state.isAuthenticated])

  // 加载文件内容
  const loadFileContent = useCallback(async (fileId: string, fileName: string, isFolder: boolean = false) => {
    if (!state.isAuthenticated) {
      updateState({error: '未连接到OneDrive' })
      return
    }

    // 如果是文件夹，不尝试加载内容
    if (isFolder) {
      updateState({

        selectedFileContent: `无法显示文件夹内容: ${fileName}\n\n这是一个文件夹，无法显示文本内容。`
      })
      return
    }

    updateState({isLoadingFileContent: true, error: null })
    
    try {
      const graphClient = microsoftAuth.getGraphClient()!
      console.log(`Loading content for file: ${fileName}`)
      
      // 使用更安全的方式获取文件内容
      const authState = microsoftAuth.getAuthState()
      if (!authState || !authState.accessToken) {
        throw new Error('No valid access token available. Please re-authenticate.')
      }
      const accessToken = authState.accessToken

      // 直接使用 fetch API 来获取文件内容，这样可以更好地处理二进制文件
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      let fileContent: string
      const contentType = response.headers.get('content-type') || ''
      
      if (contentType.includes('application/json') || fileName.endsWith('.json')) {
        // JSON 文件
        const jsonText = await response.text()
        try {
          const jsonObj = JSON.parse(jsonText)
          fileContent = JSON.stringify(jsonObj, null, 2)
        } catch {
          fileContent = jsonText // 如果解析失败，显示原始文本
        }
      } else if (contentType.includes('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        // 文本文件
        fileContent = await response.text()
      } else {
        // 二进制或其他文件
        const arrayBuffer = await response.arrayBuffer()
        const size = arrayBuffer.byteLength
        fileContent = `二进制文件: ${fileName}\n文件大小: ${(size / 1024).toFixed(2)} KB\n\n无法显示二进制文件内容。`
      }
      
      updateState({

        isLoadingFileContent: false,
        selectedFileContent: fileContent
      })
      
      console.log(`Loaded content for ${fileName}`)
      // console.log('File content:', fileContent.slice(0, 1000)) // 只打印前1000个字符以避免过多日志
    } catch (error: any) {
      console.error('Failed to load file content:', error)
      
      let errorMessage = '加载文件内容失败'
      if (error.message?.includes('404')) {
        errorMessage = '文件未找到'
      } else if (error.message?.includes('403')) {
        errorMessage = '没有权限访问此文件'
      } else if (error.message?.includes('401')) {
        errorMessage = '认证已过期，请重新登录'
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      updateState({

        isLoadingFileContent: false,
        selectedFileContent: `加载失败: ${errorMessage}\n\n文件: ${fileName}\n错误详情: ${error.message || '未知错误'}`,
        error: errorMessage
      })
    }
  }, [state.isAuthenticated])

  // 组件挂载时进行认证状态检查和恢复
  useEffect(() => {
    const initializeAuth = async () => {
      // 只在浏览器环境中进行检查
      if (typeof window !== 'undefined') {
        try {
          // 检查基本环境，但不强制初始化MSAL
          const hasBasicSupport = !!(window.localStorage && window.indexedDB)
          if (!hasBasicSupport) {
            console.warn('浏览器缺少基本功能支持，OneDrive同步可能不可用')
            return
          }

          // 检查是否有保存的认证状态
          const savedAuthState = localStorage.getItem('healthcalendar_auth_state')
          console.log('🔍 检查localStorage中的认证状态:', savedAuthState ? '存在' : '不存在')
          
          if (savedAuthState) {
            try {
              const authData = JSON.parse(savedAuthState)
              // 检查状态是否过期（24小时）
              const isExpired = Date.now() - authData.timestamp > 24 * 60 * 60 * 1000
              
              console.log('📋 保存的认证数据:', {
                isAuthenticated: authData.isAuthenticated,
                timestamp: new Date(authData.timestamp).toLocaleString(),
                isExpired: isExpired,
                userInfo: authData.userInfo?.username || authData.userInfo?.displayName
              })
              
              if (!isExpired && authData.isAuthenticated) {
                console.log('✅ 找到有效的认证状态，恢复连接')
                // 先设置基本状态
                updateState({
                  userInfo: authData.userInfo,
                  lastSyncTime: authData.lastSyncTime ? new Date(authData.lastSyncTime) : null,
                })
                
                // 立即执行连接检查以快速恢复状态
                checkConnection().catch(err => {
                  console.warn('快速连接检查失败，但不影响后续操作:', err)
                })
              } else {
                console.log('⏰ 认证状态已过期或无效，清除保存的状态')
                localStorage.removeItem('healthcalendar_auth_state')
              }
            } catch (error) {
              console.warn('❌ 解析认证状态失败:', error)
              localStorage.removeItem('healthcalendar_auth_state')
            }
          } else {
            console.log('💭 localStorage中无认证状态')
          }
        } catch (error) {
          console.warn('Failed to initialize auth check:', error)
        }
      }
    }

    initializeAuth()
  }, [checkConnection])

  // 导入用户数据
  const syncIDBOneDriveUsers = useCallback(async () => {
    // 检查认证状态
    if (!state.isAuthenticated) {
      updateState({error: '需要先连接OneDrive才能同步' })
      return
    }

    updateState({ 
      syncStatus: 'syncing', 
      error: null,
      exportResult: null 
    })
    
    try {
      const graphClient = microsoftAuth.getGraphClient()!
      console.log('Starting users import from OneDrive...')
      const result = await dataExportService.importUsersFromOneDrive()
      
      const syncTime = new Date()
      updateState({

        syncStatus: result.success ? 'success' : 'error',
        lastSyncTime: syncTime,
        error: result.success ? null : result.errors.join(', '),
        exportResult: result.success ? {
          success: true,
          exportedFiles: [`已导入 ${result.importedCount} 个用户记录`],
          errors: result.errors,
          metadata: {
            version: '1.0',
            exportTime: syncTime.toISOString(),
            userId: 'import',
            appVersion: '1.0',
            tables: ['users']
          }
        } : null
      })
      
      // 更新localStorage中的同步时间
      if (result.success) {
        updateSyncTimeInStorage(syncTime)
      }
      
      console.log('Users import completed:', result)

      if (result.success) {
        // 如果导入成功，导出当前用户数据到OneDrive
        const exportResult = await dataExportService.exportTable('users', 'dummy')
      }

    } catch (error) {
      console.error('Users import failed:', error)
      
      let errorMessage = '用户导入失败'
      if (error instanceof Error) {
        errorMessage = error.message
        // 如果是认证错误，需要特殊处理
        if (errorMessage.includes('令牌') || errorMessage.includes('access token') || errorMessage.includes('authenticate')) {
          updateState({
            syncStatus: 'error',
            isAuthenticated: false,
            userInfo: null,
            error: '认证已过期，请重新连接OneDrive',
          })
          return
        }
      }
      
      updateState({
        syncStatus: 'error',
        error: errorMessage,
      })
    }
  }, [state.isAuthenticated, updateSyncTimeInStorage])

    // 导入用户数据
  const syncIDBOneDriveMyRecords = useCallback(async () => {
    // 检查认证状态
    if (!state.isAuthenticated) {
      updateState({error: '需要先连接OneDrive才能同步' })
      return
    }

    updateState({ 
      syncStatus: 'syncing', 
      error: null,
      exportResult: null 
    })
    
    try {
      const graphClient = microsoftAuth.getGraphClient()!
      console.log('Starting myRecords import from OneDrive...')
      const result = await dataExportService.importMyRecordsFromOneDrive()
      
      const syncTime = new Date()
      updateState({

        syncStatus: result.success ? 'success' : 'error',
        lastSyncTime: syncTime,
        error: result.success ? null : result.errors.join(', '),
        exportResult: result.success ? {
          success: true,
          exportedFiles: [`已导入 ${result.importedCount} 个记录`],
          errors: result.errors,
          metadata: {
            version: '1.0',
            exportTime: syncTime.toISOString(),
            userId: 'import',
            appVersion: '1.0',
            tables: ['myRecords']
          }
        } : null
      })
      
      // 更新localStorage中的同步时间
      if (result.success) {
        updateSyncTimeInStorage(syncTime)
      }
      
      console.log('MyRecords import completed:', result)
      if (result.success) {
        const exportResult = await dataExportService.exportTable('myRecords', 'dummy')
      }

    } catch (error) {
      console.error('MyRecords import failed:', error)
      
      let errorMessage = 'MyRecords导入失败'
      if (error instanceof Error) {
        errorMessage = error.message
        // 如果是认证错误，需要特殊处理
        if (errorMessage.includes('令牌') || errorMessage.includes('access token') || errorMessage.includes('authenticate')) {
          updateState({
            syncStatus: 'error',
            isAuthenticated: false,
            userInfo: null,
            error: '认证已过期，请重新连接OneDrive',
          })
          return
        }
      }
      
      updateState({
        syncStatus: 'error',
        error: errorMessage,
      })
    }
  }, [state.isAuthenticated, updateSyncTimeInStorage])

    // 导入用户数据
  const syncIDBOneDriveStoolRecords = useCallback(async () => {
    // 检查认证状态
    if (!state.isAuthenticated) {
      updateState({error: '需要先连接OneDrive才能同步' })
      return
    }

    updateState({ 
      syncStatus: 'syncing', 
      error: null,
      exportResult: null 
    })

    try {
      const graphClient = microsoftAuth.getGraphClient()!
      console.log('Starting stoolRecords import from OneDrive...')
      const result = await dataExportService.importStoolRecordsFromOneDrive()
      
      const syncTime = new Date()
      updateState({

        syncStatus: result.success ? 'success' : 'error',
        lastSyncTime: syncTime,
        error: result.success ? null : result.errors.join(', '),
        exportResult: result.success ? {
          success: true,
          exportedFiles: [`已导入 ${result.importedCount} 个记录`],
          errors: result.errors,
          metadata: {
            version: '1.0',
            exportTime: syncTime.toISOString(),
            userId: 'import',
            appVersion: '1.0',
            tables: ['stoolRecords']
          }
        } : null
      })
      
      // 更新localStorage中的同步时间
      if (result.success) {
        updateSyncTimeInStorage(syncTime)
      }
      
      console.log('StoolRecords import completed:', result)
      if (result.success) {
        const exportResult = await dataExportService.exportTable('stoolRecords', 'dummy')
      }

    } catch (error) {
      console.error('StoolRecords import failed:', error)

      let errorMessage = 'StoolRecords导入失败'
      if (error instanceof Error) {
        errorMessage = error.message
        // 如果是认证错误，需要特殊处理
        if (errorMessage.includes('令牌') || errorMessage.includes('access token') || errorMessage.includes('authenticate')) {
          updateState({
            syncStatus: 'error',
            isAuthenticated: false,
            userInfo: null,
            error: '认证已过期，请重新连接OneDrive',
          })
          return
        }
      }
      
      updateState({
        syncStatus: 'error',
        error: errorMessage,
      })
    }
  }, [state.isAuthenticated, updateSyncTimeInStorage])

    // 导入用户数据
  const syncIDBOneDrivePeriodRecords = useCallback(async () => {
    // 检查认证状态
    if (!state.isAuthenticated) {
      updateState({error: '需要先连接OneDrive才能同步' })
      return
    }

    updateState({ 
      syncStatus: 'syncing', 
      error: null,
      exportResult: null 
    })

    try {
      const graphClient = microsoftAuth.getGraphClient()!
      console.log('Starting periodRecords import from OneDrive...')
      const result = await dataExportService.importPeriodRecordsFromOneDrive()
      
      const syncTime = new Date()
      updateState({

        syncStatus: result.success ? 'success' : 'error',
        lastSyncTime: syncTime,
        error: result.success ? null : result.errors.join(', '),
        exportResult: result.success ? {
          success: true,
          exportedFiles: [`已导入 ${result.importedCount} 个记录`],
          errors: result.errors,
          metadata: {
            version: '1.0',
            exportTime: syncTime.toISOString(),
            userId: 'import',
            appVersion: '1.0',
            tables: ['stoolRecords']
          }
        } : null
      })
      
      // 更新localStorage中的同步时间
      if (result.success) {
        updateSyncTimeInStorage(syncTime)
      }
      
      console.log('PeriodRecords import completed:', result)
      if (result.success) {
        const exportResult = await dataExportService.exportTable('periodRecords', 'dummy')
      }

    } catch (error) {
      console.error('PeriodRecords import failed:', error)

      let errorMessage = 'PeriodRecords导入失败'
      if (error instanceof Error) {
        errorMessage = error.message
        // 如果是认证错误，需要特殊处理
        if (errorMessage.includes('令牌') || errorMessage.includes('access token') || errorMessage.includes('authenticate')) {
          updateState({
            syncStatus: 'error',
            isAuthenticated: false,
            userInfo: null,
            error: '认证已过期，请重新连接OneDrive',
          })
          return
        }
      }
      
      updateState({
        syncStatus: 'error',
        error: errorMessage,
      })
    }
  }, [state.isAuthenticated, updateSyncTimeInStorage])

  const syncIDBOneDriveMealRecords = useCallback(async () => {
    // 检查认证状态
    if (!state.isAuthenticated) {
      updateState({error: '需要先连接OneDrive才能同步' })
      return
    }

    updateState({ 
      syncStatus: 'syncing', 
      error: null,
      exportResult: null 
    })

    try {
      const graphClient = microsoftAuth.getGraphClient()!
      console.log('Starting mealRecords import from OneDrive...')
      const result = await dataExportService.importMealRecordsFromOneDrive()

      const syncTime = new Date()
      updateState({

        syncStatus: result.success ? 'success' : 'error',
        lastSyncTime: syncTime,
        error: result.success ? null : result.errors.join(', '),
        exportResult: result.success ? {
          success: true,
          exportedFiles: [`已导入 ${result.importedCount} 个记录`],
          errors: result.errors,
          metadata: {
            version: '1.0',
            exportTime: syncTime.toISOString(),
            userId: 'import',
            appVersion: '1.0',
            tables: ['stoolRecords']
          }
        } : null
      })
      
      // 更新localStorage中的同步时间
      if (result.success) {
        updateSyncTimeInStorage(syncTime)
      }
      
      console.log('MealRecords import completed:', result)
      if (result.success) {
        const exportResult = await dataExportService.exportTable('mealRecords', 'dummy')
      }

    } catch (error) {
      console.error('MealRecords import failed:', error)

      let errorMessage = 'MealRecords导入失败'
      if (error instanceof Error) {
        errorMessage = error.message
        // 如果是认证错误，需要特殊处理
        if (errorMessage.includes('令牌') || errorMessage.includes('access token') || errorMessage.includes('authenticate')) {
          updateState({
            syncStatus: 'error',
            isAuthenticated: false,
            userInfo: null,
            error: '认证已过期，请重新连接OneDrive',
          })
          return
        }
      }
      
      updateState({
        syncStatus: 'error',
        error: errorMessage,
      })
    }
  }, [state.isAuthenticated, updateSyncTimeInStorage])

  // 附件管理方法
  // 上传附件到OneDrive
  const uploadAttachment = useCallback(async (file: File, recordType: string, recordId: string): Promise<string> => {
    if (!state.isAuthenticated) {
      throw new Error('需要先连接OneDrive才能上传附件')
    }

    try {
      console.log(`🌐 OneDrive上传开始`)
      console.log(`📄 文件名: ${file.name}`)
      console.log(`📦 文件大小: ${(file.size / 1024 / 1024).toFixed(2)}MB (${file.size} bytes)`)
      console.log(`🏷️ 文件类型: ${file.type}`)
      console.log(`📂 记录类型: ${recordType}, 记录ID: ${recordId}`)

      // 生成唯一文件名：{recordType}_{recordId}_{timestamp}_{originalFileName}
      const timestamp = Date.now()
      const fileName = `${recordType}_${recordId}_${timestamp}_${file.name}`
      const filePath = `/Apps/HealthCalendar/attachments/${fileName}`

      // 确保附件目录存在
      await ensureAttachmentsFolder()

      // 获取访问令牌
      const token = await microsoftAuth.getTokenSilently()
      if (!token) {
        throw new Error('无法获取访问令牌，请重新登录')
      }

      console.log(`📤 上传到路径: ${filePath}`)

      // 上传文件到OneDrive
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:${filePath}:/content`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`上传附件失败: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const fileInfo = await response.json()
      
      console.log(`✅ OneDrive上传成功`)
      console.log(`📁 文件名: ${fileName}`)
      console.log(`🔗 文件ID: ${fileInfo.id}`)
      console.log(`📊 上传后大小: ${fileInfo.size} bytes`)
      
      return fileName // 返回文件名用于存储在记录中
    } catch (error) {
      console.error('❌ OneDrive上传失败:', error)
      throw error
    }
  }, [state.isAuthenticated])

  // 删除附件
  const deleteAttachment = useCallback(async (fileName: string): Promise<void> => {
    if (!state.isAuthenticated) {
      throw new Error('需要先连接OneDrive')
    }

    try {
      const token = await microsoftAuth.getTokenSilently()
      if (!token) {
        updateState({
          isAuthenticated: false,
          userInfo: null,
          error: '令牌已过期，请重新连接OneDrive'
        })
        throw new Error('无法获取访问令牌，请重新登录')
      }

      const filePath = `/Apps/HealthCalendar/attachments/${fileName}`
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:${filePath}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok && response.status !== 404) {
        const errorText = await response.text()
        throw new Error(`删除附件失败: ${response.status} ${response.statusText} - ${errorText}`)
      }

      console.log('附件删除成功:', fileName)
    } catch (error) {
      console.error('删除附件失败:', error)
      throw error
    }
  }, [state.isAuthenticated])

  // 获取附件下载URL - 带缓存和限流
  const getAttachmentUrl = useCallback(async (fileName: string): Promise<string> => {
    // 检查缓存
    const cached = urlCache.get(fileName)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.url
    }

    // 检查是否有正在进行的请求
    const pendingRequest = pendingRequests.get(fileName)
    if (pendingRequest) {
      return pendingRequest
    }

    // 创建新的请求
    const requestPromise = (async (): Promise<string> => {
      // 等待直到有可用的请求槽位
      while (activeRequests >= MAX_CONCURRENT_REQUESTS) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      activeRequests++
      
      try {
        // 首先检查基本的认证状态
        if (!state.isAuthenticated) {
          // 尝试从localStorage恢复状态
          const savedAuthState = localStorage.getItem('healthcalendar_auth_state')
          if (savedAuthState) {
            try {
              const authData = JSON.parse(savedAuthState)
              const isExpired = Date.now() - authData.timestamp > 24 * 60 * 60 * 1000
              if (!isExpired && authData.isAuthenticated) {
                    // 不抛出错误，继续尝试获取token
              } else {
                throw new Error('OneDrive连接已过期，请重新连接')
              }
            } catch (parseError) {
              throw new Error('需要先连接OneDrive')
            }
          } else {
            throw new Error('需要先连接OneDrive')
          }
        }

        const token = await microsoftAuth.getTokenSilently()
        if (!token) {
          // 如果令牌获取失败，更新全局认证状态
          updateState({
            isAuthenticated: false,
            userInfo: null,
            error: '令牌已过期，请重新连接OneDrive'
          })
          throw new Error('无法获取访问令牌，请重新登录')
        }

        const filePath = `/Apps/HealthCalendar/attachments/${fileName}`
        const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:${filePath}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('认证已过期，请重新登录')
          } else if (response.status === 404) {
            throw new Error('附件文件未找到')
          }
          throw new Error(`获取附件信息失败: ${response.status} ${response.statusText}`)
        }

        const fileInfo = await response.json()
        const downloadUrl = fileInfo['@microsoft.graph.downloadUrl'] || fileInfo.webUrl
        
        if (!downloadUrl) {
          throw new Error('无法获取附件下载链接')
        }
        
        // 缓存结果
        urlCache.set(fileName, {
          url: downloadUrl,
          timestamp: Date.now()
        })
        
        return downloadUrl
      } catch (error) {
        console.error('获取附件URL失败:', fileName, error)
        throw error
      } finally {
        activeRequests--
        pendingRequests.delete(fileName)
      }
    })()

    // 将请求添加到待处理列表
    pendingRequests.set(fileName, requestPromise)
    
    return requestPromise
  }, [state.isAuthenticated])

  // 列出附件
  const listAttachments = useCallback(async (recordId?: string): Promise<string[]> => {
    if (!state.isAuthenticated) {
      throw new Error('需要先连接OneDrive')
    }

    try {
      const token = await microsoftAuth.getTokenSilently()
      if (!token) {
        updateState({
          isAuthenticated: false,
          userInfo: null,
          error: '令牌已过期，请重新连接OneDrive'
        })
        throw new Error('无法获取访问令牌，请重新登录')
      }

      const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/Apps/HealthCalendar/attachments:/children`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          return [] // 附件目录不存在，返回空数组
        }
        throw new Error(`获取附件列表失败: ${response.statusText}`)
      }

      const data = await response.json()
      const files = data.value || []
      
      // 如果指定了recordId，则过滤相关文件
      if (recordId) {
        return files
          .filter((file: any) => file.name.includes(`_${recordId}_`))
          .map((file: any) => file.name)
      }

      return files.map((file: any) => file.name)
    } catch (error) {
      console.error('获取附件列表失败:', error)
      throw error
    }
  }, [state.isAuthenticated])

  // 确保附件目录存在
  const ensureAttachmentsFolder = useCallback(async (): Promise<void> => {
    try {
      const token = await microsoftAuth.getTokenSilently()
      if (!token) {
        throw new Error('无法获取访问令牌')
      }

      // 检查附件目录是否存在
      const checkResponse = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/Apps/HealthCalendar/attachments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (checkResponse.status === 404) {
        // 目录不存在，创建它
        const createResponse = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/Apps/HealthCalendar:/children`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'attachments',
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename'
          })
        })

        if (!createResponse.ok) {
          throw new Error(`创建附件目录失败: ${createResponse.statusText}`)
        }

        console.log('附件目录创建成功')
      }
    } catch (error) {
      console.error('确保附件目录存在失败:', error)
      throw error
    }
  }, [])

  const actions: OneDriveSyncActions = {
    connect,
    disconnect,
    checkConnection,
    startSync,
    exportData,
    exportTable,
    importUsers,
    clearError,
    loadFiles,
    loadFileContent,
    syncIDBOneDriveUsers,
    syncIDBOneDriveMyRecords,
    syncIDBOneDriveStoolRecords,
    syncIDBOneDrivePeriodRecords,
    syncIDBOneDriveMealRecords,
    uploadAttachment,
    deleteAttachment,
    getAttachmentUrl,
    listAttachments,
  }

  return [state, actions]
}

// 辅助函数：格式化同步时间
export const formatSyncTime = (date: Date | null | undefined): string => {
  console.log('🕐 formatSyncTime called with:', date ? date.toISOString() : date)
  if (!date || date === undefined) return '从未同步'
  
  // 确保date是一个有效的Date对象
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    console.warn('⚠️ Invalid date object:', date)
    return '从未同步'
  }
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  console.log(`⏱️ Time difference: ${diffMins} minutes`)
  
  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}小时前`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}天前`
}
