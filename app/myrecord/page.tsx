'use client'

import React, { useState, useEffect, Suspense } from 'react'
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

// 导入数据库类型，避免重复定义
interface MyRecord {
  id: string
  userId: string
  dateTime: string
  content: string
  tags: string[]
  attachments: string[]
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
  
  // 表单状态
  const [dateTime, setDateTime] = useState('')
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>(['想法', '灵感'])
  const [attachments, setAttachments] = useState<string[]>([])
  
  // UI状态 - 仿照stool页面
  const [showFullImageModal, setShowFullImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string>('')

  // 初始化
  useEffect(() => {
    loadUsers()
    initializeDateTime()
    
    // 检查是否为编辑模式
    const editId = searchParams.get('edit')
    if (editId) {
      setIsEditing(true)
      setEditingId(editId)
      loadRecordForEdit(editId)
    }
  }, [searchParams])

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
      // const record = await myRecordDB.getRecord(id)
      const record = await adminService.getUserRecord('myRecords', currentUser?.id, id)
      if (record) {
        setDateTime(record.dateTime)
        setContent(record.content)
        setSelectedTags(record.tags)
        setAttachments(record.attachments)
      }
    } catch (error) {
      console.error('Failed to load record for edit:', error)
    }
  }

  const handleUserChange = async (user: UserType) => {
    // 更新用户活跃状态
    await userDB.setActiveUser(user.id)
    setCurrentUser(user)
    
    // 重新加载用户列表以更新活跃状态
    const updatedUsers = await userDB.getAllUsers()
    setUsers(updatedUsers)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const maxFiles = 5
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

    const processFiles = async () => {
      const newAttachments: string[] = []
      const filesToProcess = Array.from(files).slice(0, maxFiles - attachments.length)

      for (const file of filesToProcess) {
        if (file.size > maxSize) {
          alert(`文件 ${file.name} 太大，请选择小于5MB的文件`)
          continue
        }

        if (!allowedTypes.includes(file.type)) {
          alert(`文件 ${file.name} 格式不支持，请选择图片文件`)
          continue
        }

        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target?.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })

          newAttachments.push(dataUrl)
        } catch (error) {
          console.error('读取文件失败:', error)
          alert(`读取文件 ${file.name} 失败`)
        }
      }

      if (newAttachments.length > 0) {
        setAttachments(prev => [...prev, ...newAttachments])
      }
    }

    processFiles()

    // 清空input value 以允许重复选择同一文件
    event.target.value = ''
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

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
      {/* 背景层 */}
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

              {/* Upload Area */}
              {attachments.length < 5 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center mb-3 hover:border-green-500 transition-colors">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <CloudUpload className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-xs font-medium text-gray-700 mb-1">点击上传或拖拽图片</div>
                  <div className="text-xs text-gray-500 mb-2">支持 JPG, PNG, GIF, WebP 格式，单个文件不超过5MB</div>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    multiple
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    id="fileInput"
                  />
                  <button
                    onClick={() => document.getElementById('fileInput')?.click()}
                    className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors"
                  >
                    选择图片
                  </button>
                </div>
              )}

              {/* Attached Images Preview */}
              {attachments.length > 0 && (
                <div>
                  <div className="text-xs text-gray-600 mb-2 flex items-center justify-between">
                    <div className="flex items-center">
                      <FileImage className="w-3 h-3 mr-1" />
                      已上传的图片 ({attachments.length})
                    </div>
                    <div className="text-xs text-gray-400">
                      悬停图片显示删除按钮
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="relative group">
                        <div 
                          className="aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer border-2 border-transparent hover:border-green-500 transition-all transform hover:scale-105 shadow-sm"
                          onClick={() => handleViewFullImage(attachment)}
                        >
                          <img
                            src={attachment}
                            alt={`附件 ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              console.error('图片加载失败:', attachment.substring(0, 50))
                              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyNkM3LjI1IDI2IDIgMTUuMjUgMiAxNS4yNUMyIDE1LjI1IDcuMjUgNC41IDIwIDQuNUMzMi43NSA0LjUgMzggMTUuMjUgMzggMTUuMjVDMzggMTUuMjUgMzIuNzUgMjYgMjAgMjZaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxjaXJjbGUgY3g9IjIwIiBjeT0iMTUuMjUiIHI9IjMuNzUiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg=='
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                                <FileImage className="w-4 h-4 text-gray-700" />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('确定要删除这张图片吗？')) {
                              handleRemoveAttachment(index)
                            }
                          }}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-lg border-2 border-white opacity-80 hover:opacity-100 group-hover:scale-110"
                          title="删除图片"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        {/* Image Index */}
                        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full backdrop-blur-sm font-medium">
                          {index + 1}
                        </div>

                        {/* Image Size Info */}
                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          {Math.round(attachment.length / 1024)} KB
                        </div>

                        {/* 删除提示（悬停时显示） */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                            点击右上角 × 删除
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 批量删除按钮 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">共 {attachments.length} 张图片</span>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`确定要删除所有 ${attachments.length} 张图片吗？`)) {
                          setAttachments([])
                        }
                      }}
                      className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded-md hover:bg-red-100 transition-colors border border-red-200 flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>全部删除</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Tips */}
              <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                <div className="flex items-center space-x-1.5 mb-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                  </div>
                  <span className="text-xs font-medium text-blue-700">使用说明</span>
                </div>
                <div className="text-xs text-blue-600 space-y-0.5">
                  <div>• 最多可上传5张图片，每张不超过5MB</div>
                  <div>• 支持JPG、PNG、GIF、WebP格式</div>
                  <div>• 点击图片可查看大图</div>
                  <div>• <strong>删除图片</strong>：将鼠标悬停在图片上，点击右上角红色 × 按钮</div>
                  <div>• 或使用"全部删除"按钮清除所有图片</div>
                </div>
              </div>
            </div>
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
