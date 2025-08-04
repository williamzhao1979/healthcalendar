'use client'

import React, { useState, useEffect } from 'react'
import { 
  X, 
  CloudOff, 
  AlertTriangle, 
  RefreshCw, 
  Shield,
  HardDrive,
  Wifi,
  WifiOff,
  Smartphone,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'
import { OneDriveSyncState, OneDriveSyncActions } from '../hooks/useOneDriveSync'

interface OneDriveDisconnectModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  oneDriveState: OneDriveSyncState
  oneDriveActions: OneDriveSyncActions
  currentUser: any
}

interface DisconnectStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  icon: React.ComponentType<any>
}

export const OneDriveDisconnectModal: React.FC<OneDriveDisconnectModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  oneDriveState,
  oneDriveActions,
  currentUser
}) => {
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [disconnectSteps, setDisconnectSteps] = useState<DisconnectStep[]>([])
  const [showDetails, setShowDetails] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [disconnectProgress, setDisconnectProgress] = useState(0)

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

  // 初始化断开连接步骤
  useEffect(() => {
    setDisconnectSteps([
      {
        id: 'prepare',
        title: '准备断开连接',
        description: '正在准备安全断开OneDrive连接...',
        status: 'pending',
        icon: Shield
      },
      {
        id: 'logout',
        title: '注销Microsoft账户',
        description: '正在从Microsoft服务注销...',
        status: 'pending',
        icon: WifiOff
      },
      {
        id: 'cleanup',
        title: '清理本地缓存',
        description: '正在清理OneDrive相关的本地缓存...',
        status: 'pending',
        icon: HardDrive
      },
      {
        id: 'complete',
        title: '断开完成',
        description: 'OneDrive同步已安全断开',
        status: 'pending',
        icon: CheckCircle
      }
    ])
    setDisconnectProgress(0)
  }, [])

  // 更新步骤状态
  const updateStepStatus = (stepId: string, status: DisconnectStep['status']) => {
    setDisconnectSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ))
    
    // 更新进度
    const newSteps = disconnectSteps.map(step => 
      step.id === stepId ? { ...step, status } : step
    )
    const completedSteps = newSteps.filter(step => step.status === 'completed').length
    setDisconnectProgress((completedSteps / newSteps.length) * 100)
  }

  // 处理断开连接确认
  const handleConfirmDisconnect = async () => {
    setIsDisconnecting(true)
    setDisconnectProgress(0)

    try {
      // 步骤1: 准备断开
      updateStepStatus('prepare', 'in_progress')
      await new Promise(resolve => setTimeout(resolve, 500))
      updateStepStatus('prepare', 'completed')

      // 步骤2: 注销Microsoft账户
      updateStepStatus('logout', 'in_progress')
      await oneDriveActions.disconnect()
      updateStepStatus('logout', 'completed')

      // 步骤3: 清理本地缓存
      updateStepStatus('cleanup', 'in_progress')
      await new Promise(resolve => setTimeout(resolve, 800))
      updateStepStatus('cleanup', 'completed')

      // 步骤4: 完成
      updateStepStatus('complete', 'in_progress')
      await new Promise(resolve => setTimeout(resolve, 300))
      updateStepStatus('complete', 'completed')
      setDisconnectProgress(100)

      // 延迟后调用确认回调并关闭模态框
      setTimeout(() => {
        onConfirm()
        onClose()
      }, 1000)

    } catch (error) {
      console.error('断开OneDrive连接失败:', error)
      // 如果断开失败，标记当前步骤为错误状态
      const currentStep = disconnectSteps.find(step => step.status === 'in_progress')
      if (currentStep) {
        updateStepStatus(currentStep.id, 'pending')
      }
    } finally {
      setIsDisconnecting(false)
    }
  }

  // 获取步骤图标
  const getStepIcon = (step: DisconnectStep) => {
    const IconComponent = step.icon
    
    if (step.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else if (step.status === 'in_progress') {
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
    } else if (step.status === 'skipped') {
      return <XCircle className="w-5 h-5 text-gray-400" />
    } else {
      return <IconComponent className="w-5 h-5 text-gray-400" />
    }
  }

  // 获取当前连接状态信息
  const getConnectionInfo = () => {
    if (oneDriveState.userInfo) {
      return {
        username: oneDriveState.userInfo.username || oneDriveState.userInfo.displayName || '未知用户',
        email: oneDriveState.userInfo.mail || oneDriveState.userInfo.userPrincipalName || '',
        lastSync: oneDriveState.lastSyncTime ? new Date(oneDriveState.lastSyncTime).toLocaleString('zh-CN') : '从未同步'
      }
    }
    return null
  }

  if (!isOpen) return null

  const connectionInfo = getConnectionInfo()

  return (
    <div className="fixed inset-0 z-[60] flex">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" 
        onClick={!isDisconnecting ? onClose : undefined}
      ></div>
      
      {/* 模态框内容 */}
      <div className="relative flex items-center justify-center min-h-screen p-4 w-full">
        <div className="glass-morphism rounded-3xl p-6 w-full max-w-md transform transition-all scale-100 opacity-100">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
                <CloudOff className="text-white w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">断开OneDrive同步</h3>
                <p className="text-sm text-gray-600">
                  {isDisconnecting ? '正在断开连接...' : '确认断开连接'}
                </p>
              </div>
            </div>
            {!isDisconnecting && (
              <button 
                onClick={onClose} 
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="text-gray-500 w-4 h-4" />
              </button>
            )}
          </div>

          {/* 当前连接信息 */}
          {connectionInfo && !isDisconnecting && (
            <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-200">
              <div className="flex items-start space-x-3">
                <Wifi className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">当前连接信息</h4>
                  <div className="space-y-1 text-xs text-blue-700">
                    <div><strong>账户:</strong> {connectionInfo.username}</div>
                    {connectionInfo.email && (
                      <div><strong>邮箱:</strong> {connectionInfo.email}</div>
                    )}
                    <div><strong>最后同步:</strong> {connectionInfo.lastSync}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 警告信息 */}
          {!isDisconnecting && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-2xl border border-yellow-200">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-yellow-800 mb-2">断开连接说明</h4>
                  <div className="text-xs text-yellow-700 space-y-2">
                    <div className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>您的本地数据将保留，不会被删除</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>断开后将无法自动同步到OneDrive</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>可以随时重新连接恢复同步功能</span>
                    </div>
                    {isMobile && (
                      <div className="flex items-start space-x-2 mt-2 pt-2 border-t border-yellow-300">
                        <Smartphone className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <span className="text-yellow-600">移动设备：断开后需要重新授权才能连接</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 断开连接进度 */}
          {isDisconnecting && (
            <>
              {/* 进度条 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">断开进度</span>
                  <span className="text-sm text-gray-500">{Math.round(disconnectProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${disconnectProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* 断开连接步骤 */}
              <div className="mb-6 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">断开步骤</h4>
                {disconnectSteps.map((step, index) => (
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
            </>
          )}

          {/* 详细信息切换 */}
          {!isDisconnecting && (
            <div className="mb-6">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <Info className="w-4 h-4" />
                <span>{showDetails ? '隐藏' : '显示'}详细信息</span>
              </button>
              
              {showDetails && (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-2">
                  <div><strong>断开连接将:</strong></div>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>注销当前Microsoft账户会话</li>
                    <li>清除OneDrive访问令牌</li>
                    <li>删除云端同步缓存</li>
                    <li>停止自动备份功能</li>
                  </ul>
                  <div className="pt-2 border-t border-gray-200">
                    <strong>不会影响:</strong>
                  </div>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>您的本地健康记录数据</li>
                    <li>应用的其他功能</li>
                    <li>OneDrive中已备份的数据</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex space-x-3">
            {!isDisconnecting ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 text-gray-600 font-medium hover:text-gray-800 transition-colors bg-gray-100 hover:bg-gray-200 rounded-2xl"
                >
                  取消
                </button>
                
                <button
                  onClick={handleConfirmDisconnect}
                  className="flex-1 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold rounded-2xl hover:from-red-600 hover:to-orange-600 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
                >
                  <CloudOff className="w-4 h-4" />
                  <span>确认断开</span>
                </button>
              </>
            ) : (
              <div className="flex-1 py-3 bg-gray-200 text-gray-500 font-medium rounded-2xl cursor-not-allowed flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>正在断开连接...</span>
              </div>
            )}
          </div>

          {/* 底部提示 */}
          {!isDisconnecting && (
            <div className="mt-4 p-3 bg-gray-50 rounded-2xl">
              <p className="text-xs text-gray-600 text-center">
                💡 断开连接后，您可以随时重新启用OneDrive同步功能
              </p>
            </div>
          )}

          {/* 断开完成提示 */}
          {isDisconnecting && disconnectProgress === 100 && (
            <div className="mt-4 p-3 bg-green-50 rounded-2xl border border-green-200">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-700">OneDrive同步已安全断开</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OneDriveDisconnectModal
