'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft,
  Calendar,
  Utensils,
  Weight,
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
  Sun,
  Moon,
  ArrowLeft
} from 'lucide-react'
import { userDB, User as UserType } from '../../lib/userDatabase'
import { HEALTH_CALENDAR_DB_VERSION } from '../../lib/dbVersion'

interface MealRecord {
  id: string
  userId: string
  date: string
  mealType: 'breakfast' | 'lunch' | 'dinner'
  amount: 'very_little' | 'little' | 'moderate' | 'much'
  notes: string
  tags: string[]
  attachments: string[]
  createdAt: string
  updatedAt: string
}

interface MealDatabase {
  ensureInitialized(): Promise<void>
  saveRecord(record: Omit<MealRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>
  updateRecord(id: string, record: Partial<MealRecord>): Promise<void>
  getRecord(id: string): Promise<MealRecord | null>
  getUserRecords(userId: string): Promise<MealRecord[]>
  deleteRecord(id: string): Promise<void>
}

class MealDB implements MealDatabase {
  private dbName = 'HealthCalendarDB'  // 使用与用户数据相同的数据库
  private version = HEALTH_CALENDAR_DB_VERSION  // 使用全局版本号
  private db: IDBDatabase | null = null

  async ensureInitialized(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('MealDB IndexedDB error:', request.error)
        reject(request.error)
      }
      
      request.onsuccess = () => {
        this.db = request.result
        console.log('MealDB initialized successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = (event.target as IDBOpenDBRequest).transaction!
        const oldVersion = event.oldVersion
        console.log('MealDB upgrade needed, current stores:', Array.from(db.objectStoreNames))
        
        // 确保用户存储存在（与 userDatabase 兼容）
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' })
          userStore.createIndex('name', 'name', { unique: false })
          userStore.createIndex('isActive', 'isActive', { unique: false })
          console.log('Created users object store')
        }
        
        // 创建饮食记录存储
        if (!db.objectStoreNames.contains('mealRecords')) {
          const store = db.createObjectStore('mealRecords', { keyPath: 'id' })
          store.createIndex('userId', 'userId', { unique: false })
          store.createIndex('date', 'date', { unique: false })
          console.log('Created mealRecords object store')
        }

        // 版本 4：添加 createdAt 和 updatedAt 字段迁移
        if (oldVersion < 4 && db.objectStoreNames.contains('mealRecords')) {
          const mealRecordsStore = transaction.objectStore('mealRecords')
          
          // 迁移饮食记录数据
          const mealRequest = mealRecordsStore.getAll()
          mealRequest.onsuccess = () => {
            const records = mealRequest.result
            records.forEach((record: any) => {
              const now = new Date().toISOString()
              if (!record.createdAt) {
                record.createdAt = record.date || now
              }
              if (!record.updatedAt) {
                record.updatedAt = record.date || now
              }
              mealRecordsStore.put(record)
            })
          }
        }
      }

      request.onblocked = () => {
        console.warn('MealDB IndexedDB upgrade blocked. Please close other tabs with this app.')
        reject(new Error('Database upgrade blocked'))
      }
    })
  }

  async saveRecord(record: Omit<MealRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    await this.ensureInitialized()
    
    const id = Date.now().toString()
    const now = new Date().toISOString()
    const fullRecord: MealRecord = {
      ...record,
      id,
      createdAt: now,
      updatedAt: now
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mealRecords'], 'readwrite')
      const store = transaction.objectStore('mealRecords')
      const request = store.add(fullRecord)

      request.onsuccess = () => resolve(id)
      request.onerror = () => reject(request.error)
    })
  }

  async updateRecord(id: string, updates: Partial<MealRecord>): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mealRecords'], 'readwrite')
      const store = transaction.objectStore('mealRecords')
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

  async getRecord(id: string): Promise<MealRecord | null> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mealRecords'], 'readonly')
      const store = transaction.objectStore('mealRecords')
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getUserRecords(userId: string): Promise<MealRecord[]> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mealRecords'], 'readonly')
      const store = transaction.objectStore('mealRecords')
      const index = store.index('userId')
      const request = index.getAll(userId)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteRecord(id: string): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mealRecords'], 'readwrite')
      const store = transaction.objectStore('mealRecords')
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

