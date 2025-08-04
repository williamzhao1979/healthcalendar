'use client'

import React, { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Badge } from './ui/badge'
import { RefreshCw, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { MobileCompatibilityUtils } from '../lib/mobileCompatibility'
import { microsoftAuth } from '../lib/microsoftAuth'

interface MSALRedirectHandlerProps {
  children: React.ReactNode
}

export const MSALRedirectHandler: React.FC<MSALRedirectHandlerProps> = ({ children }) => {
  const [isHandlingRedirect, setIsHandlingRedirect] = useState(false)
  const [redirectResult, setRedirectResult] = useState<'success' | 'error' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)

  useEffect(() => {
    const handleRedirectOnLoad = async () => {
      // 只在浏览器环境中执行
      if (typeof window === 'undefined') return

      // 获取设备信息
      const device = MobileCompatibilityUtils.detectDevice()
      setDeviceInfo(device)

      // 检查URL是否包含MSAL重定向参数
      const urlParams = new URLSearchParams(window.location.search)
      const fragment = window.location.hash

      const hasMSALParams = 
        urlParams.has('code') || 
        urlParams.has('state') || 
        urlParams.has('session_state') ||
        fragment.includes('access_token') ||
        fragment.includes('id_token') ||
        fragment.includes('code=') ||
        fragment.includes('error=')

      if (hasMSALParams) {
        console.log('Detected MSAL redirect parameters, handling redirect...')
        
        if (device.isAndroidEdge) {
          console.log('Mobile redirect detected')
        }

        setIsHandlingRedirect(true)

        try {
          // 尝试处理重定向
          await microsoftAuth.initialize()
          const redirectResponse = await microsoftAuth.handleRedirectPromise()
          
          if (redirectResponse) {
            console.log('Redirect handled successfully:', redirectResponse)
            setRedirectResult('success')
            
            // 清理URL中的参数（可选）
            if (window.history.replaceState) {
              const cleanUrl = window.location.origin + window.location.pathname
              window.history.replaceState({}, document.title, cleanUrl)
            }
            
            // 延迟显示成功状态，然后跳转
            setTimeout(() => {
              setIsHandlingRedirect(false)
              setTimeout(() => {
                // 强制刷新页面以确保状态正确更新
                // 这样可以避免状态不同步的问题
                if (window.location.pathname === '/health-calendar') {
                  // 如果已经在健康日历页面，直接刷新
                  window.location.reload()
                } else {
                  // 否则跳转到健康日历页面
                  window.location.href = '/health-calendar'
                }
              }, 1500) // 给用户1.5秒时间看到成功消息
            }, device.isAndroidEdge ? 2000 : 1000)
            
          } else {
            console.log('No redirect response received')
            setRedirectResult('error')
            setError('未收到重定向响应，可能是认证流程异常')
            
            // 延迟隐藏加载状态
            setTimeout(() => {
              setIsHandlingRedirect(false)
            }, device.isAndroidEdge ? 2000 : 1000)
          }
        } catch (error) {
          console.error('Failed to handle redirect:', error)
          setRedirectResult('error')
          setError(error instanceof Error ? error.message : '重定向处理失败')
          
          // 延迟隐藏加载状态
          setTimeout(() => {
            setIsHandlingRedirect(false)
          }, device.isAndroidEdge ? 2000 : 1000)
        }
      }
    }

    handleRedirectOnLoad()
  }, [])

  // 如果正在处理重定向，显示加载界面
  if (isHandlingRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full">
          <Alert>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertTitle className="flex items-center gap-2">
              正在处理登录重定向
              {deviceInfo?.isAndroidEdge && (
                <Badge variant="outline" className="text-xs">
                  Mobile
                </Badge>
              )}
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <div>
                <p>正在验证您的登录信息，请稍候...</p>
              </div>

              {deviceInfo?.isAndroidEdge && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Mobile 用户：</strong>重定向处理可能需要稍长时间，请耐心等待。
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center py-4">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  // 如果重定向处理完成但有错误，显示错误信息
  if (redirectResult === 'error' && error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              登录重定向失败
              {deviceInfo?.isAndroidEdge && (
                <Badge variant="outline" className="text-xs">
                  Mobile
                </Badge>
              )}
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <div>
                <p className="text-sm">{error}</p>
              </div>

              {deviceInfo?.isAndroidEdge && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="text-sm text-amber-800">
                    <strong>Mobile 用户：</strong>建议使用 Chrome 浏览器以获得更稳定的认证体验。
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  重新加载页面
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  返回首页
                </button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  // 如果重定向成功，显示成功提示（短暂显示）
  if (redirectResult === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">登录成功！</AlertTitle>
            <AlertDescription className="text-green-700">
              <p>正在跳转到应用程序...</p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  // 正常渲染子组件
  return <>{children}</>
}

export default MSALRedirectHandler