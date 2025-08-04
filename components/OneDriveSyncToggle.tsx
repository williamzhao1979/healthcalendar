'use client'

import React, { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Cloud, 
  CloudOff,
  Wifi,
  WifiOff,
  Smartphone,
  ExternalLink
} from 'lucide-react'
import { OneDriveSyncState, OneDriveSyncActions, formatSyncTime } from '../hooks/useOneDriveSync'
import MobileCompatibilityUtils from '../lib/mobileCompatibility'

interface OneDriveSyncToggleProps {
  oneDriveState: OneDriveSyncState
  oneDriveActions: OneDriveSyncActions
  currentUser: any
  onOpenModal?: () => void
  onOpenDisconnectModal?: () => void
  className?: string
}

export const OneDriveSyncToggle: React.FC<OneDriveSyncToggleProps> = ({
  oneDriveState,
  oneDriveActions,
  currentUser,
  onOpenModal,
  onOpenDisconnectModal,
  className = ''
}) => {
  const [isToggling, setIsToggling] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)

  useEffect(() => {
    setDeviceInfo(MobileCompatibilityUtils.detectDevice())
  }, [])

  // 处理同步开关切换
  const handleToggle = async (enabled: boolean) => {
    if (isToggling) return
    
    setIsToggling(true)
    
    try {
      if (enabled) {
        // 启用同步
        if (onOpenModal) {
          onOpenModal()
        } else {
          await oneDriveActions.connect()
          await oneDriveActions.checkConnection()
          
          // 如果连接成功，启动数据同步
          if (oneDriveState.isAuthenticated && currentUser) {
            await Promise.all([
              oneDriveActions.syncIDBOneDriveUsers(),
              oneDriveActions.syncIDBOneDriveMyRecords(),
              oneDriveActions.syncIDBOneDriveStoolRecords(),
            ])
          }
        }
      } else {
        // 禁用同步 - 显示确认对话框
        if (onOpenDisconnectModal) {
          onOpenDisconnectModal()
        } else {
          setShowDisconnectModal(true)
        }
      }
    } catch (error) {
      console.error('同步开关操作失败:', error)
    } finally {
      setIsToggling(false)
    }
  }

  // 处理断开连接确认
  const handleDisconnectConfirm = () => {
    setShowDisconnectModal(false)
    // 这里不需要做额外操作，因为OneDriveDisconnectModal内部会调用disconnect
  }

  // 处理断开连接取消
  const handleDisconnectCancel = () => {
    setShowDisconnectModal(false)
    // 取消时不做任何操作，保持连接状态
  }

  // 获取开关状态
  const getSwitchState = () => {
    if (isToggling || oneDriveState.isConnecting) {
      return 'loading'
    }
    
    if (oneDriveState.error) {
      return 'error'
    }
    
    if (oneDriveState.isAuthenticated) {
      return 'connected'
    }
    
    return 'disconnected'
  }

  // 获取状态图标
  const getStatusIcon = () => {
    const state = getSwitchState()
    
    switch (state) {
      case 'loading':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return deviceInfo?.isMobile ? 
          <Smartphone className="w-4 h-4 text-gray-400" /> :
          <Cloud className="w-4 h-4 text-gray-400" />
    }
  }

  // 获取状态文本
  const getStatusText = () => {
    const state = getSwitchState()
    
    switch (state) {
      case 'loading':
        return isToggling ? '切换中...' : '连接中...'
      case 'connected':
        return '已连接'
      case 'error':
        return '连接失败'
      default:
        return '未连接'
    }
  }

  // 获取详细信息
  const getDetailText = () => {
    if (oneDriveState.error) {
      const errorTips = MobileCompatibilityUtils.getOneDriveErrorTips(new Error(oneDriveState.error))
      return errorTips.message
    }
    
    if (oneDriveState.isAuthenticated) {
      if (oneDriveState.userInfo) {
        const userName = oneDriveState.userInfo.username || oneDriveState.userInfo.displayName
        const syncTime = formatSyncTime(oneDriveState.lastSyncTime)
        return `${userName} · 最后同步: ${syncTime}`
      }
      return `已连接 · 最后同步: ${formatSyncTime(oneDriveState.lastSyncTime)}`
    }
    
    if (deviceInfo?.isMobile) {
      return '移动设备云端同步'
    }
    
    return '自动备份到OneDrive云端'
  }

  // 获取网络状态指示器
  const getNetworkIndicator = () => {
    if (oneDriveState.isAuthenticated) {
      return <Wifi className="w-3 h-3 text-green-500" />
    }
    return <WifiOff className="w-3 h-3 text-gray-400" />
  }

  const switchState = getSwitchState()
  const isDisabled = isToggling || oneDriveState.isConnecting

  return (
    <div className={`relative ${className}`}>
      {/* 主要同步控件 */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            {getStatusIcon()}
            <span className="text-sm font-medium text-gray-900">OneDrive同步</span>
            {getNetworkIndicator()}
            {oneDriveState.syncStatus === 'syncing' && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-blue-600">同步中</span>
              </div>
            )}
          </div>
          
          <div className="text-xs text-gray-500 leading-relaxed">
            {getDetailText()}
          </div>
          
          {/* 移动设备额外提示 */}
          {deviceInfo?.isMobile && !oneDriveState.isAuthenticated && (
            <div className="mt-1 text-xs text-amber-600 flex items-center space-x-1">
              <Smartphone className="w-3 h-3" />
              <span>需要HTTPS连接</span>
            </div>
          )}
        </div>
        
        {/* 开关控件 */}
        <div className="flex items-center space-x-3">
          {/* 详情按钮（可选） */}
          {onOpenModal && (
            <button
              onClick={onOpenModal}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="查看详细状态"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
          
          {/* 主开关 */}
          <label 
            className="relative inline-flex items-center cursor-pointer group"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={oneDriveState.isAuthenticated}
              onChange={(e) => handleToggle(e.target.checked)}
              disabled={isDisabled}
            />
            <div className={`
              w-11 h-6 rounded-full peer transition-all duration-300 ease-in-out
              ${switchState === 'connected' ? 'bg-green-500' : 
                switchState === 'error' ? 'bg-red-400' :
                switchState === 'loading' ? 'bg-blue-400' : 'bg-gray-300'}
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              peer-focus:outline-none peer-focus:ring-4 
              ${switchState === 'connected' ? 'peer-focus:ring-green-300' :
                switchState === 'error' ? 'peer-focus:ring-red-300' :
                'peer-focus:ring-blue-300'}
              after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
              after:bg-white after:rounded-full after:h-5 after:w-5 
              after:transition-all after:duration-300 after:ease-in-out
              ${oneDriveState.isAuthenticated ? 'after:translate-x-5' : 'after:translate-x-0'}
              ${switchState === 'loading' ? 'after:animate-pulse' : ''}
            `}>
              {/* 开关内部图标 */}
              <div className={`
                absolute inset-0 flex items-center justify-center transition-opacity duration-300
                ${switchState === 'loading' ? 'opacity-100' : 'opacity-0'}
              `}>
                <RefreshCw className="w-3 h-3 text-white animate-spin" />
              </div>
            </div>
          </label>
        </div>
      </div>
      
      {/* 错误提示 */}
      {oneDriveState.error && (
        <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-red-700">
              <div className="font-medium">连接失败</div>
              <div className="mt-1">{oneDriveState.error}</div>
              {deviceInfo?.isMobile && (
                <div className="mt-1 text-red-600">
                  💡 移动设备：请确保使用HTTPS连接并允许弹窗
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* 成功提示 */}
      {oneDriveState.syncStatus === 'success' && oneDriveState.lastSyncTime && (
        <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-green-700">
              <div className="font-medium">同步成功</div>
              <div className="mt-1">数据已同步到OneDrive云端</div>
            </div>
          </div>
        </div>
      )}
      
      {/* 悬停提示 */}
      {showTooltip && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 w-64">
          <div className="font-medium mb-1">{getStatusText()}</div>
          <div className="opacity-90">
            {oneDriveState.isAuthenticated ? 
              '点击关闭可停止OneDrive同步，您的本地数据将保留' :
              '点击开启可将数据自动备份到OneDrive云端，实现多设备同步'
            }
          </div>
          {deviceInfo?.isMobile && (
            <div className="mt-2 pt-2 border-t border-gray-700 opacity-75">
              移动设备需要HTTPS连接才能使用OneDrive同步
            </div>
          )}
        </div>
      )}
    </div>
  )
}