const mealDB = new MealDB()

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
        <div className="absolute right-0 mt-2 py-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => {
                onUserChange(user)
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 ${
                currentUser?.id === user.id ? 'bg-health-primary/5' : ''
              }`}
            >
              <img 
                src={user.avatarUrl} 
                alt={user.name} 
                className="w-6 h-6 rounded-full"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-user.jpg'
                }}
              />
              <span className="text-sm font-medium">{user.name}</span>
              {currentUser?.id === user.id && (
                <Check className="w-4 h-4 text-health-primary ml-auto" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MealPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const isEditMode = !!editId

  // 用户状态
  const [users, setUsers] = useState<UserType[]>([])
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)

  // 表单状态
  const [date, setDate] = useState('')
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast')
  const [amount, setAmount] = useState<'very_little' | 'little' | 'moderate' | 'much'>('moderate')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>(['健康', '美味'])
  const [attachments, setAttachments] = useState<string[]>([])

  // UI状态
  const [isLoading, setIsLoading] = useState(false)
  const [showCustomTagInput, setShowCustomTagInput] = useState(false)
  const [customTag, setCustomTag] = useState('')
  const [showFullImageModal, setShowFullImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string>('')

  const presetTags = ['健康', '美味', '营养', '清淡', '鱼肉', '酒精饮品', '油炸类', '肉类', '素食', '辛辣']

  useEffect(() => {
    initializeData()
  }, [editId])

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

  const initializeData = async () => {
    try {
      setIsLoading(true)
      await userDB.ensureInitialized()
      await mealDB.ensureInitialized()

      const allUsers = await userDB.getAllUsers()
      const activeUser = await userDB.getActiveUser()
      
      setUsers(allUsers)
      setCurrentUser(activeUser)

      // 设置默认日期时间
      const now = new Date()
      const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      setDate(localDateTime.toISOString().slice(0, 16))

      // 如果是编辑模式，加载记录数据
      if (isEditMode && editId) {
        const record = await mealDB.getRecord(editId)
        if (record) {
          setDate(record.date)
          setMealType(record.mealType)
          setAmount(record.amount)
          setNotes(record.notes)
          setTags(record.tags)
          setAttachments(record.attachments)
        }
      }
    } catch (error) {
      console.error('初始化数据失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserChange = async (user: UserType) => {
    setCurrentUser(user)
    await userDB.setActiveUser(user.id)
  }

  const handleSaveRecord = async () => {
    if (!currentUser) {
      alert('请选择用户')
      return
    }

    try {
      setIsLoading(true)

      const recordData = {
        userId: currentUser.id,
        date,
        mealType,
        amount,
        notes,
        tags,
        attachments
      }

      if (isEditMode && editId) {
        await mealDB.updateRecord(editId, recordData)
        alert('记录更新成功！')
      } else {
        await mealDB.saveRecord(recordData)
        alert('记录保存成功！')
      }

      router.push('/health-calendar')
    } catch (error) {
      console.error('保存记录失败:', error)
      alert('保存失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag])
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleAddCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags([...tags, customTag.trim()])
      setCustomTag('')
      setShowCustomTagInput(false)
    }
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

  const mealTypeOptions = [
    { id: 'breakfast', label: '早餐', desc: '06:00-10:00', icon: Sun, color: 'orange' },
    { id: 'lunch', label: '午餐', desc: '11:00-14:00', icon: Sun, color: 'yellow' },
    { id: 'dinner', label: '晚餐', desc: '17:00-20:00', icon: Moon, color: 'purple' }
  ]

  const amountOptions = [
    { id: 'very_little', label: '很少', desc: '25%' },
    { id: 'little', label: '偏少', desc: '50%' },
    { id: 'moderate', label: '适中', desc: '75%' },
    { id: 'much', label: '偏多', desc: '100%' }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-health-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-x-hidden">
      {/* 背景 */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 opacity-10"></div>
      <div className="fixed inset-0 bg-white/10"></div>

      <div className="relative min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-50 px-3 py-2 bg-white/25 backdrop-blur-md border-b border-white/20">
          <div className="flex items-center justify-between">
            {/* Back Button and Title */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => router.push('/health-calendar')}
                className="w-8 h-8 bg-white/30 backdrop-blur-sm rounded-xl hover:bg-white/40 transition-all border border-white/20 flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700" />
              </button>
              <div>
                <h1 className="text-base font-bold text-gray-800">
                  {isEditMode ? '编辑饮食记录' : '一日三餐记录'}
                </h1>
                <p className="text-xs text-gray-600">记录您的饮食详情</p>
              </div>
            </div>

            {/* User Switcher */}
            <UserSwitcher
              currentUser={currentUser}
              users={users}
              onUserChange={handleUserChange}
            />
          </div>
        </header>

        {/* Main Content */}
        <main className="px-3 py-2 pb-16">
          {/* Main Form Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3 mb-3 shadow-xl border border-white/20">
            {/* Date and Time Section */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Calendar className="text-health-primary mr-1.5 w-4 h-4" />
                日期时间
              </h3>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">选择日期和时间</label>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-2 border border-gray-200 rounded-lg focus:border-health-primary focus:ring-2 focus:ring-health-primary/20 transition-all text-sm"
                />
              </div>
            </div>

            <hr className="border-gray-200 mb-3" />

            {/* Meal Type Selection */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Utensils className="text-health-primary mr-1.5 w-4 h-4" />
                餐次类型
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {mealTypeOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setMealType(option.id as any)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      mealType === option.id
                        ? 'bg-gradient-to-br from-green-500 to-emerald-400 text-white border-green-500 shadow-lg shadow-green-500/30 transform scale-105'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                      mealType === option.id 
                        ? 'bg-white/20' 
                        : option.color === 'orange' ? 'bg-orange-100' :
                          option.color === 'yellow' ? 'bg-yellow-100' : 'bg-purple-100'
                    }`}>
                      <option.icon className={`w-4 h-4 ${
                        mealType === option.id 
                          ? 'text-white' 
                          : option.color === 'orange' ? 'text-orange-500' :
                            option.color === 'yellow' ? 'text-yellow-500' : 'text-purple-500'
                      }`} />
                    </div>
                    <div className={`text-sm font-semibold ${
                      mealType === option.id ? 'text-white' : 'text-gray-800'
                    }`}>{option.label}</div>
                    <div className={`text-xs mt-0.5 ${
                      mealType === option.id ? 'text-white/90' : 'text-gray-500'
                    }`}>{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-gray-200 mb-3" />

            {/* Food Amount Selection */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Weight className="text-health-primary mr-1.5 w-4 h-4" />
                食量选择
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {amountOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setAmount(option.id as any)}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      amount === option.id
                        ? 'bg-gradient-to-br from-green-500 to-emerald-400 border-green-500 shadow-lg shadow-green-500/30'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`text-sm font-semibold ${
                      amount === option.id ? 'text-white' : 'text-gray-800'
                    }`}>{option.label}</div>
                    <div className={`text-xs mt-0.5 ${
                      amount === option.id ? 'text-white/90' : 'text-gray-500'
                    }`}>{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-gray-200 mb-3" />

            {/* Food Description */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Edit3 className="text-health-primary mr-1.5 w-4 h-4" />
                饮食备注
              </h3>
              <textarea
                placeholder="请描述您的饮食内容，如：全麦面包 + 鸡蛋 + 牛奶，口感如何，心情怎样..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-200 rounded-lg focus:border-health-primary focus:ring-2 focus:ring-health-primary/20 transition-all resize-none text-sm"
              />
            </div>

            <hr className="border-gray-200 mb-3" />

            {/* Tags Selection */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Tags className="text-health-primary mr-1.5 w-4 h-4" />
                标签选择
              </h3>

              {/* Preset Tags */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {presetTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => tags.includes(tag) ? handleRemoveTag(tag) : handleAddTag(tag)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                      tags.includes(tag)
                        ? 'bg-gradient-to-br from-green-500 to-emerald-400 border-green-500 shadow-lg shadow-green-500/30 text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                
                <button
                  onClick={() => setShowCustomTagInput(!showCustomTagInput)}
                  className="px-2 py-1 bg-health-primary/10 border border-health-primary/30 rounded-full text-xs font-medium text-health-primary cursor-pointer transition-all hover:bg-health-primary/20 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>自定义</span>
                </button>
              </div>

              {/* Custom Tag Input */}
              {showCustomTagInput && (
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="输入自定义标签..."
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTag()}
                    className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg focus:border-health-primary focus:ring-2 focus:ring-health-primary/20 transition-all text-xs"
                    maxLength={10}
                  />
                  <button
                    onClick={handleAddCustomTag}
                    className="px-2.5 py-1.5 bg-health-primary text-white text-xs rounded-lg hover:bg-green-600 transition-colors"
                  >
                    添加
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomTagInput(false)
                      setCustomTag('')
                    }}
                    className="px-2.5 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                </div>
              )}

              {/* Selected Tags Display */}
              {tags.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500 mb-1">已选择的标签：</div>
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-health-primary/10 text-health-primary text-xs rounded-md border border-health-primary/20 flex items-center space-x-1"
                      >
                        <span>{tag}</span>
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-health-primary/60 hover:text-health-primary"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <hr className="border-gray-200 mb-3" />

            {/* File Upload Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Paperclip className="text-health-primary mr-1.5 w-4 h-4" />
                附件上传
                {attachments.length > 0 && (
                  <span className="ml-2 text-xs bg-health-primary/10 text-health-primary px-2 py-0.5 rounded-full">
                    {attachments.length}/5
                  </span>
                )}
              </h3>

              {/* Upload Area */}
              {attachments.length < 5 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center mb-3 hover:border-health-primary transition-colors">
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
                    className="px-3 py-1.5 bg-health-primary text-white text-xs rounded-lg hover:bg-green-600 transition-colors"
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
                          className="aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer border-2 border-transparent hover:border-health-primary transition-all transform hover:scale-105 shadow-sm"
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
                        
                        {/* Delete Button - 更显眼的删除按钮 */}
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

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => router.push('/health-calendar')}
              className="py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors text-sm"
            >
              <ChevronLeft className="inline w-4 h-4 mr-1.5" />
              返回
            </button>
            <button
              onClick={handleSaveRecord}
              disabled={isLoading || !currentUser}
              className="py-2.5 bg-health-primary text-white font-semibold rounded-xl hover:bg-green-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="inline w-4 h-4 mr-1.5" />
              {isEditMode ? '更新记录' : '保存记录'}
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

function MealPageFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>
  )
}

export default function MealPage() {
  return (
    <Suspense fallback={<MealPageFallback />}>
      <MealPageContent />
    </Suspense>
  )
}