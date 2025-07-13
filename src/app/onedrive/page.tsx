'use client'

import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { useEffect, useState } from 'react'

const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || 'YOUR_CLIENT_ID',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    // 明确指定这是一个公共客户端（SPA）
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    // 允许在 iframe 中运行（某些情况下需要）
    allowNativeBroker: false,
    loggerOptions: {
      loggerCallback: (level: any, message: string, containsPii: boolean) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 0: // Error
            console.error(message);
            break;
          case 1: // Warning
            console.warn(message);
            break;
          case 2: // Info
            console.info(message);
            break;
          case 3: // Verbose
            console.debug(message);
            break;
        }
      }
    }
  }
}

let pca: PublicClientApplication | null = null

// 初始化 MSAL 实例
if (typeof window !== 'undefined') {
  pca = new PublicClientApplication(msalConfig)
}

interface UserProfile {
  displayName: string
  mail: string
  jobTitle?: string
  officeLocation?: string
}

interface DriveFile {
  id: string
  name: string
  size: number
  lastModifiedDateTime: string
  downloadUrl?: string
  webUrl: string
  folder?: any // 如果是文件夹，这个属性会存在
}

interface UploadProgress {
  fileName: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
}

export default function MicrosoftAuthPage() {
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [accessToken, setAccessToken] = useState<string>('')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [files, setFiles] = useState<DriveFile[]>([])
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [filesLoading, setFilesLoading] = useState<boolean>(false)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [currentFolder, setCurrentFolder] = useState<DriveFile | null>(null)
  const [folderHistory, setFolderHistory] = useState<DriveFile[]>([])
  const [healthCalendarFolder, setHealthCalendarFolder] = useState<DriveFile | null>(null)
  const [allowedFolderIds, setAllowedFolderIds] = useState<Set<string>>(new Set())

  // 检查文件夹是否在允许的范围内
  const isSubfolderOfHealthCalendar = (folderId: string): boolean => {
    return allowedFolderIds.has(folderId)
  }

  // 添加文件夹到允许列表
  const addToAllowedFolders = (folderId: string) => {
    setAllowedFolderIds(prev => new Set([...prev, folderId]))
  }

  useEffect(() => {
    const initializeMsal = async () => {
      if (pca) {
        try {
          await pca.initialize()
          setIsInitialized(true)
          
          // 检查是否已有活跃账户
          const accounts = pca.getAllAccounts()
          if (accounts.length > 0) {
            setAccount(accounts[0])
            await acquireToken(accounts[0])
            // 自动初始化 healthcalendar 文件夹
            setTimeout(() => initializeHealthCalendarFolder(), 1000)
          }
        } catch (err) {
          console.error('MSAL初始化失败:', err)
          setError('Microsoft认证服务初始化失败')
        }
      }
    }

    initializeMsal()
  }, [])

  const acquireToken = async (account: AccountInfo) => {
    if (!pca) return

    try {
      const tokenResponse = await pca.acquireTokenSilent({
        scopes: ['User.Read', 'Calendars.ReadWrite', 'Files.ReadWrite.All'],
        account: account,
      })
      setAccessToken(tokenResponse.accessToken)
      await fetchUserProfile(tokenResponse.accessToken)
    } catch (err) {
      console.error('获取令牌失败:', err)
      // 如果静默获取失败，尝试交互式获取
      try {
        const tokenResponse = await pca.acquireTokenPopup({
          scopes: ['User.Read', 'Calendars.ReadWrite', 'Files.ReadWrite.All'],
          account: account,
        })
        setAccessToken(tokenResponse.accessToken)
        await fetchUserProfile(tokenResponse.accessToken)
      } catch (popupErr) {
        console.error('交互式获取令牌失败:', popupErr)
        setError('获取访问令牌失败')
      }
    }
  }

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const profile = await response.json()
        setUserProfile(profile)
      }
    } catch (err) {
      console.error('获取用户资料失败:', err)
    }
  }

  // 初始化 healthcalendar 文件夹（替代原有的 fetchFiles）
  const initializeHealthCalendarFolder = async () => {
    const folder = await getHealthCalendarFolder()
    if (folder) {
      setHealthCalendarFolder(folder)
      setCurrentFolder(folder)
      addToAllowedFolders(folder.id) // 将 healthcalendar 文件夹添加到允许列表
      await fetchFolderFiles(folder.id)
    }
  }

  // 获取 OneDrive 文件列表（现在只用于 healthcalendar 文件夹）
  const fetchFiles = async () => {
    if (healthCalendarFolder) {
      await fetchFolderFiles(healthCalendarFolder.id)
    } else {
      await initializeHealthCalendarFolder()
    }
  }

  // 获取指定文件夹的文件列表（限制在 healthcalendar 文件夹及其子文件夹）
  const fetchFolderFiles = async (folderId?: string) => {
    if (!accessToken) return

    setFilesLoading(true)
    try {
      let url: string
      
      if (folderId) {
        // 只允许访问 healthcalendar 文件夹及其子文件夹
        if (healthCalendarFolder && (folderId === healthCalendarFolder.id || isSubfolderOfHealthCalendar(folderId))) {
          url = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`
        } else {
          console.warn('访问被拒绝：只能访问 healthcalendar 文件夹及其子文件夹')
          setError('访问被拒绝：只能访问健康数据文件夹')
          return
        }
      } else {
        // 如果没有指定文件夹ID，默认访问 healthcalendar 文件夹
        if (!healthCalendarFolder) {
          await initializeHealthCalendarFolder()
          return
        }
        url = `https://graph.microsoft.com/v1.0/me/drive/items/${healthCalendarFolder.id}/children`
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const files = data.value || []
        
        // 将新发现的子文件夹添加到允许列表
        files.forEach((file: DriveFile) => {
          if (file.folder) {
            addToAllowedFolders(file.id)
          }
        })
        
        setFiles(files)
      } else {
        setError('获取文件列表失败')
      }
    } catch (err) {
      console.error('获取文件失败:', err)
      setError('获取文件列表失败')
    } finally {
      setFilesLoading(false)
    }
  }

  // 创建或获取 healthcalendar 文件夹
  const getHealthCalendarFolder = async () => {
    if (!accessToken) return null

    try {
      // 首先尝试使用简单的方式检查文件夹是否存在
      const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        // 查找是否已存在 healthcalendar 文件夹
        const existingFolder = data.value?.find((item: any) => 
          item.name === 'healthcalendar' && item.folder
        )
           if (existingFolder) {
        console.log('找到现有的 healthcalendar 文件夹:', existingFolder.id)
        setHealthCalendarFolder(existingFolder)
        addToAllowedFolders(existingFolder.id)
        return existingFolder
      }
      }

      // 如果文件夹不存在，创建新文件夹
      console.log('创建新的 healthcalendar 文件夹...')
      const createResponse = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'healthcalendar',
          folder: {},
          '@microsoft.graph.conflictBehavior': 'replace' // 如果存在就替换，避免409错误
        })
      })

      if (createResponse.ok) {
        const newFolder = await createResponse.json()
        console.log('成功创建 healthcalendar 文件夹:', newFolder.id)
        setHealthCalendarFolder(newFolder)
        addToAllowedFolders(newFolder.id)
        return newFolder
      } else if (createResponse.status === 409) {
        // 如果还是409错误，说明文件夹确实存在，重新获取
        console.log('文件夹已存在，重新获取...')
        const retryResponse = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (retryResponse.ok) {
          const retryData = await retryResponse.json()
          const existingFolder = retryData.value?.find((item: any) => 
            item.name === 'healthcalendar' && item.folder
          )
          
          if (existingFolder) {
            console.log('重新获取到 healthcalendar 文件夹:', existingFolder.id)
            setHealthCalendarFolder(existingFolder)
            addToAllowedFolders(existingFolder.id)
            return existingFolder
          }
        }
        
        console.error('无法找到或创建 healthcalendar 文件夹')
        return null
      } else {
        console.error('创建文件夹失败:', createResponse.status, await createResponse.text())
        return null
      }
    } catch (err) {
      console.error('获取/创建文件夹失败:', err)
      return null
    }
  }

  // 上传文件到指定文件夹（只允许上传到 healthcalendar 文件夹及其子文件夹）
  const uploadFileToFolder = async (file: File, folderId?: string) => {
    if (!accessToken) return

    // 验证上传目标文件夹
    if (folderId && !isSubfolderOfHealthCalendar(folderId) && folderId !== healthCalendarFolder?.id) {
      setError('只能上传文件到健康数据文件夹')
      return
    }

    // 如果没有指定文件夹，默认上传到 healthcalendar 文件夹
    const targetFolderId = folderId || healthCalendarFolder?.id
    if (!targetFolderId) {
      setError('请先初始化健康数据文件夹')
      return
    }

    // 添加上传进度追踪
    setUploadProgress(prev => [...prev, {
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    }])

    try {
      let uploadUrl: string
      
      // 只允许上传到 healthcalendar 文件夹及其子文件夹
      uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${targetFolderId}:/${encodeURIComponent(file.name)}:/content`

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: file
      })

      if (response.ok) {
        // 更新上传进度为完成
        setUploadProgress(prev => prev.map(p => 
          p.fileName === file.name 
            ? { ...p, progress: 100, status: 'completed' as const }
            : p
        ))
        
        // 刷新当前文件夹的文件列表
        if (currentFolder) {
          await fetchFolderFiles(currentFolder.id)
        } else {
          await fetchFiles()
        }
        
        // 3秒后移除成功的上传记录
        setTimeout(() => {
          setUploadProgress(prev => prev.filter(p => p.fileName !== file.name))
        }, 3000)
      } else {
        throw new Error(`上传失败: ${response.status}`)
      }
    } catch (err) {
      console.error('文件上传失败:', err)
      setUploadProgress(prev => prev.map(p => 
        p.fileName === file.name 
          ? { ...p, status: 'error' as const }
          : p
      ))
    }
  }

  // 上传文件到 OneDrive（现在只能上传到 healthcalendar 文件夹）
  const uploadFile = async (file: File) => {
    await uploadFileToFolder(file, healthCalendarFolder?.id)
  }

  // 下载文件
  const downloadFile = async (file: DriveFile) => {
    if (!accessToken) return

    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${file.id}/content`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        setError('下载文件失败')
      }
    } catch (err) {
      console.error('下载文件失败:', err)
      setError('下载文件失败')
    }
  }

  // 删除文件
  const deleteFile = async (file: DriveFile) => {
    if (!accessToken) return
    
    if (!confirm(`确定要删除文件 "${file.name}" 吗？`)) return

    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${file.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      })

      if (response.ok) {
        // 刷新当前文件夹的文件列表
        if (currentFolder) {
          await fetchFolderFiles(currentFolder.id)
        } else {
          await fetchFiles()
        }
      } else {
        setError('删除文件失败')
      }
    } catch (err) {
      console.error('删除文件失败:', err)
      setError('删除文件失败')
    }
  }

  // 创建健康数据示例文件
  const createHealthDataFile = async () => {
    if (!accessToken) return

    // 添加创建状态指示
    setUploadProgress(prev => [...prev, {
      fileName: '创建健康数据文件...',
      progress: 20,
      status: 'uploading'
    }])

    try {
      // 获取或创建 healthcalendar 文件夹
      setUploadProgress(prev => prev.map(p => 
        p.fileName === '创建健康数据文件...' 
          ? { ...p, progress: 40, fileName: '准备健康文件夹...' }
          : p
      ))

      const folder = await getHealthCalendarFolder()
      if (!folder) {
        setError('无法创建或访问 healthcalendar 文件夹')
        setUploadProgress(prev => prev.filter(p => p.fileName !== '准备健康文件夹...'))
        return
      }

      setUploadProgress(prev => prev.map(p => 
        p.fileName === '准备健康文件夹...' 
          ? { ...p, progress: 60, fileName: '生成健康数据...' }
          : p
      ))

      const healthData = {
        date: new Date().toISOString().split('T')[0],
        data: {
          weight: 70,
          bloodPressure: {
            systolic: 120,
            diastolic: 80
          },
          heartRate: 72,
          steps: 8000,
          sleep: {
            duration: 8,
            quality: 'good'
          },
          notes: '今天感觉很好，完成了晨跑运动'
        },
        createdAt: new Date().toISOString(),
        source: 'HealthCalendar App'
      }

      const content = JSON.stringify(healthData, null, 2)
      const blob = new Blob([content], { type: 'application/json' })
      const fileName = `health-data-${healthData.date}.json`
      const file = new File([blob], fileName, { type: 'application/json' })
      
      setUploadProgress(prev => prev.map(p => 
        p.fileName === '生成健康数据...' 
          ? { ...p, progress: 80, fileName: fileName }
          : p
      ))

      // 上传到 healthcalendar 文件夹
      await uploadFileToFolder(file, folder.id)
      
      console.log(`健康数据文件已创建并上传到 healthcalendar 文件夹: ${fileName}`)
    } catch (err) {
      console.error('创建健康数据文件失败:', err)
      setError('创建健康数据文件失败: ' + (err as Error).message)
      // 清除失败的进度条
      setUploadProgress(prev => prev.filter(p => 
        !p.fileName.includes('创建健康数据') && 
        !p.fileName.includes('准备健康文件夹') && 
        !p.fileName.includes('生成健康数据')
      ))
    }
  }

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files)
  }

  // 批量上传选中的文件
  const uploadSelectedFiles = async () => {
    if (!selectedFiles) return

    for (let i = 0; i < selectedFiles.length; i++) {
      await uploadFile(selectedFiles[i])
    }
    
    // 清空选择
    setSelectedFiles(null)
    const fileInput = document.getElementById('fileInput') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const login = async () => {
    if (!pca || !isInitialized) {
      setError('Microsoft认证服务尚未初始化')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const loginResponse = await pca.loginPopup({
        scopes: ['User.Read', 'Calendars.ReadWrite', 'Files.ReadWrite.All'],
        prompt: 'select_account'
      })
      
      setAccount(loginResponse.account)
      await acquireToken(loginResponse.account)
      // 登录成功后自动初始化 healthcalendar 文件夹
      setTimeout(() => initializeHealthCalendarFolder(), 1000)
    } catch (err: any) {
      console.error('登录失败:', err)
      
      // 详细的错误处理
      if (err.errorCode === 'popup_window_error' || err.name === 'BrowserAuthError') {
        setError('弹窗被阻止，请允许弹窗并重试。如果问题持续，请尝试关闭弹窗阻止程序。')
      } else if (err.errorCode === 'user_cancelled' || err.errorMessage?.includes('User cancelled')) {
        setError('登录已取消')
      } else if (err.errorCode === 'invalid_client' || err.errorMessage?.includes('AADSTS70002')) {
        setError('应用配置错误：请确保Azure应用注册配置为"单页应用程序(SPA)"类型。详见故障排除指南。')
      } else if (err.errorCode === 'invalid_request' || err.errorMessage?.includes('AADSTS50011')) {
        setError('重定向URI配置错误：请在Azure Portal中检查重定向URI设置')
      } else if (err.errorMessage?.includes('AADSTS65001')) {
        setError('权限未授予：请联系管理员授予应用权限')
      } else if (err.name === 'InteractionRequiredAuthError') {
        setError('需要用户交互，请重试')
      } else if (err.name === 'ServerError') {
        setError(`服务器错误：${err.errorMessage || '请稍后重试'}`)
      } else {
        setError(`登录失败：${err.errorMessage || err.message || '未知错误，请检查网络连接并重试'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    if (!pca) return
    
    setLoading(true)
    try {
      await pca.logoutPopup({
        account: account
      })
      setAccount(null)
      setAccessToken('')
      setUserProfile(null)
      setError('')
    } catch (err) {
      console.error('退出登录失败:', err)
      setError('退出登录失败')
    } finally {
      setLoading(false)
    }
  }

  // 进入文件夹（只允许进入 healthcalendar 文件夹的子文件夹）
  const enterFolder = (folder: DriveFile) => {
    if (!isSubfolderOfHealthCalendar(folder.id) && folder.id !== healthCalendarFolder?.id) {
      setError('只能访问健康数据文件夹及其子文件夹')
      return
    }
    
    setFolderHistory(prev => currentFolder ? [...prev, currentFolder] : [])
    setCurrentFolder(folder)
    fetchFolderFiles(folder.id)
  }

  // 返回上级文件夹（限制在 healthcalendar 范围内）
  const goBack = () => {
    if (folderHistory.length > 0) {
      const previousFolder = folderHistory[folderHistory.length - 1]
      setCurrentFolder(previousFolder)
      setFolderHistory(prev => prev.slice(0, -1))
      fetchFolderFiles(previousFolder.id)
    } else {
      // 返回到 healthcalendar 根文件夹
      if (healthCalendarFolder) {
        setCurrentFolder(healthCalendarFolder)
        fetchFolderFiles(healthCalendarFolder.id)
      }
    }
  }

  // 直接进入 healthcalendar 文件夹
  const goToHealthFolder = async () => {
    const folder = await getHealthCalendarFolder()
    if (folder) {
      setFolderHistory([])
      setCurrentFolder(folder)
      fetchFolderFiles(folder.id)
    }
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在初始化Microsoft认证服务...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white text-center">健康日历</h1>
            <p className="text-blue-100 text-center mt-2">Microsoft 账户登录</p>
          </div>

          <div className="px-8 py-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm mb-2">{error}</p>
                {error.includes('应用配置错误') && (
                  <div className="text-xs text-red-500">
                    <p>💡 需要帮助？请查看项目根目录中的 <code>TROUBLESHOOTING.md</code> 文件获取详细的修复步骤。</p>
                  </div>
                )}
              </div>
            )}

            {account ? (
              <div className="space-y-6">
                {/* 用户信息区域 */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-xl font-semibold">
                      {userProfile?.displayName?.charAt(0) || account.username?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    欢迎，{userProfile?.displayName || account.username}
                  </h2>
                  {userProfile?.mail && (
                    <p className="text-gray-600 text-sm mt-1">{userProfile.mail}</p>
                  )}
                  {userProfile?.jobTitle && (
                    <p className="text-gray-500 text-sm">{userProfile.jobTitle}</p>
                  )}
                </div>

                {/* 文件操作区域 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">📁 OneDrive 文件管理</h3>
                  
                  {/* 文件上传区域 */}
                  <div className="space-y-3 mb-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => document.getElementById('fileInput')?.click()}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        📤 上传文件到健康文件夹
                      </button>
                      <button
                        onClick={createHealthDataFile}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        🏥 创建健康数据示例
                      </button>
                      <button
                        onClick={() => currentFolder ? fetchFolderFiles(currentFolder.id) : fetchFiles()}
                        disabled={filesLoading}
                        className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        {filesLoading ? '🔄 刷新中...' : '🔄 刷新文件列表'}
                      </button>
                    </div>
                    
                    <input
                      id="fileInput"
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    {selectedFiles && selectedFiles.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800 mb-2">
                          已选择 {selectedFiles.length} 个文件:
                        </p>
                        <div className="space-y-1 mb-3">
                          {Array.from(selectedFiles).map((file, index) => (
                            <div key={index} className="text-xs text-blue-600">
                              📄 {file.name} ({formatFileSize(file.size)})
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={uploadSelectedFiles}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          开始上传
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 上传进度显示 */}
                  {uploadProgress.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {uploadProgress.map((progress, index) => (
                        <div key={index} className="bg-white border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              {progress.fileName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {progress.status === 'uploading' && '⏳ 上传中...'}
                              {progress.status === 'completed' && '✅ 完成'}
                              {progress.status === 'error' && '❌ 失败'}
                            </span>
                          </div>
                          {progress.status === 'uploading' && (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress.progress}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 文件列表 */}
                  <div className="space-y-2">
                    {/* 文件夹导航栏 */}
                    <div className="flex items-center justify-between bg-white border rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        {currentFolder && (
                          <button
                            onClick={goBack}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm transition-colors"
                          >
                            ← 返回
                          </button>
                        )}
                        <span className="text-sm font-medium text-gray-700">
                          {currentFolder ? `📁 ${currentFolder.name}` : '📁 健康数据文件夹'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">共 {files.length} 个项目</span>
                    </div>
                    
                    {filesLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                        <p className="text-gray-500 text-sm">加载文件列表中...</p>
                      </div>
                    ) : files.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                        </svg>
                        <p className="text-sm">健康数据文件夹为空</p>
                        <p className="text-xs mt-1">点击上传开始使用</p>
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {files.map((file) => (
                          <div key={file.id} className="bg-white border rounded-lg p-3 hover:shadow-sm transition-shadow">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  {file.folder ? (
                                    <button
                                      onClick={() => enterFolder(file)}
                                      className="flex items-center space-x-2 hover:text-blue-600 transition-colors"
                                    >
                                      <span>📁</span>
                                      <span className="text-sm font-medium text-gray-800 truncate">
                                        {file.name}
                                      </span>
                                    </button>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      <span>📄</span>
                                      <span className="text-sm font-medium text-gray-800 truncate">
                                        {file.name}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">
                                  {file.folder ? '文件夹' : formatFileSize(file.size)} • {new Date(file.lastModifiedDateTime).toLocaleDateString('zh-CN')}
                                </p>
                              </div>
                              {!file.folder && (
                                <div className="flex space-x-1 ml-2">
                                  <button
                                    onClick={() => downloadFile(file)}
                                    className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-lg text-xs transition-colors"
                                    title="下载"
                                  >
                                    ⬇️
                                  </button>
                                  <button
                                    onClick={() => window.open(file.webUrl, '_blank')}
                                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-2 rounded-lg text-xs transition-colors"
                                    title="在线查看"
                                  >
                                    👁️
                                  </button>
                                  <button
                                    onClick={() => deleteFile(file)}
                                    className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg text-xs transition-colors"
                                    title="删除"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 简化的导航提示 */}
                  <div className="mt-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">🔒 安全访问模式</h4>
                      <p className="text-blue-700 text-sm">
                        为了保护您的数据安全，此应用只能访问 <strong>healthcalendar</strong> 文件夹及其子文件夹。
                        所有健康相关的文件都会安全地存储在这个专用文件夹中。
                      </p>
                      {currentFolder && currentFolder.id !== healthCalendarFolder?.id && (
                        <div className="mt-2 p-2 bg-white rounded text-sm">
                          <span className="text-gray-600">当前位置：</span>
                          <span className="font-medium text-gray-800">📂 {currentFolder.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 授权范围信息 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">授权范围</h3>
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      读取用户资料
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      访问日历数据
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      <span>访问文件存储（仅健康文件夹）</span>
                    </div>
                  </div>
                </div>

                {/* 退出登录按钮 */}
                <button
                  onClick={logout}
                  disabled={loading}
                  className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      退出中...
                    </>
                  ) : (
                    '退出登录'
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="mb-6">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">登录您的 Microsoft 账户</h2>
                  <p className="text-gray-600 text-sm">
                    使用您的 Microsoft 账户登录以访问健康日历功能
                  </p>
                </div>

                <button
                  onClick={login}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      登录中...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 12.5v-.5h-11v3h6.44c-.277 1.48-1.97 3-4.44 3-2.76 0-5-2.24-5-5s2.24-5 5-5c1.36 0 2.59.55 3.5 1.43l2.12-2.12C18.87 5.33 16.64 4.5 14.498 4.5c-4.41 0-8 3.59-8 8s3.59 8 8 8c4.08 0 7.75-3.13 7.75-8z"/>
                      </svg>
                      使用 Microsoft 账户登录
                    </>
                  )}
                </button>

                <div className="mt-6 text-xs text-gray-500 text-center">
                  <p>登录即表示您同意我们的服务条款和隐私政策</p>
                  <p className="mt-2">
                    遇到问题？查看 
                    <button 
                      onClick={() => window.open('https://github.com/your-repo/healthcalendar/blob/main/TROUBLESHOOTING.md', '_blank')}
                      className="text-blue-500 hover:underline mx-1"
                    >
                      故障排除指南
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 功能说明 */}
        <div className="max-w-4xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">日历同步</h3>
            <p className="text-gray-600 text-sm">与您的 Microsoft 日历同步，管理健康相关的预约和提醒</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">健康记录</h3>
            <p className="text-gray-600 text-sm">安全地存储和管理您的健康数据和医疗记录</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">智能提醒</h3>
            <p className="text-gray-600 text-sm">基于您的健康计划设置个性化的提醒和通知</p>
          </div>
        </div>
      </div>
    </div>
  )
}
