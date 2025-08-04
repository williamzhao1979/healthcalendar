'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Shield, 
  Smartphone, 
  Chrome,
  ExternalLink,
  Info,
  Settings,
  Wifi,
  Database
} from 'lucide-react'
import { MobileCompatibilityUtils } from '../../lib/mobileCompatibility'
import { microsoftAuth } from '../../lib/microsoftAuth'
import { useOneDriveSync } from '../../hooks/useOneDriveSync'
import MSALErrorRecovery from '../../components/MSALErrorRecovery'

export default function AndroidEdgeTestPage() {
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [capabilities, setCapabilities] = useState<any>(null)
  const [testResults, setTestResults] = useState<Record<string, any>>({})
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [oneDriveState, oneDriveActions] = useOneDriveSync()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const device = MobileCompatibilityUtils.detectDevice()
      const caps = MobileCompatibilityUtils.checkBrowserCapabilities()
      
      setDeviceInfo(device)
      setCapabilities(caps)
    }
  }, [])

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setTestResults(prev => ({
      ...prev,
      [testName]: { status: 'running', result: null, error: null }
    }))

    try {
      const result = await testFn()
      setTestResults(prev => ({
        ...prev,
        [testName]: { status: 'success', result, error: null }
      }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [testName]: { status: 'error', result: null, error: error instanceof Error ? error.message : String(error) }
      }))
    }
  }

  const runAllTests = async () => {
    setIsRunningTests(true)
    
    const tests = [
      {
        name: 'deviceDetection',
        fn: async () => {
          const info = MobileCompatibilityUtils.detectDevice()
          return {
            isAndroidEdge: info.isAndroidEdge,
            isMobile: info.isMobile,
            browserName: info.browserName,
            platform: info.platform,
            androidVersion: info.androidVersion
          }
        }
      },
      {
        name: 'cryptoSupport',
        fn: async () => {
          const hasCrypto = !!(window.crypto && window.crypto.subtle)
          if (hasCrypto) {
            // 测试一个简单的加密操作
            const encoder = new TextEncoder()
            const data = encoder.encode('test')
            const key = await window.crypto.subtle.generateKey(
              { name: 'AES-GCM', length: 256 },
              true,
              ['encrypt', 'decrypt']
            )
            const encrypted = await window.crypto.subtle.encrypt(
              { name: 'AES-GCM', iv: window.crypto.getRandomValues(new Uint8Array(12)) },
              key,
              data
            )
            return { hasCrypto: true, testPassed: true, encryptedSize: encrypted.byteLength }
          }
          return { hasCrypto: false, testPassed: false }
        }
      },
      {
        name: 'storageSupport',
        fn: async () => {
          const localStorage = !!window.localStorage
          const sessionStorage = !!window.sessionStorage
          
          // 测试存储操作
          const testKey = 'android_edge_test_' + Date.now()
          const testValue = 'test_value_' + Math.random()
          
          let localStorageTest = false
          let sessionStorageTest = false
          
          try {
            window.localStorage.setItem(testKey, testValue)
            localStorageTest = window.localStorage.getItem(testKey) === testValue
            window.localStorage.removeItem(testKey)
          } catch (e) {
            localStorageTest = false
          }
          
          try {
            window.sessionStorage.setItem(testKey, testValue)
            sessionStorageTest = window.sessionStorage.getItem(testKey) === testValue
            window.sessionStorage.removeItem(testKey)
          } catch (e) {
            sessionStorageTest = false
          }
          
          return {
            localStorage,
            sessionStorage,
            localStorageTest,
            sessionStorageTest
          }
        }
      },
      {
        name: 'msalConfiguration',
        fn: async () => {
          await microsoftAuth.initialize()
          const isAvailable = microsoftAuth.isOneDriveAvailable()
          const unavailabilityReason = microsoftAuth.getUnavailabilityReason()
          
          return {
            isAvailable,
            unavailabilityReason,
            initialized: true
          }
        }
      },
      {
        name: 'networkConnectivity',
        fn: async () => {
          const isOnline = navigator.onLine
          
          // 测试对Microsoft Graph的网络连接
          const testUrl = 'https://graph.microsoft.com/v1.0/$metadata'
          try {
            const response = await fetch(testUrl, { 
              method: 'HEAD',
              mode: 'no-cors'
            })
            return {
              isOnline,
              microsoftGraphAccessible: true,
              networkTest: 'success'
            }
          } catch (error) {
            return {
              isOnline,
              microsoftGraphAccessible: false,
              networkTest: 'failed',
              error: error instanceof Error ? error.message : String(error)
            }
          }
        }
      }
    ]

    for (const test of tests) {
      await runTest(test.name, test.fn)
      // 在Mobile上添加延迟以避免过快的请求
      if (deviceInfo?.isAndroidEdge) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    setIsRunningTests(false)
  }

  const getTestStatusIcon = (testName: string) => {
    const result = testResults[testName]
    if (!result) return <div className="w-4 h-4" />
    
    switch (result.status) {
      case 'running':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      default:
        return <div className="w-4 h-4" />
    }
  }

  const getTestStatusColor = (testName: string) => {
    const result = testResults[testName]
    if (!result) return 'text-gray-500'
    
    switch (result.status) {
      case 'running':
        return 'text-blue-600'
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-500'
    }
  }

  if (!deviceInfo || !capabilities) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Mobile 兼容性测试
            {deviceInfo.isAndroidEdge && (
              <Badge variant="default" className="bg-orange-100 text-orange-800 border-orange-200">
                检测到 Mobile
              </Badge>
            )}
          </h1>
          <p className="text-gray-600">
            测试和验证 Mobile 浏览器的 MSAL 认证兼容性和功能支持
          </p>
        </div>

        <Tabs defaultValue="device" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="device">设备信息</TabsTrigger>
            <TabsTrigger value="tests">兼容性测试</TabsTrigger>
            <TabsTrigger value="msal">MSAL 测试</TabsTrigger>
            <TabsTrigger value="recommendations">建议</TabsTrigger>
          </TabsList>

          <TabsContent value="device" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  设备和浏览器信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">设备类型:</span>
                      <Badge variant={deviceInfo.isMobile ? "default" : "outline"}>
                        {deviceInfo.isMobile ? '移动设备' : '桌面设备'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">浏览器:</span>
                      <Badge variant={deviceInfo.isAndroidEdge ? "destructive" : "default"}>
                        {deviceInfo.browserName}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">平台:</span>
                      <span className="font-mono text-sm">{deviceInfo.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mobile:</span>
                      <Badge variant={deviceInfo.isAndroidEdge ? "destructive" : "outline"}>
                        {deviceInfo.isAndroidEdge ? '是' : '否'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">WebView:</span>
                      <Badge variant={deviceInfo.isWebView ? "secondary" : "outline"}>
                        {deviceInfo.isWebView ? '是' : '否'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Android 版本:</span>
                      <span className="font-mono text-sm">{deviceInfo.androidVersion || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">HTTPS:</span>
                      <Badge variant={capabilities.isSecureContext ? "default" : "destructive"}>
                        {capabilities.isSecureContext ? '安全连接' : 'HTTP'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">在线状态:</span>
                      <Badge variant={navigator.onLine ? "default" : "destructive"}>
                        {navigator.onLine ? '在线' : '离线'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <details className="cursor-pointer">
                    <summary className="font-semibold text-gray-700 mb-2">User Agent 详情</summary>
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto font-mono">
                      {navigator.userAgent}
                    </pre>
                  </details>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  兼容性测试套件
                </CardTitle>
                <CardDescription>
                  全面测试 Mobile 浏览器的各项功能支持
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={runAllTests}
                    disabled={isRunningTests}
                    className="w-full"
                  >
                    {isRunningTests ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        测试进行中...
                      </>
                    ) : (
                      '开始兼容性测试'
                    )}
                  </Button>

                  <div className="space-y-3">
                    {[
                      { key: 'deviceDetection', label: '设备检测', icon: Smartphone },
                      { key: 'cryptoSupport', label: '加密功能支持', icon: Shield },
                      { key: 'storageSupport', label: '存储功能支持', icon: Database },
                      { key: 'msalConfiguration', label: 'MSAL 配置验证', icon: Settings },
                      { key: 'networkConnectivity', label: '网络连接测试', icon: Wifi }
                    ].map(({ key, label, icon: Icon }) => (
                      <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTestStatusIcon(key)}
                          <span className={`text-sm ${getTestStatusColor(key)}`}>
                            {testResults[key]?.status || '待测试'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 测试结果详情 */}
                  {Object.keys(testResults).length > 0 && (
                    <div className="mt-6 space-y-4">
                      <h3 className="font-semibold text-gray-800">测试结果详情</h3>
                      {Object.entries(testResults).map(([testName, result]) => (
                        <details key={testName} className="border rounded-lg">
                          <summary className="p-3 cursor-pointer font-medium">
                            {testName} - {result.status}
                          </summary>
                          <div className="p-3 border-t bg-gray-50">
                            {result.error ? (
                              <pre className="text-red-600 text-xs overflow-auto">
                                {result.error}
                              </pre>
                            ) : (
                              <pre className="text-xs overflow-auto">
                                {JSON.stringify(result.result, null, 2)}
                              </pre>
                            )}
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="msal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  MSAL 认证测试
                </CardTitle>
                <CardDescription>
                  测试 Microsoft Authentication Library 在 Mobile 上的功能
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">OneDrive 可用:</span>
                      <Badge variant={oneDriveState.isOneDriveAvailable ? "default" : "destructive"}>
                        {oneDriveState.isOneDriveAvailable ? '是' : '否'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">认证状态:</span>
                      <Badge variant={oneDriveState.isAuthenticated ? "default" : "outline"}>
                        {oneDriveState.isAuthenticated ? '已认证' : '未认证'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">连接中:</span>
                      <span className="font-medium">
                        {oneDriveState.isConnecting ? '是' : '否'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">同步状态:</span>
                      <Badge variant={
                        oneDriveState.syncStatus === 'success' ? 'default' :
                        oneDriveState.syncStatus === 'error' ? 'destructive' :
                        oneDriveState.syncStatus === 'syncing' ? 'secondary' : 'outline'
                      }>
                        {oneDriveState.syncStatus}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">用户信息:</span>
                      <span className="font-medium">
                        {oneDriveState.userInfo ? '已获取' : '无'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 错误显示 */}
                {oneDriveState.error && (
                  <MSALErrorRecovery
                    error={new Error(oneDriveState.error)}
                    onRetry={() => oneDriveActions.checkConnection()}
                    onClearAuth={async () => {
                      oneDriveActions.clearError()
                      try {
                        await microsoftAuth.logout()
                      } catch (error) {
                        console.warn('Logout failed during error recovery:', error)
                      }
                    }}
                  />
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={oneDriveActions.checkConnection}
                    variant="outline"
                    size="sm"
                  >
                    检查连接
                  </Button>
                  
                  {!oneDriveState.isAuthenticated ? (
                    <Button
                      onClick={oneDriveActions.connect}
                      disabled={oneDriveState.isConnecting}
                    >
                      {oneDriveState.isConnecting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                          连接中...
                        </>
                      ) : (
                        'Connect OneDrive'
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={oneDriveActions.disconnect}
                      variant="outline"
                    >
                      断开连接
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Mobile 使用建议
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {deviceInfo.isAndroidEdge ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>检测到 Mobile 浏览器</AlertTitle>
                    <AlertDescription className="space-y-3">
                      <p>我们检测到您正在使用 Mobile 浏览器。由于兼容性限制，建议您:</p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>确保使用 HTTPS 连接</li>
                        <li>允许浏览器弹窗和重定向</li>
                        <li>保持稳定的网络连接</li>
                      </ul>
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const currentUrl = window.location.href
                            const chromeUrl = `googlechrome://navigate?url=${encodeURIComponent(currentUrl)}`
                            window.location.href = chromeUrl
                          }}
                          className="flex items-center gap-2"
                        >
                          <Chrome className="w-4 h-4" />
                          在Chrome中打开
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = '/basic-test'}
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 w-4" />
                          基础功能测试
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>浏览器兼容性良好</AlertTitle>
                    <AlertDescription>
                      您的浏览器支持所需的功能，可以正常使用 OneDrive 同步功能。
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      安全建议
                    </h3>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• 始终使用 HTTPS 连接访问应用</li>
                      <li>• 定期清理浏览器缓存</li>
                      <li>• 保持浏览器版本更新</li>
                      <li>• 在安全网络环境下使用</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Wifi className="w-4 h-4" />
                      网络建议
                    </h3>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• 使用稳定的 WiFi 网络进行同步</li>
                      <li>• 避免在移动网络下进行大量数据同步</li>
                      <li>• 确保网络防火墙允许访问 Microsoft 服务</li>
                      <li>• 检查代理设置是否正确</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      数据管理建议
                    </h3>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• 定期备份重要的健康数据</li>
                      <li>• 使用 OneDrive 同步保持数据同步</li>
                      <li>• 在多设备间保持数据一致性</li>
                      <li>• 注意个人隐私数据的保护</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}