'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft,
  Calendar,
  Heart,
  Droplets,
  Palette,
  Smile,
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
  ArrowLeft,
  Play,
  Circle,
  Square
} from 'lucide-react'
import { userDB, User as UserType } from '../../lib/userDatabase'
import { HEALTH_CALENDAR_DB_VERSION } from '../../lib/dbVersion'
import { adminService } from '@/lib/adminService'
import { BaseRecord } from '@/type/baserecord'

// Period record types
type PeriodStatus = 'start' | 'ongoing' | 'end'
type FlowAmount = 'spotting' | 'light' | 'normal' | 'heavy'
type PeriodColor = 'bright-red' | 'dark-red' | 'deep-red' | 'orange-red' | 'pink'
type MoodType = 'very-sad' | 'sad' | 'neutral' | 'happy' | 'very-happy'

interface PeriodRecord extends BaseRecord {
  dateTime: string
  status: PeriodStatus
  flowAmount: FlowAmount
  color: PeriodColor
  mood: MoodType
  notes: string
  tags: string[]
  attachments: string[]
}

// Simplified database interface
class PeriodDB {
  private dbName = 'HealthCalendarDB'
  private version = HEALTH_CALENDAR_DB_VERSION
  private db: IDBDatabase | null = null

  async ensureInitialized(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('PeriodDB IndexedDB error:', request.error)
        reject(request.error)
      }
      
      request.onsuccess = () => {
        this.db = request.result
        console.log('PeriodDB initialized successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        console.log('PeriodDB upgrade needed, current stores:', Array.from(db.objectStoreNames))
        
        // These tables should already be created by other components
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
          const myRecordStore = db.createObjectStore('myRecords', { keyPath: 'id' })
          myRecordStore.createIndex('userId', 'userId', { unique: false })
          myRecordStore.createIndex('dateTime', 'dateTime', { unique: false })
        }
        
        if (!db.objectStoreNames.contains('periodRecords')) {
          const store = db.createObjectStore('periodRecords', { keyPath: 'id' })
          store.createIndex('userId', 'userId', { unique: false })
          store.createIndex('dateTime', 'dateTime', { unique: false })
          console.log('Created periodRecords object store')
        }
      }

      request.onblocked = () => {
        console.warn('PeriodDB IndexedDB upgrade blocked.')
        reject(new Error('Database upgrade blocked'))
      }
    })
  }

  async saveRecord(record: Omit<PeriodRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    await this.ensureInitialized()
    
    const id = Date.now().toString()
    const now = new Date().toISOString()
    const fullRecord: PeriodRecord = {
      ...record,
      id,
      createdAt: now,
      updatedAt: now
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['periodRecords'], 'readwrite')
      const store = transaction.objectStore('periodRecords')
      const request = store.add(fullRecord)

      request.onsuccess = () => resolve(id)
      request.onerror = () => reject(request.error)
    })
  }

  async updateRecord(id: string, updates: Partial<PeriodRecord>): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['periodRecords'], 'readwrite')
      const store = transaction.objectStore('periodRecords')
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

  async getRecord(id: string): Promise<PeriodRecord | null> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['periodRecords'], 'readonly')
      const store = transaction.objectStore('periodRecords')
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getUserRecords(userId: string): Promise<PeriodRecord[]> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['periodRecords'], 'readonly')
      const store = transaction.objectStore('periodRecords')
      const index = store.index('userId')
      const request = index.getAll(userId)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteRecord(id: string): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['periodRecords'], 'readwrite')
      const store = transaction.objectStore('periodRecords')
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

const periodDB = new PeriodDB()

// User switcher component
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
                  currentUser?.id === user.id ? 'bg-pink-100/80 text-pink-800' : 'text-gray-700'
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

