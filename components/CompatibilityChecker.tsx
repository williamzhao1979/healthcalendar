'use client'

import React from 'react'
import MobileCompatibilityUtils from '../lib/mobileCompatibility'
import { CheckCircle, AlertTriangle, X, Smartphone, Monitor } from 'lucide-react'

export default function CompatibilityChecker() {
  const capabilities = MobileCompatibilityUtils.checkBrowserCapabilities()
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
  )

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <X className="w-4 h-4 text-red-500" />
    )
  }

  const getOverallStatus = () => {
    const criticalIssues = !capabilities.hasCrypto || 
                          (!capabilities.hasLocalStorage && !capabilities.hasSessionStorage)
    
    if (criticalIssues) {
      return { status: 'error', color: 'red', text: '不兼容' }
    } else if (!capabilities.isSecureContext || (isMobile && !capabilities.supportsPopups)) {
      return { status: 'warning', color: 'yellow', text: '部分兼容' }
    } else {
      return { status: 'success', color: 'green', text: '完全兼容' }
    }
  }

  const overallStatus = getOverallStatus()

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        {isMobile ? <Smartphone className="w-5 h-5 mr-2" /> : <Monitor className="w-5 h-5 mr-2" />}
        浏览器兼容性检查
        <span className={`ml-2 px-2 py-1 text-xs rounded-full bg-${overallStatus.color}-100 text-${overallStatus.color}-700`}>
          {overallStatus.text}
        </span>
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">设备类型:</span>
          <span className="text-sm font-medium">
            {isMobile ? '移动设备' : '桌面设备'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">加密API支持:</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon(capabilities.hasCrypto)}
            <span className="text-sm">{capabilities.hasCrypto ? '支持' : '不支持'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">本地存储:</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon(capabilities.hasLocalStorage)}
            <span className="text-sm">{capabilities.hasLocalStorage ? '支持' : '不支持'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">会话存储:</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon(capabilities.hasSessionStorage)}
            <span className="text-sm">{capabilities.hasSessionStorage ? '支持' : '不支持'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">安全上下文:</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon(capabilities.isSecureContext)}
            <span className="text-sm">{capabilities.isSecureContext ? 'HTTPS' : 'HTTP'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">弹窗支持:</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon(capabilities.supportsPopups)}
            <span className="text-sm">{capabilities.supportsPopups ? '支持' : '可能受限'}</span>
          </div>
        </div>
      </div>

      {/* 建议和说明 */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">兼容性说明:</h4>
        <div className="text-xs text-gray-600 space-y-1">
          {!capabilities.hasCrypto && (
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
              <span>加密API不可用，请使用支持WebCrypto的现代浏览器</span>
            </div>
          )}
          
          {!capabilities.isSecureContext && (
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
              <span>建议使用HTTPS访问以获得最佳兼容性</span>
            </div>
          )}
          
          {isMobile && (
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>移动端将使用重定向登录方式</span>
            </div>
          )}
          
          {overallStatus.status === 'success' && (
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
              <span>浏览器完全支持OneDrive同步功能</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
