'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'
import { AlertTriangle, RefreshCw, ExternalLink, Info } from 'lucide-react'
import { MobileCompatibilityUtils } from '../lib/mobileCompatibility'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  isAndroidEdge: boolean
  retryCount: number
}

class AndroidEdgeErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    
    const deviceInfo = typeof window !== 'undefined' 
      ? MobileCompatibilityUtils.detectDevice() 
      : { isAndroidEdge: false }

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isAndroidEdge: deviceInfo.isAndroidEdge,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AndroidEdgeErrorBoundary caught an error:', error, errorInfo)
    
    // 在Mobile上记录额外的调试信息
    if (this.state.isAndroidEdge) {
      console.error('Mobile Error Context:', {
        userAgent: navigator.userAgent,
        cookiesEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        language: navigator.language,
        platform: navigator.platform,
        storage: {
          localStorage: typeof Storage !== 'undefined' && !!window.localStorage,
          sessionStorage: typeof Storage !== 'undefined' && !!window.sessionStorage
        },
        crypto: {
          available: !!(window.crypto && window.crypto.subtle),
          webCrypto: !!window.crypto
        },
        location: {
          protocol: window.location.protocol,
          host: window.location.host,
          pathname: window.location.pathname
        }
      })
    }
    
    this.setState({
      error,
      errorInfo
    })
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
      
      // Mobile可能需要短暂延迟后重试
      if (this.state.isAndroidEdge) {
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } else {
      // 达到最大重试次数，刷新页面
      window.location.reload()
    }
  }

  handleClearCache = () => {
    try {
      // 清理可能导致问题的缓存数据
      localStorage.removeItem('healthcalendar_auth_state')
      localStorage.removeItem('msal.cache')
      sessionStorage.clear()
      
      // 清理Mobile特定的缓存
      if (this.state.isAndroidEdge) {
        // 尝试清理更多缓存项
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('msal.') || key.startsWith('healthcalendar_'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      }
      
      window.location.reload()
    } catch (error) {
      console.error('Failed to clear cache:', error)
      window.location.reload()
    }
  }

  getErrorMessage(): string {
    if (!this.state.error) return '未知错误'

    const errorMessage = this.state.error.message.toLowerCase()
    
    // Mobile特定错误处理
    if (this.state.isAndroidEdge) {
      if (errorMessage.includes('crypto') || errorMessage.includes('cryptography')) {
        return 'Mobile 浏览器的加密功能不可用。这可能是由于浏览器设置或网络环境导致的。'
      }
      
      if (errorMessage.includes('msal') || errorMessage.includes('authentication')) {
        return 'Mobile 浏览器的认证模块遇到问题。这可能是由于浏览器兼容性或网络连接问题导致的。'
      }
      
      if (errorMessage.includes('redirect') || errorMessage.includes('navigation')) {
        return 'Mobile 浏览器的页面重定向功能遇到问题。这可能是由于浏览器安全设置导致的。'
      }
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return 'Mobile 浏览器的网络请求失败。请检查网络连接或尝试切换到 WiFi 网络。'
      }
      
      if (errorMessage.includes('storage') || errorMessage.includes('quota')) {
        return 'Mobile 浏览器的存储空间不足或访问受限。请清理浏览器缓存或释放存储空间。'
      }
    }
    
    return this.state.error.message
  }

  getSolutions(): string[] {
    if (!this.state.error) return []

    const errorMessage = this.state.error.message.toLowerCase()
    const baseSolutions: string[] = []
    
    if (this.state.isAndroidEdge) {
      baseSolutions.push('尝试使用 Chrome 浏览器代替 Edge')
      baseSolutions.push('确保使用 HTTPS 连接访问应用')
      baseSolutions.push('允许浏览器显示弹窗和重定向')
      baseSolutions.push('检查网络连接是否稳定')
      
      if (errorMessage.includes('crypto')) {
        baseSolutions.push('确认浏览器支持最新的 Web 标准')
        baseSolutions.push('更新 Mobile 到最新版本')
      }
      
      if (errorMessage.includes('storage') || errorMessage.includes('quota')) {
        baseSolutions.push('清理浏览器缓存和数据')
        baseSolutions.push('检查设备存储空间是否充足')
      }
      
      if (errorMessage.includes('network')) {
        baseSolutions.push('尝试切换到 WiFi 网络')
        baseSolutions.push('检查防火墙或代理设置')
      }
    } else {
      baseSolutions.push('刷新页面重新尝试')
      baseSolutions.push('清理浏览器缓存')
      baseSolutions.push('检查网络连接')
      baseSolutions.push('尝试使用其他浏览器')
    }
    
    return baseSolutions
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorMessage = this.getErrorMessage()
      const solutions = this.getSolutions()
      const canRetry = this.state.retryCount < this.maxRetries

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="max-w-lg w-full space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {this.state.isAndroidEdge ? 'Mobile 兼容性问题' : '应用程序错误'}
              </AlertTitle>
              <AlertDescription className="space-y-4">
                <div>
                  <p className="font-semibold">错误描述：</p>
                  <p className="text-sm">{errorMessage}</p>
                </div>
                
                <div>
                  <p className="font-semibold">建议解决方案：</p>
                  <ul className="text-sm space-y-1 ml-4">
                    {solutions.map((solution, index) => (
                      <li key={index} className="list-disc">{solution}</li>
                    ))}
                  </ul>
                </div>
                
                {this.state.isAndroidEdge && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="flex items-start space-x-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold">Mobile 用户提示：</p>
                        <p>我们检测到您正在使用 Mobile 浏览器。为了获得最佳体验，建议使用 Chrome 浏览器访问此应用。</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  {canRetry && (
                    <Button 
                      onClick={this.handleRetry} 
                      variant="default" 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      重试 ({this.maxRetries - this.state.retryCount} 次机会)
                    </Button>
                  )}
                  
                  <Button 
                    onClick={this.handleClearCache} 
                    variant="outline" 
                    size="sm"
                  >
                    清理缓存并刷新
                  </Button>
                  
                  <Button 
                    onClick={() => window.location.href = '/basic-test'} 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    基础功能测试
                  </Button>
                </div>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4 text-xs">
                    <summary className="cursor-pointer font-semibold text-gray-600">
                      开发者调试信息 (点击展开)
                    </summary>
                    <div className="mt-2 p-2 bg-gray-100 rounded font-mono text-xs overflow-auto max-h-40">
                      <div>
                        <strong>错误堆栈：</strong>
                        <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                      </div>
                      {this.state.errorInfo && (
                        <div className="mt-2">
                          <strong>组件堆栈：</strong>
                          <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default AndroidEdgeErrorBoundary