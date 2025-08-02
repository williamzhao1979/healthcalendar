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
  isOneDriveAvailable: boolean
  unavailabilityReason: string | null
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
    isOneDriveAvailable: true, // Will be updated on initialization
    unavailabilityReason: null,
  })

  // 检查连接状态 - 增强持久化认证支持
  const checkConnection = useCallback(async () => {
    try {
      // First check if OneDrive is available at all
      const isOneDriveAvailable = microsoftAuth.isOneDriveAvailable()
      const unavailabilityReason = microsoftAuth.getUnavailabilityReason()
      
      setState(prev => ({
        ...prev,
        isOneDriveAvailable,
        unavailabilityReason,
      }))

      if (!isOneDriveAvailable) {
        console.warn('OneDrive not available:', unavailabilityReason)
        return
      }

      await microsoftAuth.initialize()
      
      const isLoggedIn = microsoftAuth.isLoggedIn()
      const userInfo = microsoftAuth.getCurrentUser()
      
      if (isLoggedIn) {
        console.log('Found existing authentication, attempting to restore session')
        
        // 尝试静默获取令牌以验证会话有效性
        const token = await microsoftAuth.getTokenSilently()
        
        if (token) {
          console.log('Authentication session restored successfully')
          setState(prev => ({
            ...prev,
            isAuthenticated: true,
            userInfo: userInfo,
            error: null,
          }))
        } else {
          console.log('Authentication session expired, will require re-login')
          setState(prev => ({
            ...prev,
            isAuthenticated: false,
            userInfo: null,
            error: null,
          }))
        }
      } else {
        console.log('No existing authentication found')
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
    // Check if OneDrive is available before attempting connection
    if (!microsoftAuth.isOneDriveAvailable()) {
      const reason = microsoftAuth.getUnavailabilityReason()
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: reason || 'OneDrive功能不可用'
      }))
      return
    }

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
  const startSync = useCallback(async (userId: string) => {
    if (!state.isAuthenticated) {
      setState(prev => ({ ...prev, error: '未连接到OneDrive' }))
      return
    }
      // await dataExportService.syncFromOneDrive()
      // await dataExportService.readusers()
      // // 这里可以添加更多的同步逻辑，例如导入数据等
      // return
    setState(prev => ({ ...prev, syncStatus: 'syncing', error: null }))
    
    try {
      // 导入所有表数据
      const result = await dataExportService.importAllTables(userId)
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          syncStatus: 'success',
          lastSyncTime: new Date(),
        }))
        
        console.log(`Sync completed successfully. Imported tables: ${result.importedTables.join(', ')}`)
      } else {
        // 部分成功或完全失败
        const errorMessage = result.errors.length > 0 
          ? result.errors.join('; ') 
          : '同步过程中出现未知错误'
          
        setState(prev => ({
          ...prev,
          syncStatus: result.importedTables.length > 0 ? 'success' : 'error',
          lastSyncTime: result.importedTables.length > 0 ? new Date() : prev.lastSyncTime,
          error: result.importedTables.length > 0 ? `部分导入成功，错误: ${errorMessage}` : errorMessage,
        }))
        
        console.warn(`Sync completed with errors. Imported: ${result.importedTables.join(', ')}, Errors: ${result.errors.join(', ')}`)
      }
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

  // 导入用户数据
  const importUsers = useCallback(async () => {
    if (!state.isAuthenticated) {
      setState(prev => ({ ...prev, error: '未连接到OneDrive' }))
      return
    }

    setState(prev => ({ 
      ...prev, 
      syncStatus: 'syncing', 
      error: null,
      exportResult: null 
    }))
    
    try {
      console.log('Starting users import from OneDrive...')
      const result = await dataExportService.importUsersFromOneDrive()
      
      setState(prev => ({
        ...prev,
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
      }))
      
      console.log('Users import completed:', result)
    } catch (error) {
      console.error('Users import failed:', error)
      setState(prev => ({
        ...prev,
        syncStatus: 'error',
        error: error instanceof Error ? error.message : '用户导入失败',
      }))
    }
  }, [state.isAuthenticated])

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // 加载文件列表
  const loadFiles = useCallback(async () => {
    if (!state.isAuthenticated) {
      setState(prev => ({ ...prev, error: '未连接到OneDrive' }))
      return
    }

    setState(prev => ({ ...prev, isLoadingFiles: true, error: null }))
    
    try {
      const graphClient = microsoftAuth.getGraphClient()!
      console.log('Loading files from Apps/HealthCalendar...')
      
      // 获取 Apps/HealthCalendar 目录内容
      const response = await graphClient.api('/me/drive/root:/Apps/HealthCalendar:/children').get()
      
      setState(prev => ({
        ...prev,
        isLoadingFiles: false,
        files: response.value || []
      }))
      
      console.log(`Loaded ${response.value?.length || 0} files`)
      // console.log('Files:', state.files.values)
    } catch (error) {
      console.error('Failed to load files:', error)
      setState(prev => ({
        ...prev,
        isLoadingFiles: false,
        error: error instanceof Error ? error.message : '加载文件列表失败'
      }))
    }
  }, [state.isAuthenticated])

  // 加载文件内容
  const loadFileContent = useCallback(async (fileId: string, fileName: string, isFolder: boolean = false) => {
    if (!state.isAuthenticated) {
      setState(prev => ({ ...prev, error: '未连接到OneDrive' }))
      return
    }

    // 如果是文件夹，不尝试加载内容
    if (isFolder) {
      setState(prev => ({
        ...prev,
        selectedFileContent: `无法显示文件夹内容: ${fileName}\n\n这是一个文件夹，无法显示文本内容。`
      }))
      return
    }

    setState(prev => ({ ...prev, isLoadingFileContent: true, error: null }))
    
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
      
      setState(prev => ({
        ...prev,
        isLoadingFileContent: false,
        selectedFileContent: fileContent
      }))
      
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
      
      setState(prev => ({
        ...prev,
        isLoadingFileContent: false,
        selectedFileContent: `加载失败: ${errorMessage}\n\n文件: ${fileName}\n错误详情: ${error.message || '未知错误'}`,
        error: errorMessage
      }))
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
          if (savedAuthState) {
            console.log('Found saved auth state, attempting to restore connection')
            // 延迟执行连接检查，避免阻塞UI
            setTimeout(() => {
              checkConnection()
            }, 500)
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
    if (!state.isAuthenticated) {
      setState(prev => ({ ...prev, error: '未连接到OneDrive' }))
      return
    }

    // 检查基本认证状态
    // if (!microsoftAuth.isLoggedIn()) {
    //   setState(prev => ({ ...prev, error: '用户未登录OneDrive，请先连接' }))
    //   return
    // }

    // setState(prev => ({ 
    //   ...prev, 
    //   syncStatus: 'syncing', 
    //   error: null,
    //   exportResult: null 
    // }))
    
    try {
      const graphClient = microsoftAuth.getGraphClient()!
      console.log('Starting users import from OneDrive...')
      const result = await dataExportService.importUsersFromOneDrive()
      
      setState(prev => ({
        ...prev,
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
      }))
      
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
      }
      
      setState(prev => ({
        ...prev,
        syncStatus: 'error',
        error: errorMessage,
      }))
    }
  }, [state.isAuthenticated])

    // 导入用户数据
  const syncIDBOneDriveMyRecords = useCallback(async () => {
    if (!state.isAuthenticated) {
      setState(prev => ({ ...prev, error: '未连接到OneDrive' }))
      return
    }

    // 检查基本认证状态
    // if (!microsoftAuth.isLoggedIn()) {
    //   setState(prev => ({ ...prev, error: '用户未登录OneDrive，请先连接' }))
    //   return
    // }

    // setState(prev => ({ 
    //   ...prev, 
    //   syncStatus: 'syncing', 
    //   error: null,
    //   exportResult: null 
    // }))
    
    try {
      const graphClient = microsoftAuth.getGraphClient()!
      console.log('Starting users import from OneDrive...')
      const result = await dataExportService.importMyRecordsFromOneDrive()
      
      setState(prev => ({
        ...prev,
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
      }))
      
      // console.log('Users import completed:', result)
      if (result.success) {
        const exportResult = await dataExportService.exportTable('myRecords', 'dummy')
      }

    } catch (error) {
      console.error('MyRecords import failed:', error)
      
      let errorMessage = 'MyRecords导入失败'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      setState(prev => ({
        ...prev,
        syncStatus: 'error',
        error: errorMessage,
      }))
    }
  }, [state.isAuthenticated])

    // 导入用户数据
  const syncIDBOneDriveStoolRecords = useCallback(async () => {
    if (!state.isAuthenticated) {
      setState(prev => ({ ...prev, error: '未连接到OneDrive' }))
      return
    }

    try {
      const graphClient = microsoftAuth.getGraphClient()!
      console.log('Starting users import from OneDrive...')
      const result = await dataExportService.importStoolRecordsFromOneDrive()
      
      setState(prev => ({
        ...prev,
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
      }))
      
      // console.log('Users import completed:', result)
      if (result.success) {
        const exportResult = await dataExportService.exportTable('stoolRecords', 'dummy')
      }

    } catch (error) {
      console.error('StoolRecords import failed:', error)

      let errorMessage = 'StoolRecords导入失败'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      setState(prev => ({
        ...prev,
        syncStatus: 'error',
        error: errorMessage,
      }))
    }
  }, [state.isAuthenticated])

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
