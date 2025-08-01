'use client'

import React, { useState, useEffect } from 'react'
import { 
  Database, 
  Users, 
  Activity, 
  Utensils, 
  FileText,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
  Plus,
  Search,
  Filter,
  Settings,
  BarChart3,
  Shield,
  AlertCircle,
  TrendingUp,
  HardDrive,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { adminService, type DatabaseStats, type ObjectStoreStats } from '@/lib/adminService'
import { useOneDriveSync, formatSyncTime } from '../../hooks/useOneDriveSync'
import { on } from 'events'
import { dataExportService, ExportResult } from '../../lib/dataExportService'

// 管理组件
const IndexedDBAdmin: React.FC = () => {
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null)
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [records, setRecords] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [showAddDialog, setShowAddDialog] = useState<boolean>(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [newRecordData, setNewRecordData] = useState<string>('')
  const [healthCheck, setHealthCheck] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [recordsPerPage] = useState<number>(20)
  const [sortField, setSortField] = useState<string>('updatedAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [usersIDB, setUsersIDB] = useState<string>('')
  const [usersOneDrive, setUsersOneDrive] = useState<string>('')
  const [oneDriveState, oneDriveActions] = useOneDriveSync()
  const [activeTabAdmin, setActiveTabAdmin] = useState('debug');

const idbJsonDefault = `{
  "dbName": "HealthCalendar",
  "tableName": "users",
  "exportTime": "2025-07-24T09:11:09.587Z",
  "syncTime": "2025-07-24T09:11:09.587Z",
  "recordCount": 2,
  "data": [
    {
      "id": "user_self",
      "name": "本人",
      "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
      "isActive": true,
      "createdAt": "2025-07-21T04:25:28.818Z",
      "updatedAt": "2025-07-24T07:20:10.181Z"
    },
    {
      "id": "user_test",
      "name": "测试用户",
      "avatarUrl": "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=80&h=80&fit=crop&crop=face",
      "isActive": false,
      "createdAt": "2025-07-20T12:04:06.036Z",
      "updatedAt": "2025-07-24T07:20:10.181Z"
    }
  ]
}`

  const [idbJson, setIDBJson] = useState<string>(idbJsonDefault)

  // 初始化数据库信息
  useEffect(() => {
    const storedTab = localStorage.getItem('activeTabAdmin');
    console.log('Stored activeTabAdmin:', storedTab);
    if (storedTab) {
      setActiveTabAdmin(storedTab);
    }
    loadDatabaseInfo()
    performHealthCheck()

    loadUsersIDB()
  }, [])

  useEffect(() => {
    console.log('Active tab changed:', activeTabAdmin);
    localStorage.setItem('activeTabAdmin', activeTabAdmin);
  }, [activeTabAdmin]);

  const loadUsersIDB = async () => {  
    try {
      const users = await adminService.getAllRecordsIDB('users')

      const jsonWithSchema = {
        dbName: 'HealthCalendar',
        tableName: 'users',
        exportTime: new Date().toISOString(),
        syncTime: new Date().toISOString(),
        recordCount: users.length,
        data: users
      }
      setUsersIDB(JSON.stringify(jsonWithSchema, null, 2))
    } catch (err) {
      console.error('加载用户IDB失败:', err)
    }
  }
  // 加载数据库信息
  const loadDatabaseInfo = async () => {
    setLoading(true)
    setError('')
    
    try {
      const stats = await adminService.getDatabaseStats()
      setDatabaseStats(stats)
      
      if (stats.objectStores.length > 0 && !selectedStore) {
        setSelectedStore(stats.objectStores[0].name)
      }
    } catch (err) {
      setError('加载数据库信息失败: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // 执行健康检查
  const performHealthCheck = async () => {
    try {
      const result = await adminService.performHealthCheck()
      setHealthCheck(result)
    } catch (err) {
      console.error('健康检查失败:', err)
    }
  }

  // 加载指定存储的所有记录
  const loadStoreRecords = async (storeName: string) => {
    setLoading(true)
    setError('')
    
    try {
      const options = {
        orderBy: sortField,
        orderDirection: sortDirection,
        limit: recordsPerPage,
        offset: (currentPage - 1) * recordsPerPage
      }
      
      let allRecords: any[]
      if (searchTerm) {
        allRecords = await adminService.searchRecords(storeName, searchTerm)
      } else {
        allRecords = await adminService.getStoreRecords(storeName, options)
      }
      
      setRecords(allRecords)
    } catch (err) {
      setError('加载记录失败: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // 删除记录
  const deleteRecord = async (storeName: string, id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return
    
    try {
      await adminService.deleteRecord(storeName, id)
      setSuccess('记录删除成功')
      await loadStoreRecords(storeName)
    } catch (err) {
      setError('删除记录失败: ' + (err as Error).message)
    }
  }

  // 软删除记录
  const softDeleteRecord = async (storeName: string, id: string) => {
    if (!confirm('确定要软删除这条记录吗？')) return
    
    try {
      await adminService.softDeleteRecord(storeName, id)
      setSuccess('记录已标记为删除')
      await loadStoreRecords(storeName)
    } catch (err) {
      setError('软删除记录失败: ' + (err as Error).message)
    }
  }

  // 添加或更新记录
  const saveRecord = async (storeName: string, recordData: any, isUpdate: boolean = false) => {
    try {
      // 验证记录格式
      const validation = adminService.validateRecord(storeName, recordData)
      if (!validation.valid) {
        setError('记录格式验证失败: ' + validation.errors.join(', '))
        return
      }

      if (isUpdate) {
        await adminService.updateRecord(storeName, recordData)
        setSuccess('记录更新成功')
      } else {
        await adminService.addRecord(storeName, recordData)
        setSuccess('记录添加成功')
      }
      
      await loadStoreRecords(storeName)
      setShowAddDialog(false)
      setEditingRecord(null)
      setNewRecordData('')
    } catch (err) {
      setError((isUpdate ? '更新' : '添加') + '记录失败: ' + (err as Error).message)
    }
  }

  // 清空对象存储
  const clearObjectStore = async (storeName: string) => {
    if (!confirm(`确定要清空 ${storeName} 存储中的所有数据吗？此操作不可恢复！`)) {
      return
    }
    
    try {
      await adminService.clearObjectStore(storeName)
      setSuccess(`${storeName} 存储已清空`)
      await loadStoreRecords(storeName)
      await loadDatabaseInfo() // 重新加载统计信息
    } catch (err) {
      setError('清空存储失败: ' + (err as Error).message)
    }
  }

  // 重置整个数据库
  const resetDatabase = async () => {
    if (!confirm('确定要重置整个数据库吗？此操作将删除所有数据且不可恢复！')) {
      return
    }
    
    try {
      await adminService.resetDatabase()
      setSuccess('数据库已重置')
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err) {
      setError('重置数据库失败: ' + (err as Error).message)
    }
  }

  // 导出数据
  const exportData = async () => {
    try {
      const backupData = await adminService.exportFullBackup()
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `healthcalendar_backup_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      
      URL.revokeObjectURL(url)
      setSuccess('数据导出成功')
    } catch (err) {
      setError('导出数据失败: ' + (err as Error).message)
    }
  }

  // 导入数据
  const importData = async (file: File) => {
    try {
      const text = await file.text()
      const backupData = JSON.parse(text)
      
      const result = await adminService.importBackup(backupData, {
        clearExisting: true,
        skipErrors: true
      })
      
      if (result.success) {
        setSuccess('数据导入成功')
      } else {
        setSuccess('数据导入完成，但有部分错误: ' + result.errors.join(', '))
      }
      
      await loadDatabaseInfo()
      if (selectedStore) {
        await loadStoreRecords(selectedStore)
      }
    } catch (err) {
      setError('导入数据失败: ' + (err as Error).message)
    }
  }

  // 当选择的存储改变时，加载该存储的记录
  useEffect(() => {
    if (selectedStore) {
      setCurrentPage(1) // 重置页码
      loadStoreRecords(selectedStore)
    }
  }, [selectedStore, sortField, sortDirection])

  // 当搜索条件或页码改变时，重新加载记录
  useEffect(() => {
    if (selectedStore) {
      loadStoreRecords(selectedStore)
    }
  }, [searchTerm, currentPage])

  // 获取存储图标
  const getStoreIcon = (storeName: string) => {
    switch (storeName) {
      case 'users': return <Users className="w-4 h-4" />
      case 'stoolRecords': return <Activity className="w-4 h-4" />
      case 'mealRecords': return <Utensils className="w-4 h-4" />
      case 'myRecords': return <FileText className="w-4 h-4" />
      default: return <Database className="w-4 h-4" />
    }
  }

  // 格式化文件大小
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 清除提示消息
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('')
        setSuccess('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])



const handleCreateIDBObject = async () => {
    try {
        const idbObject = JSON.parse(idbJson)
        await adminService.loadToIDBFromJson(idbObject)
        console.log('创建对象存储:', idbObject.tableName, idbObject.data)
        setSuccess('对象存储创建成功')
        await loadDatabaseInfo()
    } catch (err) {
        setError('创建对象存储失败: ' + (err as Error).message)
    }
}

const initializeIDB = async () => {
    try {
        // const idbObject = JSON.parse(idbJson)
        // await adminService.initializeIDB()
        await adminService.ensureIDB()
        setSuccess('ensureIDB成功')
        await loadDatabaseInfo()
    } catch (err) {
        setError('Initialize IDB failed: ' + (err as Error).message)
    }
}

const handleDebug = async () => {
  try {
    // if (oneDriveState.files.length === 0) {
    //   await oneDriveActions.loadFiles()
    //   console.log('OneDrive 文件加载成功:', oneDriveState.files)
    // }
    // const userFile = oneDriveState.files.find(f => f.name === 'users.json')
    // console.log('loadFileContent:', userFile)
    // oneDriveActions.loadFileContent(userFile.id, userFile.name, false)

    // await loadUsersIDB();
    // const usersFileOneDrive = await dataExportService.readUsersFile();

    // oneDriveActions.importUsers();
    oneDriveActions.syncIDBOneDrive();
    oneDriveActions.syncIDBOneDriveMyRecords();
    // setUsersOneDrive(JSON.stringify(usersFileOneDrive, null, 2));
  } catch (err) {
    setError('加载 OneDrive 文件失败: ' + (err as Error).message)
  }
}

// useEffect(() => {
//     console.log('useEffect OneDrive 文件加载成功:', oneDriveState.files);
//     setIDBJson(JSON.stringify(oneDriveState.files, null, 2));
//     if (oneDriveState.files.length > 0) {
//       // const file = oneDriveState.files.filter(f => f.name === 'users.json')[0];
//       // setUsersOneDrive(JSON.stringify(file, null, 2));
//     } else {
//       setUsersOneDrive('没有 OneDrive 文件');
//     }
// }, [oneDriveState.files]);

// useEffect(() => {
//   const file = oneDriveState.selectedFileContent;
//   console.log('Selected file content:', file);
//   // setUsersOneDrive(JSON.stringify(file, null, 2));
//   file && setUsersOneDrive(file);
//   file && setIDBJson(file);
// }, [oneDriveState.selectedFileContent]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <Database className="inline-block w-8 h-8 mr-2" />
            IndexedDB 管理后台
          </h1>
          <p className="text-gray-600">健康日历数据库管理和维护工具</p>
        </div>

        {/* 错误和成功提示 */}
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-600">{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs className="space-y-6" value={activeTabAdmin} onValueChange={(val) => setActiveTabAdmin(val)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">数据库概览</TabsTrigger>
            <TabsTrigger value="records">记录管理</TabsTrigger>
            <TabsTrigger value="health">健康检查</TabsTrigger>
            <TabsTrigger value="tools">维护工具</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>

          {/* 数据库概览 */}
          <TabsContent value="overview" className="space-y-6">
            {databaseStats && (
              <>
                {/* 统计卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">数据库</p>
                          <p className="text-2xl font-bold">{databaseStats.dbName}</p>
                        </div>
                        <Database className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">版本</p>
                          <p className="text-2xl font-bold">v{databaseStats.version}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">总记录数</p>
                          <p className="text-2xl font-bold">{databaseStats.totalRecords}</p>
                        </div>
                        <BarChart3 className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">估算大小</p>
                          <p className="text-2xl font-bold">{formatBytes(databaseStats.estimatedSize)}</p>
                        </div>
                        <HardDrive className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 对象存储列表 */}
                <Card>
                  <CardHeader>
                    <CardTitle>对象存储详情</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      {databaseStats.objectStores.map((store: ObjectStoreStats) => (
                        <Card 
                          key={store.name} 
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedStore === store.name ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                          }`}
                          onClick={() => setSelectedStore(store.name)}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                              {getStoreIcon(store.name)}
                              {store.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">记录数:</span>
                                <Badge variant="secondary">{store.recordCount}</Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">索引数:</span>
                                <Badge variant="outline">{store.indexes.length}</Badge>
                              </div>
                              <div className="text-xs text-gray-500">
                                主键: {Array.isArray(store.keyPath) ? store.keyPath.join(', ') : store.keyPath}
                              </div>
                              {store.lastModified && (
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(store.lastModified).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* 记录管理 */}
          <TabsContent value="records" className="space-y-6">
            {selectedStore && databaseStats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {getStoreIcon(selectedStore)}
                      {selectedStore} 记录管理
                    </span>
                    <div className="flex gap-2">
                      <Select value={selectedStore} onValueChange={setSelectedStore}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="选择存储" />
                        </SelectTrigger>
                        <SelectContent>
                          {databaseStats.objectStores.map((store: ObjectStoreStats) => (
                            <SelectItem key={store.name} value={store.name}>
                              <div className="flex items-center gap-2">
                                {getStoreIcon(store.name)}
                                {store.name} ({store.recordCount})
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="w-4 h-4 mr-1" />
                            添加记录
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>添加新记录到 {selectedStore}</DialogTitle>
                            <DialogDescription>
                              请输入有效的 JSON 格式数据
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Label htmlFor="record-data">记录数据 (JSON)</Label>
                            <Textarea
                              id="record-data"
                              value={newRecordData}
                              onChange={(e) => setNewRecordData(e.target.value)}
                              placeholder='{"id": "example", "name": "示例", ...}'
                              rows={10}
                              className="font-mono"
                            />
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={async () => {
                                try {
                                  const data = JSON.parse(newRecordData)
                                  await saveRecord(selectedStore, data)
                                } catch {
                                  setError('JSON 格式不正确')
                                }
                              }}
                            >
                              添加记录
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 搜索和排序 */}
                  <div className="mb-4 flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="搜索记录..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={sortField} onValueChange={setSortField}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="排序字段" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id">ID</SelectItem>
                        <SelectItem value="createdAt">创建时间</SelectItem>
                        <SelectItem value="updatedAt">更新时间</SelectItem>
                        <SelectItem value="userId">用户ID</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sortDirection} onValueChange={(value: 'asc' | 'desc') => setSortDirection(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="排序方向" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">升序</SelectItem>
                        <SelectItem value="desc">降序</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 记录列表 */}
                  {loading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                      <div className="text-gray-600">加载中...</div>
                    </div>
                  ) : records.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      暂无记录
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {records.map((record, index) => (
                        <div key={record.id || index} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">ID: {record.id || 'N/A'}</Badge>
                              {record.userId && <Badge variant="secondary">用户: {record.userId}</Badge>}
                              {record.delFlag && <Badge variant="destructive">已删除</Badge>}
                              {record.createdAt && (
                                <Badge variant="outline">
                                  创建: {new Date(record.createdAt).toLocaleString()}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>记录详情</DialogTitle>
                                  </DialogHeader>
                                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                                    {JSON.stringify(record, null, 2)}
                                  </pre>
                                </DialogContent>
                              </Dialog>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>编辑记录</DialogTitle>
                                  </DialogHeader>
                                  <Textarea
                                    defaultValue={JSON.stringify(record, null, 2)}
                                    onChange={(e) => setNewRecordData(e.target.value)}
                                    rows={10}
                                    className="font-mono"
                                  />
                                  <DialogFooter>
                                    <Button
                                      onClick={async () => {
                                        try {
                                          const data = JSON.parse(newRecordData)
                                          await saveRecord(selectedStore, data, true)
                                        } catch {
                                          setError('JSON 格式不正确')
                                        }
                                      }}
                                    >
                                      更新记录
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => softDeleteRecord(selectedStore, record.id)}
                                title="软删除"
                              >
                                <AlertTriangle className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteRecord(selectedStore, record.id)}
                                title="永久删除"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 truncate">
                            {Object.entries(record)
                              .filter(([key]) => !['id', 'userId', 'createdAt', 'updatedAt', 'delFlag'].includes(key))
                              .slice(0, 3)
                              .map(([key, value]) => `${key}: ${String(value)}`)
                              .join(' | ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 健康检查 */}
          <TabsContent value="health" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  数据库健康检查
                  <Button 
                    onClick={performHealthCheck} 
                    size="sm" 
                    variant="outline"
                    disabled={loading}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    重新检查
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {healthCheck ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {healthCheck.healthy ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="font-medium">
                        整体状态: {healthCheck.healthy ? '健康' : '有问题'}
                      </span>
                    </div>
                    
                    {healthCheck.issues.length > 0 && (
                      <div>
                        <h4 className="font-medium text-red-600 mb-2">发现的问题:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {healthCheck.issues.map((issue: string, index: number) => (
                            <li key={index} className="text-sm text-red-600">{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {healthCheck.suggestions.length > 0 && (
                      <div>
                        <h4 className="font-medium text-orange-600 mb-2">建议:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {healthCheck.suggestions.map((suggestion: string, index: number) => (
                            <li key={index} className="text-sm text-orange-600">{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    点击"重新检查"进行健康检查
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 维护工具 */}
          <TabsContent value="tools" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 备份和恢复 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    备份和恢复
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={exportData} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    导出完整备份
                  </Button>
                  
                  <div>
                    <Label htmlFor="import-file">导入备份文件</Label>
                    <Input
                      id="import-file"
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          importData(file)
                        }
                      }}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 清理工具 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    清理工具
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedStore && (
                    <Button 
                      onClick={() => clearObjectStore(selectedStore)} 
                      variant="outline"
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      清空 {selectedStore}
                    </Button>
                  )}
                  
                  <Button 
                    onClick={resetDatabase} 
                    variant="destructive"
                    className="w-full"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    重置整个数据库
                  </Button>
                </CardContent>
              </Card>

              {/* 其他工具 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    其他工具
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={loadDatabaseInfo} 
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    刷新数据库信息
                  </Button>
                  
                  <Button 
                    onClick={() => window.open('/health-calendar', '_blank')} 
                    variant="outline"
                    className="w-full"
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    打开应用主页
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Debug 工具 */}
          <TabsContent value="debug" className="space-y-6">
            <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors" onClick={handleDebug}>
              Debug
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* IndexedDB */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    IndexedDB
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
            <textarea
              className="w-full h-[400px] border border-gray-300 rounded-md p-2"
              placeholder="输入一些内容..."
              value={usersIDB}
              onChange={(e) => setUsersIDB(e.target.value)}
            />
                </CardContent>
              </Card>

              {/* OneDrive */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    OneDrive
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
            <textarea
              className="w-full h-[400px] border border-gray-300 rounded-md p-2"
              placeholder="输入一些内容..."
              value={usersOneDrive}
              onChange={(e) => setUsersOneDrive(e.target.value)}
            />
                </CardContent>
              </Card>
            </div>
            <textarea
              className="w-full h-[400px] border border-gray-300 rounded-md p-2"
              placeholder="输入一些内容..."
              value={idbJson}
              onChange={(e) => setIDBJson(e.target.value)}
            />
            <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors" onClick={handleCreateIDBObject}>
              提交
            </button>
            &nbsp;&nbsp;
            <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors" onClick={initializeIDB}>
              Initialize IDB
            </button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default IndexedDBAdmin
