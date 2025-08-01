'use client'

import React, { useState, useEffect } from 'react'
import { useOneDriveSync, formatSyncTime } from '../../hooks/useOneDriveSync'
import { CheckCircle, AlertCircle, RefreshCw, User, Database, Download, Smartphone, Monitor, Folder, File, FileText } from 'lucide-react'
import CompatibilityChecker from '../../components/CompatibilityChecker'
import { MobileCompatibilityUtils } from '../../lib/mobileCompatibility'

export default function OneDriveTestPage() {
  const [oneDriveState, oneDriveActions] = useOneDriveSync()
  const [testUserId, setTestUserId] = useState('user_self')
  const [selectedTable, setSelectedTable] = useState('')
  const [deviceInfo, setDeviceInfo] = useState<{
    isMobile: boolean;
    userAgent: string;
    browserCapabilities: any;
  } | null>(null)

  // 常见的数据库表名（用于测试）
  const commonTables = ['users', 'stoolRecords', 'myRecords', 'userSettings']

  useEffect(() => {
    // 检测设备和浏览器信息
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const capabilities = MobileCompatibilityUtils.checkBrowserCapabilities();
    
    setDeviceInfo({
      isMobile,
      userAgent: navigator.userAgent,
      browserCapabilities: capabilities
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">OneDrive 同步测试</h1>
        
        {/* 设备信息 */}
        <div className="bg-slate-50 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            {deviceInfo?.isMobile ? (
              <Smartphone className="w-5 h-5 mr-2" />
            ) : (
              <Monitor className="w-5 h-5 mr-2" />
            )}
            设备信息
          </h2>
          
          {deviceInfo && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">设备类型:</span>
                <span className={`font-medium px-2 py-1 rounded text-xs ${
                  deviceInfo.isMobile ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {deviceInfo.isMobile ? '移动设备' : '桌面设备'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Crypto API:</span>
                <span className={`font-medium px-2 py-1 rounded text-xs ${
                  deviceInfo.browserCapabilities.crypto ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {deviceInfo.browserCapabilities.crypto ? '支持' : '不支持'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">HTTPS:</span>
                <span className={`font-medium px-2 py-1 rounded text-xs ${
                  deviceInfo.browserCapabilities.https ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {deviceInfo.browserCapabilities.https ? '安全连接' : 'HTTP连接'}
                </span>
              </div>
              
              <div className="text-xs text-gray-500 mt-2">
                <strong>User Agent:</strong> {deviceInfo.userAgent}
              </div>
            </div>
          )}
        </div>
        
        {/* 移动端解决方案提示 */}
        {deviceInfo?.isMobile && !deviceInfo.browserCapabilities.crypto && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-amber-800 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              移动端兼容性建议
            </h2>
            
            <div className="space-y-3 text-sm text-amber-700">
              <div className="bg-white rounded-lg p-3">
                <h3 className="font-semibold mb-2">🔒 启用HTTPS访问</h3>
                <p>当前页面使用HTTP连接，移动浏览器限制了加密功能。请使用HTTPS访问：</p>
                <code className="block mt-1 p-2 bg-amber-100 rounded text-xs">
                  https://localhost:3443/onedrive-test
                </code>
              </div>
              
              <div className="bg-white rounded-lg p-3">
                <h3 className="font-semibold mb-2">🌐 尝试不同浏览器</h3>
                <p>推荐使用以下浏览器进行测试：</p>
                <ul className="list-disc list-inside mt-1 text-xs">
                  <li>Chrome (最新版本)</li>
                  <li>Firefox (最新版本)</li>
                  <li>Safari (iOS 11+)</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-3">
                <h3 className="font-semibold mb-2">⚙️ 浏览器设置</h3>
                <p>如果问题持续，可以尝试：</p>
                <ul className="list-disc list-inside mt-1 text-xs">
                  <li>清除浏览器缓存和Cookie</li>
                  <li>使用无痕/隐私模式</li>
                  <li>检查浏览器安全设置</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* 连接状态 */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            连接状态
            {oneDriveState.isAuthenticated && (
              <CheckCircle className="w-5 h-5 text-green-500 ml-2" />
            )}
            {oneDriveState.error && (
              <AlertCircle className="w-5 h-5 text-red-500 ml-2" />
            )}
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">认证状态:</span>
              <span className={`font-medium ${oneDriveState.isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
                {oneDriveState.isAuthenticated ? '已连接' : '未连接'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">连接中:</span>
              <span className={`font-medium ${oneDriveState.isConnecting ? 'text-blue-600' : 'text-gray-600'}`}>
                {oneDriveState.isConnecting ? '是' : '否'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">同步状态:</span>
              <span className={`font-medium ${
                oneDriveState.syncStatus === 'syncing' ? 'text-blue-600' :
                oneDriveState.syncStatus === 'success' ? 'text-green-600' :
                oneDriveState.syncStatus === 'error' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {oneDriveState.syncStatus === 'idle' && '待机'}
                {oneDriveState.syncStatus === 'syncing' && '同步中...'}
                {oneDriveState.syncStatus === 'success' && '同步成功'}
                {oneDriveState.syncStatus === 'error' && '同步失败'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">导出状态:</span>
              <span className={`font-medium ${oneDriveState.isExporting ? 'text-blue-600' : 'text-gray-600'}`}>
                {oneDriveState.isExporting ? '导出中...' : '待机'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">最后同步:</span>
              <span className="font-medium text-gray-600">
                {formatSyncTime(oneDriveState.lastSyncTime)}
              </span>
            </div>
            
            {oneDriveState.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{oneDriveState.error}</p>
                {deviceInfo?.isMobile && oneDriveState.error.includes('crypto') && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-yellow-800 text-xs">
                      <strong>移动端加密API问题:</strong> 请尝试使用HTTPS访问或使用不同的浏览器
                    </p>
                  </div>
                )}
                <button
                  onClick={oneDriveActions.clearError}
                  className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded transition-colors"
                >
                  清除错误
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 导出结果 */}
        {oneDriveState.exportResult && (
          <div className={`rounded-xl p-6 mb-6 ${
            oneDriveState.exportResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2" />
              导出结果
              {oneDriveState.exportResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500 ml-2" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 ml-2" />
              )}
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">导出状态:</span>
                <span className={`font-medium ${oneDriveState.exportResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {oneDriveState.exportResult.success ? '成功' : '失败'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">导出文件数:</span>
                <span className="font-medium text-gray-800">
                  {oneDriveState.exportResult.exportedFiles.length}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">错误数:</span>
                <span className="font-medium text-gray-800">
                  {oneDriveState.exportResult.errors.length}
                </span>
              </div>

              {oneDriveState.exportResult.exportedFiles.length > 0 && (
                <div>
                  <p className="text-gray-600 text-sm mb-2">已导出文件:</p>
                  <div className="bg-white rounded-lg p-3 max-h-32 overflow-y-auto">
                    {oneDriveState.exportResult.exportedFiles.map((file, index) => (
                      <div key={index} className="text-xs text-gray-700 mb-1">
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {oneDriveState.exportResult.errors.length > 0 && (
                <div>
                  <p className="text-red-600 text-sm mb-2">错误信息:</p>
                  <div className="bg-white rounded-lg p-3 max-h-32 overflow-y-auto">
                    {oneDriveState.exportResult.errors.map((error, index) => (
                      <div key={index} className="text-xs text-red-700 mb-1">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 用户信息 */}
        {oneDriveState.userInfo && (
          <div className="bg-blue-50 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              用户信息
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">用户名:</span>
                <span className="font-medium text-gray-800">
                  {oneDriveState.userInfo.username || oneDriveState.userInfo.name || '未知'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">邮箱:</span>
                <span className="font-medium text-gray-800">
                  {oneDriveState.userInfo.homeAccountId || '未知'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* OneDrive 文件浏览器 */}
        {oneDriveState.isAuthenticated && (
          <div className="bg-blue-50 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Folder className="w-5 h-5 mr-2" />
              Apps/HealthCalendar 文件浏览器
            </h2>
            
            <div className="space-y-4">
              {/* 加载文件按钮 */}
              <button
                onClick={oneDriveActions.loadFiles}
                disabled={oneDriveState.isLoadingFiles}
                className="flex items-center justify-center space-x-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
              >
                {oneDriveState.isLoadingFiles && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{oneDriveState.isLoadingFiles ? '加载中...' : '刷新文件列表'}</span>
              </button>

              {/* 文件列表 */}
              {oneDriveState.files.length > 0 && (
                <div className="bg-white rounded-lg border">
                  <div className="p-3 border-b bg-gray-50 rounded-t-lg">
                    <h3 className="text-sm font-semibold text-gray-700">文件列表 ({oneDriveState.files.length} 个文件)</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {oneDriveState.files.map((file, index) => (
                      <div key={file.id} className={`flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}
                           onClick={() => oneDriveActions.loadFileContent(file.id, file.name, !!file.folder)}>
                        <div className="flex items-center space-x-3">
                          {file.folder ? (
                            <Folder className="w-4 h-4 text-blue-500" />
                          ) : file.name.endsWith('.json') ? (
                            <FileText className="w-4 h-4 text-green-500" />
                          ) : (
                            <File className="w-4 h-4 text-gray-500" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{file.name}</div>
                            <div className="text-xs text-gray-500">
                              {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                              {file.lastModifiedDateTime && ` • ${new Date(file.lastModifiedDateTime).toLocaleDateString()}`}
                            </div>
                          </div>
                        </div>
                        {!file.folder && (
                          <div className="text-xs text-blue-600 opacity-0 group-hover:opacity-100">
                            点击查看内容
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 文件内容显示 */}
              {(oneDriveState.selectedFileContent || oneDriveState.isLoadingFileContent) && (
                <div className="bg-white rounded-lg border">
                  <div className="p-3 border-b bg-gray-50 rounded-t-lg">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      文件内容
                      {oneDriveState.isLoadingFileContent && <RefreshCw className="w-4 h-4 animate-spin ml-2" />}
                    </h3>
                  </div>
                  <div className="p-3">
                    {oneDriveState.isLoadingFileContent ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                        <span className="text-gray-600">加载文件内容中...</span>
                      </div>
                    ) : (
                      <textarea
                        value={oneDriveState.selectedFileContent || ''}
                        readOnly
                        className="w-full h-64 p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="选择一个文件查看内容..."
                      />
                    )}
                  </div>
                </div>
              )}

              {oneDriveState.files.length === 0 && !oneDriveState.isLoadingFiles && (
                <div className="text-center py-8 text-gray-500">
                  <Folder className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>点击"刷新文件列表"加载 OneDrive 文件</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 数据导出测试 */}
        {oneDriveState.isAuthenticated && (
          <div className="bg-purple-50 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Download className="w-5 h-5 mr-2" />
              数据导出测试
            </h2>
            
            <div className="space-y-4">
              {/* 用户ID输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户ID:
                </label>
                <input
                  type="text"
                  value={testUserId}
                  onChange={(e) => setTestUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="输入用户ID (如: user_self)"
                />
              </div>

              {/* 表名选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  单表导出 (可选):
                </label>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">选择表 (留空导出所有表)</option>
                  {commonTables.map(table => (
                    <option key={table} value={table}>{table}</option>
                  ))}
                </select>
              </div>

              {/* 导出按钮 */}
              <div className="flex space-x-3">
                <button
                  onClick={() => oneDriveActions.exportData(testUserId)}
                  disabled={oneDriveState.isExporting || !testUserId.trim()}
                  className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-xl transition-colors"
                >
                  {oneDriveState.isExporting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{oneDriveState.isExporting ? '导出中...' : '导出所有数据'}</span>
                </button>

                {selectedTable && (
                  <button
                    onClick={() => oneDriveActions.exportTable(selectedTable, testUserId)}
                    disabled={oneDriveState.isExporting || !testUserId.trim()}
                    className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-xl transition-colors"
                  >
                    {oneDriveState.isExporting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{oneDriveState.isExporting ? '导出中...' : `导出${selectedTable}`}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="space-y-4">
          {!oneDriveState.isAuthenticated ? (
            <button
              onClick={oneDriveActions.connect}
              disabled={oneDriveState.isConnecting}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors"
            >
              {oneDriveState.isConnecting && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{oneDriveState.isConnecting ? '连接中...' : '连接 OneDrive'}</span>
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => oneDriveActions.startSync(testUserId)}
                disabled={oneDriveState.syncStatus === 'syncing'}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition-colors"
              >
                {oneDriveState.syncStatus === 'syncing' && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{oneDriveState.syncStatus === 'syncing' ? '同步中...' : '开始同步'}</span>
              </button>
              
              <button
                onClick={oneDriveActions.importUsers}
                disabled={oneDriveState.syncStatus === 'syncing'}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-medium rounded-xl transition-colors"
              >
                {oneDriveState.syncStatus === 'syncing' && <RefreshCw className="w-4 h-4 animate-spin" />}
                <Database className="w-4 h-4" />
                <span>{oneDriveState.syncStatus === 'syncing' ? '导入中...' : '从OneDrive导入用户'}</span>
              </button>
              
              <button
                onClick={oneDriveActions.disconnect}
                className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
              >
                断开连接
              </button>
            </div>
          )}
          
          <button
            onClick={oneDriveActions.checkConnection}
            className="w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-colors"
          >
            检查连接状态
          </button>
        </div>

        {/* 调试信息 */}
        <div className="mt-8 p-4 bg-gray-100 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">调试信息:</h3>
          <pre className="text-xs text-gray-600 overflow-auto max-h-60">
            {JSON.stringify(oneDriveState, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
