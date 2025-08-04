'use client'

import React from 'react'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { AlertTriangle, RefreshCw, ExternalLink, Shield, Wifi, Settings, Chrome } from 'lucide-react'
import { MobileCompatibilityUtils } from '../lib/mobileCompatibility'

interface MSALErrorRecoveryProps {
  error: Error | null
  onRetry?: () => void
  onClearAuth?: () => void
  className?: string
}

export const MSALErrorRecovery: React.FC<MSALErrorRecoveryProps> = ({
  error,
  onRetry,
  onClearAuth,
  className
}) => {
  if (!error) return null

  const deviceInfo = typeof window !== 'undefined' 
    ? MobileCompatibilityUtils.detectDevice() 
    : { isAndroidEdge: false, isMobile: false, browserName: 'unknown' }

  const errorMessage = error.message.toLowerCase()
  const errorTips = MobileCompatibilityUtils.getOneDriveErrorTips(error)

  // 检测错误类型
  const isAuthError = errorMessage.includes('auth') || 
                     errorMessage.includes('login') || 
                     errorMessage.includes('token') ||
                     errorMessage.includes('msal')

  const isNetworkError = errorMessage.includes('network') || 
                        errorMessage.includes('fetch') || 
                        errorMessage.includes('timeout')

  const isCryptoError = errorMessage.includes('crypto') || 
                       errorMessage.includes('cryptography')

  const isRedirectError = errorMessage.includes('redirect') || 
                         errorMessage.includes('navigation') ||
                         errorMessage.includes('popup')

  const isAndroidEdgeSpecific = deviceInfo.isAndroidEdge && (
    errorMessage.includes('interaction_required') ||
    errorMessage.includes('silent_sso') ||
    errorMessage.includes('token_renewal')
  )

  const getErrorIcon = () => {
    if (isNetworkError) return <Wifi className="h-4 w-4" />
    if (isCryptoError) return <Shield className="h-4 w-4" />
    if (isRedirectError) return <ExternalLink className="h-4 w-4" />
    return <AlertTriangle className="h-4 w-4" />
  }

  const getActionButtons = () => {
    const buttons = []

    // 重试按钮
    if (onRetry) {
      buttons.push(
        <Button
          key="retry"
          onClick={onRetry}
          variant="default"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          重新尝试
        </Button>
      )
    }

    // 清理认证状态按钮
    if (onClearAuth && isAuthError) {
      buttons.push(
        <Button
          key="clear"
          onClick={onClearAuth}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          清理认证数据
        </Button>
      )
    }

    // Mobile特定按钮
    if (deviceInfo.isAndroidEdge) {
      buttons.push(
        <Button
          key="chrome"
          onClick={() => {
            // 尝试在Chrome中打开
            const currentUrl = window.location.href
            const chromeUrl = `googlechrome://navigate?url=${encodeURIComponent(currentUrl)}`
            window.location.href = chromeUrl
            
            // 备用方案：显示提示
            setTimeout(() => {
              alert('如果Chrome浏览器没有自动打开，请手动复制地址到Chrome浏览器中访问')
            }, 1000)
          }}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Chrome className="h-4 w-4" />
          在Chrome中打开
        </Button>
      )
    }

    // 基础功能测试按钮
    buttons.push(
      <Button
        key="basic"
        onClick={() => window.location.href = '/basic-test'}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <ExternalLink className="h-4 w-4" />
        基础功能测试
      </Button>
    )

    return buttons
  }

  return (
    <Alert className={className} variant="destructive">
      {getErrorIcon()}
      <AlertTitle className="flex items-center gap-2">
        {errorTips.title}
        {deviceInfo.isAndroidEdge && (
          <Badge variant="outline" className="text-xs">
            Mobile
          </Badge>
        )}
      </AlertTitle>
      
      <AlertDescription className="space-y-4">
        <div>
          <p className="font-semibold text-sm">问题描述：</p>
          <p className="text-sm">{errorTips.message}</p>
        </div>

        <div>
          <p className="font-semibold text-sm">解决步骤：</p>
          <ol className="text-sm space-y-1 ml-4">
            {errorTips.solutions.map((solution, index) => (
              <li key={index} className="list-decimal">{solution}</li>
            ))}
          </ol>
        </div>

        {/* Mobile特定提示 */}
        {isAndroidEdgeSpecific && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold">Mobile 特别提示：</p>
                <p>这是 Mobile 浏览器的已知兼容性问题。</p>
              </div>
            </div>
          </div>
        )}

        {/* 网络错误特定提示 */}
        {isNetworkError && deviceInfo.isMobile && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <Wifi className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold">移动网络提示：</p>
                <p>检测到您正在使用移动设备。建议连接到稳定的 WiFi 网络进行 OneDrive 同步。</p>
              </div>
            </div>
          </div>
        )}

        {/* 加密功能错误提示 */}
        {isCryptoError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <Shield className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-semibold">安全功能不可用：</p>
                <p>您的浏览器不支持必要的加密功能。请确保使用 HTTPS 连接，并尝试更新浏览器到最新版本。</p>
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-2 pt-2">
          {getActionButtons()}
        </div>

        {/* 技术详情（开发环境） */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs">
            <summary className="cursor-pointer font-semibold text-gray-600">
              技术详情 (点击展开)
            </summary>
            <div className="mt-2 p-2 bg-gray-100 rounded font-mono text-xs overflow-auto max-h-32">
              <div><strong>错误消息：</strong> {error.message}</div>
              <div><strong>浏览器：</strong> {deviceInfo.browserName}</div>
              <div><strong>设备类型：</strong> {deviceInfo.isMobile ? '移动设备' : '桌面设备'}</div>
              <div><strong>Mobile：</strong> {deviceInfo.isAndroidEdge ? '是' : '否'}</div>
              <div><strong>用户代理：</strong> {navigator.userAgent}</div>
            </div>
          </details>
        )}
      </AlertDescription>
    </Alert>
  )
}

export default MSALErrorRecovery