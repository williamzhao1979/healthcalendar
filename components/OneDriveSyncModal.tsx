'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  X, 
  Cloud, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  Smartphone,
  Lock,
  Download,
  Upload,
  Users,
  FileText,
  Activity
} from 'lucide-react'
import { OneDriveSyncState, OneDriveSyncActions, formatSyncTime } from '../hooks/useOneDriveSync'

interface OneDriveSyncModalProps {
  isOpen: boolean
  onClose: () => void
  oneDriveState: OneDriveSyncState
  oneDriveActions: OneDriveSyncActions
  currentUser: any
  onSyncComplete?: () => void
}

interface SyncStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  icon: React.ComponentType<any>
}

export const OneDriveSyncModal: React.FC<OneDriveSyncModalProps> = ({
  isOpen,
  onClose,
  oneDriveState,
  oneDriveActions,
  currentUser,
  onSyncComplete
}) => {
  const [syncSteps, setSyncSteps] = useState<SyncStep[]>([])
  const [isInitialSetup, setIsInitialSetup] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent)
      const isSmallScreen = window.innerWidth <= 768
      setIsMobile(isMobileDevice || isSmallScreen)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 初始化同步步骤
  useEffect(() => {
    if (!oneDriveState.isAuthenticated) {
      setIsInitialSetup(true)
      setSyncSteps([
        {
          id: 'connect',
          title: '连接OneDrive',
          description: isMobile ? '在移动设备上连接到Microsoft OneDrive' : '连接到您的Microsoft OneDrive账户',
          status: 'pending',
          icon: Cloud
        },
        {
          id: 'verify',
          title: '验证账户',
          description: '验证您的Microsoft账户权限',
          status: 'pending',
          icon: Lock
        },
        {
          id: 'setup',
          title: '设置云端文件夹',
          description: '在OneDrive中创建健康日历专用文件夹',
          status: 'pending',
          icon: FileText
        },
        {
          id: 'sync',
          title: '同步数据',
          description: '将本地数据同步到云端',
          status: 'pending',
          icon: RefreshCw
        }
      ])
    } else {
      setIsInitialSetup(false)
      setSyncSteps([
        // {
        //   id: 'users',
        //   title: '同步用户数据',
        //   description: '正在同步用户信息...',
        //   status: 'pending',
        //   icon: Users
        // },
        // {
        //   id: 'meal',
        //   title: '同步饮食记录',
        //   description: '正在同步饮食数据...',
        //   status: 'pending',
        //   icon: Download
        // },
        // {
        //   id: 'stool',
        //   title: '同步排便记录',
        //   description: '正在同步排便数据...',
        //   status: 'pending',
        //   icon: Download
        // },
        // {
        //   id: 'period',
        //   title: '同步生理记录',
        //   description: '正在同步生理数据...',
        //   status: 'pending',
        //   icon: Download
        // },
        // {
        //   id: 'records',
        //   title: '同步记录',
        //   description: '正在同步个人记录...',
        //   status: 'pending',
        //   icon: Download
        // }
        {
          id: 'sync',
          title: '同步数据',
          description: '将本地数据同步到云端',
          status: 'pending',
          icon: RefreshCw
        }
      ])
    }
  }, [oneDriveState.isAuthenticated, isMobile])

  // 更新步骤状态
  const updateStepStatus = useCallback((stepId: string, status: SyncStep['status']) => {
    setSyncSteps(prev => {
      const updatedSteps = prev.map(step => 
        step.id === stepId ? { ...step, status } : step
      )
      
      // 更新进度 - 使用更新后的步骤数据
      const completedSteps = updatedSteps.filter(step => step.status === 'completed').length
      console.log('已完成步骤:', completedSteps, '总步骤:', updatedSteps.length)
      console.log('updatedSteps:', updatedSteps)
      setSyncProgress((completedSteps / updatedSteps.length) * 100)
      
      return updatedSteps
    })
  }, [])

  // 处理同步
  const handleSync = useCallback(async () => {
    if (!currentUser) return

    try {
      if (isInitialSetup) {
        // 初始设置时的完整同步
        await Promise.all([
          oneDriveActions.syncIDBOneDriveUsers(),
          oneDriveActions.syncIDBOneDriveMyRecords(),
          oneDriveActions.syncIDBOneDriveStoolRecords(),
          oneDriveActions.syncIDBOneDrivePeriodRecords(),
          oneDriveActions.syncIDBOneDriveMealRecords(),
        ])
        updateStepStatus('sync', 'completed')
      } else {
        // 常规同步流程
        updateStepStatus('sync', 'in_progress')
        setSyncProgress(0)
        await Promise.all([
          oneDriveActions.syncIDBOneDriveUsers(),
          oneDriveActions.syncIDBOneDriveMyRecords(),
          oneDriveActions.syncIDBOneDriveStoolRecords(),
          oneDriveActions.syncIDBOneDrivePeriodRecords(),
          oneDriveActions.syncIDBOneDriveMealRecords(),
        ])
        updateStepStatus('sync', 'completed')
      }
      
      setSyncProgress(100)
      
      // 同步完成后调用回调函数刷新HealthCalendar的数据
      if (onSyncComplete) {
        onSyncComplete()
      }
    } catch (error) {
      console.error('同步失败:', error)
      updateStepStatus('sync', 'error')
    }
  }, [currentUser, isInitialSetup, oneDriveActions, updateStepStatus, onSyncComplete])

  // 监听同步状态变化
  useEffect(() => {
    if (oneDriveState.isConnecting && isInitialSetup) {
      updateStepStatus('connect', 'in_progress')
    }
    
    if (oneDriveState.isAuthenticated && isInitialSetup) {
      updateStepStatus('connect', 'completed')
      updateStepStatus('verify', 'completed')
      updateStepStatus('setup', 'completed')
      updateStepStatus('sync', 'in_progress')
      
      // 认证完成后自动开始同步
      handleSync()
    }

    if (oneDriveState.syncStatus === 'syncing') {
      updateStepStatus('sync', 'in_progress')
    }

    if (oneDriveState.syncStatus === 'success') {
      setSyncSteps(prev => {
        const updatedSteps = prev.map(step => ({ ...step, status: 'completed' as const }))
        const completedSteps = updatedSteps.filter(step => step.status === 'completed').length
        setSyncProgress((completedSteps / updatedSteps.length) * 100)
        return updatedSteps
      })
    }

    if (oneDriveState.error) {
      setSyncSteps(prev => {
        const updatedSteps = prev.map(step => 
          step.status === 'in_progress' ? { ...step, status: 'error' as const } : step
        )
        const completedSteps = updatedSteps.filter(step => step.status === 'completed').length
        setSyncProgress((completedSteps / updatedSteps.length) * 100)
        return updatedSteps
      })
    }
  }, [oneDriveState, isInitialSetup, updateStepStatus, handleSync])

  // 处理连接
  const handleConnect = async () => {
    try {
      updateStepStatus('connect', 'in_progress')
      await oneDriveActions.connect()
      
      // 检查连接状态
      await oneDriveActions.checkConnection()
      
      console.log('连接完成，认证状态:', oneDriveState.isAuthenticated)
      
    } catch (error) {
      console.error('连接失败:', error)
      updateStepStatus('connect', 'error')
    }
  }

  // 获取步骤图标
  const getStepIcon = (step: SyncStep) => {
    const IconComponent = step.icon
    
    if (step.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else if (step.status === 'error') {
      return <AlertCircle className="w-5 h-5 text-red-500" />
    } else if (step.status === 'in_progress') {
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
    } else {
      return <IconComponent className="w-5 h-5 text-gray-400" />
    }
  }

  // 获取连接状态指示器
  const getConnectionIndicator = () => {
    if (oneDriveState.isAuthenticated) {
      return (
        <div className="flex items-center space-x-2 text-green-600">
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">已连接</span>
        </div>
      )
    } else if (oneDriveState.isConnecting) {
      return (
        <div className="flex items-center space-x-2 text-blue-600">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">连接中...</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center space-x-2 text-gray-500">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">未连接</span>
        </div>
      )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* 模态框内容 */}
      <div className="relative flex items-center justify-center min-h-screen p-4 w-full">
        <div className="glass-morphism rounded-3xl p-6 w-full max-w-md transform transition-all scale-100 opacity-100">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                <Cloud className="text-white w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">OneDrive同步</h3>
                <p className="text-sm text-gray-600">
                  {isInitialSetup ? '首次设置' : '数据同步'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X className="text-gray-500 w-4 h-4" />
            </button>
          </div>

          {/* 移动设备提示 */}
          {/* {isMobile && !oneDriveState.isAuthenticated && (
            <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-200">
              <div className="flex items-start space-x-3">
                <Smartphone className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-800 mb-1">移动设备同步提示</h4>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    在移动设备上，OneDrive同步需要HTTPS连接。如果遇到连接问题，请确保：
                  </p>
                  <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
                    <li>使用HTTPS访问应用</li>
                    <li>允许浏览器访问Microsoft服务</li>
                    <li>网络连接稳定</li>
                  </ul>
                </div>
              </div>
            </div>
          )} */}

          {/* 连接状态 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">连接状态</div>
                {getConnectionIndicator()}
              </div>
              {oneDriveState.userInfo && (
                <div className="text-right">
                  <div className="text-xs text-gray-500">已登录账户</div>
                  <div className="text-sm font-medium text-gray-700">
                    {oneDriveState.userInfo.username || oneDriveState.userInfo.displayName}
                  </div>
                </div>
              )}
            </div>
            {oneDriveState.lastSyncTime && (
              <div className="mt-2 text-xs text-gray-500">
                最后同步: {formatSyncTime(oneDriveState.lastSyncTime)}
              </div>
            )}
          </div>

          {/* 进度条 */}
          {(oneDriveState.isConnecting || oneDriveState.syncStatus === 'syncing' || syncProgress > 0) && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">同步进度</span>
                <span className="text-sm text-gray-500">{Math.round(syncProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${syncProgress}%` }}
                ></div>
              </div>
            </div>
          )}




          {/* 操作按钮 */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-gray-600 font-medium hover:text-gray-800 transition-colors bg-gray-100 hover:bg-gray-200 rounded-2xl"
            >
              关闭
            </button>
            
            {!oneDriveState.isAuthenticated ? (
              <button
                onClick={handleConnect}
                disabled={oneDriveState.isConnecting}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-2xl hover:from-blue-600 hover:to-cyan-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg flex items-center justify-center space-x-2"
              >
                {oneDriveState.isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>连接中...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    <span>连接OneDrive</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleSync}
                disabled={oneDriveState.syncStatus === 'syncing' || !currentUser}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg flex items-center justify-center space-x-2"
              >
                {oneDriveState.syncStatus === 'syncing' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>同步中...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>立即同步</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* 提示信息 */}
          <div className="mt-4 p-3 bg-blue-50 rounded-2xl">
            <p className="text-xs text-blue-600 text-center">
              💡 {isInitialSetup 
                ? '首次设置完成后，您的数据将自动备份到OneDrive' 
                : '同步完成后，您的数据将在所有设备间保持同步'
              }
            </p>
          </div>

          {/* 同步步骤 */}
          <div className="mb-6 space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              {isInitialSetup ? '设置步骤' : '同步项目'}
            </h4>
            {syncSteps.map((step, index) => (
              <div key={step.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getStepIcon(step)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{step.title}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{step.description}</div>
                </div>
              </div>
            ))}
          </div>
          
        </div>
      </div>
    </div>
  )
}