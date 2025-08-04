'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft,
  Calendar,
  Edit3,
  Tags,
  Paperclip,
  CloudUpload,
  X,
  Check,
  Plus,
  Trash2,
  FileImage,
  File,
  Clock,
  ArrowLeft
} from 'lucide-react'
import { userDB, User as UserType } from '../../lib/userDatabase'
import { HEALTH_CALENDAR_DB_VERSION } from '../../lib/dbVersion'
import { adminService } from '@/lib/adminService'
import { useOneDriveSync } from '../../hooks/useOneDriveSync'
import { AttachmentUploader } from '../../components/AttachmentUploader'
import { AttachmentViewer } from '../../components/AttachmentViewer'
import { Attachment } from '../../types/attachment'

// 导入数据库类型，避免重复定义
interface MyRecord {
  id: string
  userId: string
  dateTime: string
  content: string
  tags: string[]
  attachments: Attachment[]
  createdAt: string
  updatedAt: string
}

// 使用简化的数据库接口，实际实现在 HealthCalendar 中
class MyRecordDB {
  private dbName = 'HealthCalendarDB'
  private version = HEALTH_CALENDAR_DB_VERSION  // 全局版本号
  private db: IDBDatabase | null = null

  async ensureInitialized(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('MyRecordDB IndexedDB error:', request.error)
        reject(request.error)
      }
      
      request.onsuccess = () => {
        this.db = request.result
        console.log('MyRecordDB initialized successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        console.log('MyRecordDB upgrade needed, current stores:', Array.from(db.objectStoreNames))
        
        // 这些表应该已经由其他组件创建了，这里只是确保兼容性
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' })
          userStore.createIndex('name', 'name', { unique: false })
          userStore.createIndex('isActive', 'isActive', { unique: false })
        }
        
        if (!db.objectStoreNames.contains('stoolRecords')) {
          const stoolStore = db.createObjectStore('stoolRecords', { keyPath: 'id' })
          stoolStore.createIndex('userId', 'userId', { unique: false })
          stoolStore.createIndex('date', 'date', { unique: false })
        }
        
        if (!db.objectStoreNames.contains('myRecords')) {
          const store = db.createObjectStore('myRecords', { keyPath: 'id' })
          store.createIndex('userId', 'userId', { unique: false })
          store.createIndex('dateTime', 'dateTime', { unique: false })
          console.log('Created myRecords object store')
        }
      }

      request.onblocked = () => {
        console.warn('MyRecordDB IndexedDB upgrade blocked.')
        reject(new Error('Database upgrade blocked'))
      }
    })
  }

  async saveRecord(record: Omit<MyRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    await this.ensureInitialized()
    
    const id = Date.now().toString()
    const now = new Date().toISOString()
    const fullRecord: MyRecord = {
      ...record,
      id,
      createdAt: now,
      updatedAt: now
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['myRecords'], 'readwrite')
      const store = transaction.objectStore('myRecords')
      const request = store.add(fullRecord)

      request.onsuccess = () => resolve(id)
      request.onerror = () => reject(request.error)
    })
  }

  async updateRecord(id: string, updates: Partial<MyRecord>): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['myRecords'], 'readwrite')
      const store = transaction.objectStore('myRecords')
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const record = getRequest.result
        if (!record) {
          reject(new Error('Record not found'))
          return
        }

        const updatedRecord = {
          ...record,
          ...updates,
          updatedAt: new Date().toISOString()
        }

        const putRequest = store.put(updatedRecord)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async getRecord(id: string): Promise<MyRecord | null> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['myRecords'], 'readonly')
      const store = transaction.objectStore('myRecords')
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getUserRecords(userId: string): Promise<MyRecord[]> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['myRecords'], 'readonly')
      const store = transaction.objectStore('myRecords')
      const index = store.index('userId')
      const request = index.getAll(userId)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteRecord(id: string): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['myRecords'], 'readwrite')
      const store = transaction.objectStore('myRecords')
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