// Tag manager component
const TagManager: React.FC<{
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
}> = ({ selectedTags, onTagsChange }) => {
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customTag, setCustomTag] = useState('')

  // Preset tags
  const presetTags = [
    '规律', '正常', '疼痛', '异常', '头痛', '腹痛', 
    '疲劳', '失眠', '情绪低落', '腰痛', '胸胀', '恶心'
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
      {/* Tag selection area */}
      <div className="flex flex-wrap gap-1.5">
        {presetTags.map((tag) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${
              selectedTags.includes(tag)
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md transform scale-105'
                : 'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            {tag}
          </button>
        ))}
        
        {/* Custom tag button */}
        <button
          onClick={() => setShowCustomInput(true)}
          className="px-2 py-1 bg-pink-100 border border-pink-300 rounded-full text-xs font-medium text-pink-600 cursor-pointer transition-all hover:bg-pink-200 hover:shadow-md hover:-translate-y-0.5 flex items-center space-x-1"
        >
          <Plus className="w-3 h-3" />
          <span>自定义</span>
        </button>
      </div>

      {/* Custom tag input */}
      {showCustomInput && (
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            placeholder="输入自定义标签..."
            className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all text-xs"
            maxLength={10}
            onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
          />
          <button
            onClick={addCustomTag}
            className="px-2.5 py-1.5 bg-pink-500 text-white text-xs rounded-lg hover:bg-pink-600 transition-colors"
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

      {/* Selected tags display */}
      {selectedTags.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">已选择的标签：</div>
          <div className="flex flex-wrap gap-1">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-pink-100 text-pink-600 text-xs rounded-md border border-pink-200 flex items-center space-x-1"
              >
                <span>{tag}</span>
                <button
                  onClick={() => removeTag(tag)}
                  className="text-pink-500 hover:text-pink-700 ml-1"
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

function PeriodPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State management
  const [users, setUsers] = useState<UserType[]>([])
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Form state
  const [dateTime, setDateTime] = useState('')
  const [status, setStatus] = useState<PeriodStatus>('start')
  const [flowAmount, setFlowAmount] = useState<FlowAmount>('normal')
  const [color, setColor] = useState<PeriodColor>('bright-red')
  const [mood, setMood] = useState<MoodType>('neutral')
  const [notes, setNotes] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>(['正常'])
  const [attachments, setAttachments] = useState<string[]>([])
  
  // UI state
  const [showFullImageModal, setShowFullImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string>('')

  // Initialize
  useEffect(() => {
    loadUsers()
    initializeDateTime()
    
    // Check if editing mode
    const editId = searchParams.get('edit')
    if (editId) {
      setIsEditing(true)
      setEditingId(editId)
      loadRecordForEdit(editId)
    }
  }, [searchParams])

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showFullImageModal) {
        setShowFullImageModal(false)
      }
    }

    if (showFullImageModal) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [showFullImageModal])

  const loadUsers = async () => {
    try {
      const allUsers = await adminService.getAllUsers()
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
  }

  const loadRecordForEdit = async (id: string) => {
    try {
      if (!currentUser?.id) {
        console.error('No current user available')
        return
      }
      const record = await adminService.getUserRecord('periodRecords', currentUser.id, id)
      if (record) {
        setDateTime(record.dateTime)
        setStatus(record.status)
        setFlowAmount(record.flowAmount)
        setColor(record.color)
        setMood(record.mood)
        setNotes(record.notes)
        setSelectedTags(record.tags)
        setAttachments(record.attachments)
      }
    } catch (error) {
      console.error('Failed to load record for edit:', error)
    }
  }

  const handleUserChange = async (user: UserType) => {
    setCurrentUser(user)
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
    if (!currentUser) {
      alert('请选择用户')
      return
    }

    try {
      const recordData = {
        userId: currentUser.id,
        dateTime,
        status,
        flowAmount,
        color,
        mood,
        notes: notes.trim(),
        tags: selectedTags,
        attachments,
        delFlag: false
      }

      if (isEditing && editingId) {
        await adminService.updatePeriodRecord(editingId, recordData)
      } else {
        await adminService.savePeriodRecord(recordData)
      }

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
    if (notes.trim() || selectedTags.length > 1 || attachments.length > 0) {
      if (confirm('确定要关闭表单吗？未保存的数据将丢失。')) {
        router.push('/health-calendar')
      }
    } else {
      router.push('/health-calendar')
    }
  }

  // Status options
  const statusOptions = [
    { value: 'start' as const, label: '开始', sublabel: '月经开始', icon: Play, color: 'bg-red-100 text-red-500' },
    { value: 'ongoing' as const, label: '进行中', sublabel: '月经期间', icon: Circle, color: 'bg-pink-100 text-pink-500' },
    { value: 'end' as const, label: '结束', sublabel: '月经结束', icon: Square, color: 'bg-gray-100 text-gray-500' }
  ]

  // Flow amount options
  const flowOptions = [
    { value: 'spotting' as const, label: '极少', sublabel: '点滴状' },
    { value: 'light' as const, label: '较少', sublabel: '轻量' },
    { value: 'normal' as const, label: '正常', sublabel: '中等量' },
    { value: 'heavy' as const, label: '较多', sublabel: '大量' }
  ]

  // Color options
  const colorOptions = [
    { value: 'bright-red' as const, label: '鲜红', color: 'bg-red-600' },
    { value: 'dark-red' as const, label: '暗红', color: 'bg-red-800' },
    { value: 'deep-red' as const, label: '深红', color: 'bg-red-900' },
    { value: 'orange-red' as const, label: '橙红', color: 'bg-orange-600' },
    { value: 'pink' as const, label: '粉红', color: 'bg-pink-400' }
  ]

  // Mood options
  const moodOptions = [
    { value: 'very-sad' as const, emoji: '😭', label: '很难过' },
    { value: 'sad' as const, emoji: '😟', label: '不开心' },
    { value: 'neutral' as const, emoji: '😐', label: '一般' },
    { value: 'happy' as const, emoji: '😊', label: '开心' },
    { value: 'very-happy' as const, emoji: '😄', label: '很开心' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500">
      {/* Background layer */}
      <div className="fixed inset-0 bg-white/10"></div>
      
      <div className="relative min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-50 px-3 py-2 bg-white/25 backdrop-blur-md border-b border-white/20">
          <div className="flex items-center justify-between">
            {/* Left: Back button and title */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBack}
                className="w-8 h-8 bg-white/30 backdrop-blur-sm rounded-xl hover:bg-white/40 transition-all border border-white/20 flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 text-gray-700" />
              </button>
              <div>
                <h1 className="text-base font-bold text-gray-800">
                  {isEditing ? '编辑生理记录' : '生理记录'}
                </h1>
                <p className="text-xs text-gray-600">记录您的月经周期</p>
              </div>
            </div>
            
            {/* Right: User switcher */}
            <UserSwitcher
              currentUser={currentUser}
              users={users}
              onUserChange={handleUserChange}
            />
          </div>
        </header>

        {/* Main Content */}
        <main className="px-3 py-2 pb-16">
          {/* Main form card */}
          <div className="bg-gradient-to-b from-white to-gray-50 rounded-2xl p-3 mb-3 shadow-lg border border-white/40 relative">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 w-6 h-6 bg-gray-100 hover:bg-red-100 rounded-full flex items-center justify-center transition-all z-10"
            >
              <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
            </button>
            
            {/* Date and time section */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Calendar className="w-4 h-4 text-pink-500 mr-1.5" />
                日期时间
              </h3>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">选择日期和时间</label>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full px-2.5 py-2 border border-gray-200 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all text-sm"
                />
              </div>
            </div>

            {/* Divider */}
            <hr className="border-gray-200 mb-3" />

            {/* Period status selection */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Heart className="w-4 h-4 text-pink-500 mr-1.5" />
                月经状态
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {statusOptions.map((option) => {
                  const IconComponent = option.icon
                  return (
                    <div
                      key={option.value}
                      onClick={() => setStatus(option.value)}
                      className={`p-2 bg-gray-50 rounded-lg border border-gray-200 text-center cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                        status === option.value ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white transform scale-105 shadow-md' : ''
                      }`}
                    >
                      <div className={`w-7 h-7 ${status === option.value ? 'bg-white/20' : option.color} rounded-lg mx-auto mb-1.5 flex items-center justify-center`}>
                        <IconComponent className={`w-4 h-4 ${status === option.value ? 'text-white' : ''}`} />
                      </div>
                      <div className="text-xs font-semibold">{option.label}</div>
                      <div className={`text-xs mt-0.5 ${status === option.value ? 'text-white/80' : 'text-gray-500'}`}>{option.sublabel}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Divider */}
            <hr className="border-gray-200 mb-3" />

            {/* Flow amount selection */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Droplets className="w-4 h-4 text-pink-500 mr-1.5" />
                流量大小
              </h3>
              <div className="grid grid-cols-4 gap-1.5">
                {flowOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => setFlowAmount(option.value)}
                    className={`p-2 bg-gray-50 rounded-lg border border-gray-200 text-center cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                      flowAmount === option.value ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border-pink-500' : ''
                    }`}
                  >
                    <div className="text-xs font-semibold">{option.label}</div>
                    <div className={`text-xs mt-0.5 ${flowAmount === option.value ? 'text-white/80' : 'text-gray-500'}`}>{option.sublabel}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <hr className="border-gray-200 mb-3" />

            {/* Color selection */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Palette className="w-4 h-4 text-pink-500 mr-1.5" />
                颜色记录
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {colorOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => setColor(option.value)}
                    className={`p-1.5 rounded-lg text-center cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                      color === option.value ? 'transform scale-110 shadow-lg ring-3 ring-pink-300' : ''
                    }`}
                  >
                    <div className={`w-6 h-6 ${option.color} rounded-full mx-auto mb-1 border-2 ${color === option.value ? 'border-pink-500' : 'border-gray-200'}`}></div>
                    <div className="text-xs font-medium text-gray-700">{option.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <hr className="border-gray-200 mb-3" />

            {/* Notes section */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Heart className="w-4 h-4 text-pink-500 mr-1.5" />
                备注信息
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="请记录详细信息，如疼痛程度、情绪变化、特殊情况等..."
                rows={2}
                className="w-full px-2.5 py-2 border border-gray-200 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all resize-none text-sm"
              />
            </div>

            {/* Divider */}
            <hr className="border-gray-200 mb-3" />

            {/* Mood tracking */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Smile className="w-4 h-4 text-pink-500 mr-1.5" />
                情绪记录
              </h3>
              <div className="flex justify-between">
                {moodOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => setMood(option.value)}
                    className={`p-1.5 rounded-lg text-center cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                      mood === option.value ? 'bg-pink-50 border border-pink-200' : ''
                    }`}
                  >
                    <div className="text-xl mb-1">{option.emoji}</div>
                    <div className={`text-xs ${mood === option.value ? 'text-pink-600 font-medium' : 'text-gray-600'}`}>{option.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <hr className="border-gray-200 mb-3" />

            {/* Tags selection */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Tags className="w-4 h-4 text-pink-500 mr-1.5" />
                标签选择
              </h3>
              <TagManager
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
              />
            </div>

            {/* Divider */}
            <hr className="border-gray-200 mb-3" />

            {/* File upload */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Paperclip className="w-4 h-4 text-pink-500 mr-1.5" />
                附件上传
                {attachments.length > 0 && (
                  <span className="ml-2 text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">
                    {attachments.length}/5
                  </span>
                )}
              </h3>

              {/* Upload Area */}
              {attachments.length < 5 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center mb-3 hover:border-pink-500 transition-colors">
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
                    className="px-3 py-1.5 bg-pink-500 text-white text-xs rounded-lg hover:bg-pink-600 transition-colors"
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
                          className="aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer border-2 border-transparent hover:border-pink-500 transition-all transform hover:scale-105 shadow-sm"
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
                      </div>
                    ))}
                  </div>
                  
                  {/* Batch delete button */}
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
              <div className="bg-pink-50 rounded-lg p-2 border border-pink-200">
                <div className="flex items-center space-x-1.5 mb-1">
                  <div className="w-3 h-3 bg-pink-500 rounded-full flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                  </div>
                  <span className="text-xs font-medium text-pink-700">使用说明</span>
                </div>
                <div className="text-xs text-pink-600 space-y-0.5">
                  <div>• 最多可上传5张图片，每张不超过5MB</div>
                  <div>• 支持JPG、PNG、GIF、WebP格式</div>
                  <div>• 点击图片可查看大图</div>
                  <div>• <strong>删除图片</strong>：将鼠标悬停在图片上，点击右上角红色 × 按钮</div>
                  <div>• 或使用"全部删除"按钮清除所有图片</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
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
              className="py-2.5 bg-pink-500 text-white font-semibold rounded-xl hover:bg-pink-600 transition-colors text-sm flex items-center justify-center space-x-1"
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

export default function PeriodPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <PeriodPageContent />
    </Suspense>
  )
}
