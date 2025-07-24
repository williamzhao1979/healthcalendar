'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { CheckCircle, AlertCircle, RefreshCw, UserCheck, Clock, Shield } from 'lucide-react';
import { useOneDriveSync } from '../../hooks/useOneDriveSync';

export default function PersistentAuthTestPage() {
  const [
    { isAuthenticated, isConnecting, userInfo, error },
    { connect, disconnect, checkConnection, clearError }
  ] = useOneDriveSync();

  const [authStateInfo, setAuthStateInfo] = useState<{
    hasSavedState: boolean;
    stateAge: number | null;
    accountInfo: any;
  } | null>(null);

  const [testResults, setTestResults] = useState<{
    initialLoad: string;
    manualCheck: string;
    sessionPersistence: string;
  }>({
    initialLoad: '等待测试',
    manualCheck: '等待测试',
    sessionPersistence: '等待测试'
  });

  useEffect(() => {
    // 检查本地保存的认证状态
    const checkSavedAuthState = () => {
      try {
        const savedState = localStorage.getItem('healthcalendar_auth_state');
        if (savedState) {
          const authState = JSON.parse(savedState);
          const stateAge = Date.now() - authState.timestamp;
          
          setAuthStateInfo({
            hasSavedState: true,
            stateAge: stateAge,
            accountInfo: authState
          });

          // 测试初始加载结果
          if (isAuthenticated) {
            setTestResults(prev => ({
              ...prev,
              initialLoad: '✅ 自动恢复成功'
            }));
          } else {
            setTestResults(prev => ({
              ...prev,
              initialLoad: '⚠️ 有保存状态但未恢复'
            }));
          }
        } else {
          setAuthStateInfo({
            hasSavedState: false,
            stateAge: null,
            accountInfo: null
          });

          setTestResults(prev => ({
            ...prev,
            initialLoad: isAuthenticated ? '✅ 已认证但无保存状态' : '➖ 无保存状态，未认证'
          }));
        }
      } catch (error) {
        console.error('Failed to check saved auth state:', error);
      }
    };

    checkSavedAuthState();
  }, [isAuthenticated]);

  const handleManualCheck = async () => {
    try {
      setTestResults(prev => ({ ...prev, manualCheck: '🔄 检查中...' }));
      await checkConnection();
      
      setTimeout(() => {
        setTestResults(prev => ({
          ...prev,
          manualCheck: isAuthenticated ? '✅ 手动检查成功' : '❌ 手动检查失败'
        }));
      }, 1000);
    } catch (error) {
      setTestResults(prev => ({ ...prev, manualCheck: '❌ 检查失败' }));
    }
  };

  const handleSessionTest = async () => {
    if (!isAuthenticated) {
      setTestResults(prev => ({ ...prev, sessionPersistence: '❌ 需要先登录' }));
      return;
    }

    setTestResults(prev => ({ ...prev, sessionPersistence: '🔄 测试中...' }));
    
    // 模拟页面刷新场景
    setTimeout(() => {
      const newSavedState = localStorage.getItem('healthcalendar_auth_state');
      if (newSavedState) {
        setTestResults(prev => ({
          ...prev,
          sessionPersistence: '✅ 会话状态已保存'
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          sessionPersistence: '❌ 会话状态未保存'
        }));
      }
    }, 500);
  };

  const formatAge = (ageMs: number) => {
    const minutes = Math.floor(ageMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟前`;
    } else if (minutes > 0) {
      return `${minutes}分钟前`;
    } else {
      return '刚刚';
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">OneDrive 持久化认证测试</h1>
      
      {/* 当前认证状态 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            当前认证状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={isAuthenticated ? "default" : "secondary"}>
                  {isAuthenticated ? "已认证" : "未认证"}
                </Badge>
                {isConnecting && <RefreshCw className="w-4 h-4 animate-spin" />}
              </div>
              
              {userInfo && (
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>用户:</strong> {userInfo.username || userInfo.name}</div>
                  <div><strong>账户ID:</strong> {userInfo.homeAccountId}</div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Button onClick={isAuthenticated ? disconnect : connect} disabled={isConnecting}>
                {isConnecting ? '连接中...' : (isAuthenticated ? '断开连接' : '连接 OneDrive')}
              </Button>
              <Button onClick={handleManualCheck} variant="outline" className="w-full">
                手动检查连接
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 保存的认证状态信息 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            本地认证状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          {authStateInfo ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={authStateInfo.hasSavedState ? "default" : "secondary"}>
                  {authStateInfo.hasSavedState ? "有保存状态" : "无保存状态"}
                </Badge>
                {authStateInfo.stateAge && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    {formatAge(authStateInfo.stateAge)}
                  </div>
                )}
              </div>
              
              {authStateInfo.accountInfo && (
                <div className="bg-gray-50 rounded p-3 text-sm">
                  <div><strong>保存的账户:</strong> {authStateInfo.accountInfo.username}</div>
                  <div><strong>账户ID:</strong> {authStateInfo.accountInfo.accountId}</div>
                  <div><strong>保存时间:</strong> {new Date(authStateInfo.accountInfo.timestamp).toLocaleString()}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-600">检查中...</div>
          )}
        </CardContent>
      </Card>

      {/* 测试结果 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>持久化功能测试结果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">初始加载恢复:</span>
              <span>{testResults.initialLoad}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">手动连接检查:</span>
              <span>{testResults.manualCheck}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">会话持久化:</span>
              <span>{testResults.sessionPersistence}</span>
              <Button onClick={handleSessionTest} size="sm" variant="outline">
                测试
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误信息 */}
      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div>{error}</div>
              <Button onClick={clearError} variant="outline" size="sm">
                清除错误
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 测试说明 */}
      <Card>
        <CardHeader>
          <CardTitle>测试说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <h4 className="font-semibold text-gray-900">测试步骤:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>首次访问页面，检查是否有保存的认证状态</li>
              <li>如果未认证，点击"连接 OneDrive"进行登录</li>
              <li>登录成功后，检查本地是否保存了认证状态</li>
              <li>刷新页面，验证认证状态是否自动恢复</li>
              <li>使用"手动检查连接"测试静默令牌获取</li>
              <li>测试会话持久化功能</li>
            </ol>
            
            <h4 className="font-semibold text-gray-900 mt-4">预期结果:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>登录后应该在localStorage中保存认证状态</li>
              <li>页面刷新后应该自动恢复认证状态</li>
              <li>24小时内无需重新登录</li>
              <li>令牌过期时应该自动刷新</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