const myRecordDB = new MyRecordDB()

// 动态图片组件
const DynamicImage: React.FC<{
  attachment: Attachment;
  onGetUrl: (fileName: string) => Promise<string>;
  onClick: () => void;
  isOneDriveConnected: boolean;
}> = ({ attachment, onGetUrl, onClick, isOneDriveConnected }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [hasAttempted, setHasAttempted] = useState(false)

  useEffect(() => {
    // 只在OneDrive连接且未尝试过时才加载
    if (!isOneDriveConnected || hasAttempted) {
      return
    }

    const loadImage = async () => {
      try {
        setLoading(true)
        setError(false)
        setHasAttempted(true)
        
        const url = await onGetUrl(attachment.fileName)
        setImageUrl(url)
      } catch (err) {
        console.error('Failed to load image:', attachment.fileName, err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadImage()
  }, [isOneDriveConnected, hasAttempted]) // 移除了会变化的依赖项

  // 重置状态的 effect，只在文件名变化时执行
  useEffect(() => {
    setHasAttempted(false)
    setImageUrl(null)
    setLoading(true)
    setError(false)
  }, [attachment.fileName])

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto mb-1"></div>
          <div className="text-xs text-gray-500">
            {!isOneDriveConnected ? '等待连接...' : '加载中...'}
          </div>
        </div>
      </div>
    )
  }

  if (error || !imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <FileImage className="w-8 h-8 text-gray-400 mx-auto mb-1" />
          <div className="text-xs text-gray-500">
            {!isOneDriveConnected ? 'OneDrive未连接' : '图片加载失败'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={attachment.fileName}
      className="w-full h-full object-cover cursor-pointer"
      onClick={onClick}
      onError={() => setError(true)}
    />
  )
}

// 用户切换组件
const UserSwitcher: React.FC<{
  currentUser: UserType | null
  users: UserType[]
  onUserChange: (user: UserType) => void
}> = ({ currentUser, users, onUserChange }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-2 py-1 bg-white/30 backdrop-blur-sm rounded-xl hover:bg-white/40 transition-all border border-white/20"
      >
        {currentUser && (
          <img 
            src={currentUser.avatarUrl} 
            alt="用户头像" 
            className="w-5 h-5 rounded-full ring-1 ring-white/50"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-user.jpg'
            }}
          />
        )}
        <span className="text-xs font-semibold text-gray-800">
          {currentUser?.name || '选择用户'}
        </span>
        <ChevronLeft className={`w-3 h-3 text-gray-500 transform transition-transform ${isOpen ? 'rotate-90' : '-rotate-90'}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-white/90 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg z-50">
          <div className="p-2">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  onUserChange(user)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/50 transition-colors ${
                  currentUser?.id === user.id ? 'bg-green-100/80 text-green-800' : 'text-gray-700'
                }`}
              >
                <img 
                  src={user.avatarUrl} 
                  alt={user.name} 
                  className="w-4 h-4 rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-user.jpg'
                  }}
                />
                <span className="text-xs font-medium">{user.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// 标签管理组件
const TagManager: React.FC<{
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
}> = ({ selectedTags, onTagsChange }) => {
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customTag, setCustomTag] = useState('')

  // 预设标签
  const presetTags = [
    '重要', '待办', '完成', '想法', '灵感', '提醒',
    '工作', '学习', '生活', '健康', '旅行', '其他', '东西放哪儿了'
  ]

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag]
    onTagsChange(newTags)
  }

  const addCustomTag = () => {
    if (customTag.trim() && customTag.length <= 10 && !selectedTags.includes(customTag.trim())) {
      onTagsChange([...selectedTags, customTag.trim()])
      setCustomTag('')
      setShowCustomInput(false)
    }
  }

  const removeTag = (tag: string) => {
    onTagsChange(selectedTags.filter(t => t !== tag))
  }

  return (
    <div className="space-y-3">
      {/* 标签选择区域 */}
      <div className="flex flex-wrap gap-1.5">
        {presetTags.map((tag) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${
              selectedTags.includes(tag)
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md transform scale-105'
                : 'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            {tag}
          </button>
        ))}
        
        {/* 自定义标签按钮 */}
        <button
          onClick={() => setShowCustomInput(true)}
          className="px-2 py-1 bg-green-100 border border-green-300 rounded-full text-xs font-medium text-green-600 cursor-pointer transition-all hover:bg-green-200 hover:shadow-md hover:-translate-y-0.5 flex items-center space-x-1"
        >
          <Plus className="w-3 h-3" />
          <span>自定义</span>
        </button>
      </div>

      {/* 自定义标签输入 */}
      {showCustomInput && (
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            placeholder="输入自定义标签..."
            className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-xs"
            maxLength={10}
            onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
          />
          <button
            onClick={addCustomTag}
            className="px-2.5 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors"
          >
            添加
          </button>
          <button
            onClick={() => {
              setShowCustomInput(false)
              setCustomTag('')
            }}
            className="px-2.5 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
        </div>
      )}

      {/* 已选择的标签显示 */}
      {selectedTags.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">已选择的标签：</div>
          <div className="flex flex-wrap gap-1">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-green-100 text-green-600 text-xs rounded-md border border-green-200 flex items-center space-x-1"
              >
                <span>{tag}</span>
                <button
                  onClick={() => removeTag(tag)}
                  className="text-green-500 hover:text-green-700 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


function MyRecordPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // 状态管理
  const [users, setUsers] = useState<UserType[]>([])
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // OneDrive 同步状态
  const [oneDriveState, oneDriveActions] = useOneDriveSync()
  
  // 监听OneDrive状态变化（调试用）
  useEffect(() => {
    console.log('🌐 MyRecord页面 - OneDrive状态变化:', {
      isAuthenticated: oneDriveState.isAuthenticated,
      isConnecting: oneDriveState.isConnecting,
      userInfo: oneDriveState.userInfo,
      error: oneDriveState.error,
      lastSyncTime: oneDriveState.lastSyncTime
    })
  }, [oneDriveState.isAuthenticated, oneDriveState.isConnecting, oneDriveState.error])
  
  // 表单状态
  const [dateTime, setDateTime] = useState('')
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>(['想法', '灵感'])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  
  // UI状态 - 仿照stool页面
  const [showFullImageModal, setShowFullImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string>('')
  const [compressImages, setCompressImages] = useState(true) // 默认开启图片压缩

  // 初始化
  useEffect(() => {
    const initializeData = async () => {
      await loadUsers()
      initializeDateTime()
      
      // 检查是否为编辑模式
      const editId = searchParams.get('edit')
      if (editId) {
        setIsEditing(true)
        setEditingId(editId)
      }
    }
    
    initializeData()
  }, [searchParams])
  
  // 单独的OneDrive初始化，只执行一次
  useEffect(() => {
    oneDriveActions.checkConnection()
  }, [])

  // 当用户加载完成且处于编辑模式时，加载记录
  useEffect(() => {
    if (currentUser && editingId && isEditing) {
      loadRecordForEdit(editingId)
    }
  }, [currentUser, editingId, isEditing])


  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showFullImageModal) {
        setShowFullImageModal(false)
      }
    }

    if (showFullImageModal) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden' // 防止背景滚动
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [showFullImageModal])

  const loadUsers = async () => {
    try {
      // const allUsers = await userDB.getAllUsers()
      // setUsers(allUsers)
      // const activeUser = allUsers.find(user => user.isActive) || allUsers[0]
      // setCurrentUser(activeUser)
      // 获取所有用户
      const allUsers = await adminService.getAllUsers()

      // 初始化默认用户（如果没有用户）
      const defaultUser = await adminService.getDefaultUser()
        
      setUsers(allUsers)
      setCurrentUser(await adminService.getCurrentUser() || defaultUser)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load users:', error)
      setLoading(false)
    }
  }

  const initializeDateTime = () => {
    const now = new Date()
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    setDateTime(localDateTime.toISOString().slice(0, 16))
    // setDateTime(now.toISOString().slice(0, 16))
  }

  const loadRecordForEdit = async (id: string) => {
    try {
      if (!currentUser?.id) {
        console.error('当前用户未找到')
        return
      }
      
      const record = await adminService.getUserRecord('myRecords', currentUser.id, id)
      if (record) {
        setDateTime(record.dateTime)
        setContent(record.content)
        setSelectedTags(record.tags || [])
        setAttachments(record.attachments || [])
        console.log('Loaded record for edit:', record)
      }
    } catch (error) {
      console.error('Failed to load record for edit:', error)
    }
  }

  const handleUserChange = async (user: UserType) => {
    await adminService.setCurrentUser(user.id)
    // 更新用户活跃状态
    // await userDB.setActiveUser(user.id)
    // setCurrentUser(user)
    setCurrentUser(users.find(u => u.id === user.id) || null)
    
    // 重新加载用户列表以更新活跃状态
    // const updatedUsers = await userDB.getAllUsers()
    // setUsers(updatedUsers)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // 这个函数现在由 AttachmentUploader 组件处理
    // 保留以避免破坏现有引用，但不再使用
  }

  const handleRemoveAttachment = (index: number) => {
    // 这个函数现在由 AttachmentUploader 组件处理
    // 保留以避免破坏现有引用，但不再使用
  }

  // 新的附件处理方法
  const handleAttachmentsChange = (newAttachments: Attachment[]) => {
    setAttachments(newAttachments)
  }

  const handleAttachmentUpload = async (file: File, recordType: string, recordId: string): Promise<string> => {
    return await oneDriveActions.uploadAttachment(file, recordType, recordId)
  }

  const handleAttachmentDelete = async (fileName: string): Promise<void> => {
    await oneDriveActions.deleteAttachment(fileName)
  }

  const handleAttachmentGetUrl = useCallback(async (fileName: string): Promise<string> => {
    return await oneDriveActions.getAttachmentUrl(fileName)
  }, [oneDriveActions.getAttachmentUrl])

  const handleViewFullImage = (imageUrl: string) => {
    setSelectedImage(imageUrl)
    setShowFullImageModal(true)
  }

  const handleSave = async () => {
    if (!currentUser || !content.trim()) {
      alert('请填写记录内容')
      return
    }

    try {
      const recordData = {
        userId: currentUser.id,
        dateTime,
        content: content.trim(),
        tags: selectedTags,
        attachments
      }

      if (isEditing && editingId) {
        // await myRecordDB.updateRecord(editingId, recordData)
        await adminService.updateMyRecord(editingId, recordData)
        // alert('记录已更新！')
      } else {
        // await myRecordDB.saveRecord(recordData)
        await adminService.saveMyRecord(recordData)
        // alert('记录已保存！')
      }

      // 返回到健康日历页面
      router.push('/health-calendar')
    } catch (error) {
      console.error('Failed to save record:', error)
      alert('保存失败，请重试')
    }
  }

  const handleBack = () => {
    router.push('/health-calendar')
  }

  const handleClose = () => {
    if (content.trim() || selectedTags.length > 0 || attachments.length > 0) {
      if (confirm('确定要关闭表单吗？未保存的数据将丢失。')) {
        router.push('/health-calendar')
      }
    } else {
      router.push('/health-calendar')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500">
      <div className="fixed inset-0 bg-white/10"></div>
      <div className="relative min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-50 px-3 py-2 bg-white/25 backdrop-blur-md border-b border-white/20">
          <div className="flex items-center justify-between">
            {/* 左侧：返回按钮和标题 */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBack}
                className="w-8 h-8 bg-white/30 backdrop-blur-sm rounded-xl hover:bg-white/40 transition-all border border-white/20 flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 text-gray-700" />
              </button>
              <div>
                <h1 className="text-base font-bold text-gray-800">
                  {isEditing ? '编辑记录' : '我的记录'}
                </h1>
                <p className="text-xs text-gray-600">记录您的生活点滴</p>
              </div>
            </div>
            
            {/* 右侧：用户切换 */}
            <UserSwitcher
              currentUser={currentUser}
              users={users}
              onUserChange={handleUserChange}
            />
          </div>
        </header>

        {/* Main Content */}
        <main className="px-3 py-2 pb-16">
          {/* 主表单卡片 */}
          <div className="bg-gradient-to-b from-white to-gray-50 rounded-2xl p-3 mb-3 shadow-lg border border-white/40 relative">
            {/* 关闭按钮 */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 w-6 h-6 bg-gray-100 hover:bg-red-100 rounded-full flex items-center justify-center transition-all z-10"
            >
              <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
            </button>
            
            {/* 日期时间部分 */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Calendar className="w-4 h-4 text-green-500 mr-1.5" />
                记录时间
              </h3>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">选择日期和时间</label>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full px-2.5 py-2 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-sm"
                />
              </div>
            </div>

            {/* 分隔线 */}
            <hr className="border-gray-200 mb-3" />

            {/* 记录内容 */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Edit3 className="w-4 h-4 text-green-500 mr-1.5" />
                记录内容
              </h3>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请输入您的记录内容..."
                rows={3}
                className="w-full px-2.5 py-2 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all resize-none text-sm"
              />
            </div>

            {/* 分隔线 */}
            <hr className="border-gray-200 mb-3" />

            {/* 标签选择 */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Tags className="w-4 h-4 text-green-500 mr-1.5" />
                标签选择
              </h3>
              <TagManager
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
              />
            </div>

            {/* 分隔线 */}
            <hr className="border-gray-200 mb-3" />

            {/* 文件上传 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Paperclip className="w-4 h-4 text-green-500 mr-1.5" />
                附件上传
                {attachments.length > 0 && (
                  <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                    {attachments.length}/5
                  </span>
                )}
              </h3>

              {/* 图片压缩选项 */}
              <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compressImages}
                    onChange={(e) => setCompressImages(e.target.checked)}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                  />
                  <div className="flex items-center space-x-1">
                    <span className="text-sm text-gray-700 font-medium">压缩图片</span>
                    <span className="text-xs text-gray-500">(推荐开启以节省存储空间)</span>
                  </div>
                </label>
                <div className="text-xs text-gray-500 mt-1 ml-6">
                  {compressImages 
                    ? "✓ 图片将被压缩至较小尺寸，减少存储空间占用" 
                    : "⚠️ 图片将保持原始大小，可能占用较多存储空间"
                  }
                </div>
              </div>

              {/* 使用新的 AttachmentUploader 组件 */}
              <AttachmentUploader
                oneDriveConnected={oneDriveState.isAuthenticated}
                onConnect={oneDriveActions.connect}
                attachments={attachments}
                onAttachmentsChange={handleAttachmentsChange}
                onUpload={handleAttachmentUpload}
                onDelete={handleAttachmentDelete}
                onGetUrl={handleAttachmentGetUrl}
                recordType="myrecord"
                recordId={editingId || 'new'}
                compressImages={compressImages}
              />

              {/* Existing Attachments Display */}
              {attachments.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-gray-600 mb-2 flex items-center justify-between">
                    <div className="flex items-center">
                      <FileImage className="w-3 h-3 mr-1" />
                      已上传的附件 ({attachments.length})
                    </div>
                    <div className="text-xs text-gray-400">
                      点击查看大图
                    </div>
                  </div>
                  
                  {/* Image Preview Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {attachments.map((attachment, index) => {
                      const isImage = attachment.mimeType?.startsWith('image/') || 
                                    attachment.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                      
                      return (
                        <div key={attachment.id || index} className="relative group">
                          {isImage ? (
                            <div 
                              className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 border border-gray-200"
                              onClick={async () => {
                                try {
                                  const imageUrl = await handleAttachmentGetUrl(attachment.fileName);
                                  handleViewFullImage(imageUrl);
                                } catch (error) {
                                  console.error('Failed to get image URL:', error);
                                }
                              }}
                            >
                              <DynamicImage
                                attachment={attachment}
                                onGetUrl={handleAttachmentGetUrl}
                                isOneDriveConnected={oneDriveState.isAuthenticated}
                                onClick={async () => {
                                  try {
                                    const imageUrl = await handleAttachmentGetUrl(attachment.fileName);
                                    handleViewFullImage(imageUrl);
                                  } catch (error) {
                                    console.error('Failed to get image URL:', error);
                                  }
                                }}
                              />
                              
                              {/* Overlay with zoom indicator */}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                                <div className="bg-white/90 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <FileImage className="w-4 h-4 text-gray-700" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                              <div className="text-center">
                                <File className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                                <div className="text-xs text-gray-500 truncate px-1">
                                  {attachment.fileName}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Delete button */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm('确定要删除这个附件吗？')) {
                                try {
                                  await handleAttachmentDelete(attachment.fileName);
                                  // Remove from local state
                                  setAttachments(prev => prev.filter((_, i) => i !== index));
                                } catch (error) {
                                  console.error('Failed to delete attachment:', error);
                                }
                              }
                            }}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                            title="删除附件"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          
                          {/* File name tooltip */}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 truncate">
                            {attachment.fileName}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  <AttachmentViewer
                    attachments={attachments}
                  />
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleBack}
                className="py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors text-sm flex items-center justify-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>返回</span>
              </button>
              <button
                onClick={handleSave}
                className="py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors text-sm flex items-center justify-center space-x-1"
              >
                <Check className="w-4 h-4" />
                <span>{isEditing ? '更新记录' : '保存记录'}</span>
              </button>
            </div>
          </div>
        </main>

        {/* Full Image Modal */}
        {showFullImageModal && selectedImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              onClick={() => setShowFullImageModal(false)}
            ></div>
            
            {/* Modal Content */}
            <div className="relative w-full h-full max-w-4xl max-h-full flex items-center justify-center">
              <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-full max-h-full">
                {/* Close Button */}
                <button
                  onClick={() => setShowFullImageModal(false)}
                  className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black/90 transition-colors backdrop-blur-sm shadow-lg"
                  title="关闭 (ESC)"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Image Container */}
                <div className="relative bg-gray-100 flex items-center justify-center min-h-[50vh]">
                  <img
                    src={selectedImage}
                    alt="全图预览"
                    className="max-w-full max-h-[85vh] object-contain"
                    style={{ maxWidth: '100%', height: 'auto' }}
                    onError={(e) => {
                      console.error('全屏图片加载失败')
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTMwQzM2LjI1IDEzMCAxMCA3Ni4yNSAxMCA3Ni4yNUMxMCA3Ni4yNSAzNi4yNSAyMi41IDEwMCAyMi41QzE2My43NSAyMi41IDE5MCA3Ni4yNSAxOTAgNzYuMjVDMTkwIDc2LjI1IDE2My43NSAxMzAgMTAwIDEzMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPGNpcmNsZSBjeD0iMTAwIiBjeT0iNzYuMjUiIHI9IjE4Ljc1IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjU3Mzg0Ij7lm77niYfliqDovb3lpLHotKU8L3RleHQ+Cjwvc3ZnPgo='
                    }}
                  />
                </div>

                {/* Image Info Bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <div className="text-white">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileImage className="w-5 h-5" />
                      <span className="font-medium">附件预览</span>
                    </div>
                    <div className="text-sm text-white/80 flex items-center space-x-4">
                      <span>点击任意位置关闭</span>
                      <span>•</span>
                      <span>按 ESC 键退出</span>
                      <span>•</span>
                      <span>大小: {Math.round(selectedImage.length / 1024)} KB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MyRecordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <MyRecordPageContent />
    </Suspense>
  )
}
