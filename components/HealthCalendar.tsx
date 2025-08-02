"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Heart,
  Utensils,
  Sprout,
  Folder,
  Flower2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  Settings,
  Database,
  Download,
  Upload,
  Trash2,
  Clock,
  X,
  User,
  Camera,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { userDB, type User as UserType, UserUtils } from "../lib/userDatabase"
import type { BaseRecord } from "../type/baserecord"
import { useOneDriveSync, formatSyncTime } from "../hooks/useOneDriveSync"
import { adminService } from "@/lib/adminService"

// 简单的类型定义 - 避免复杂的语法
type StoolStatus = "normal" | "difficult" | "constipation" | "diarrhea"
type StoolType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | "unknown"
type StoolVolume = "small" | "medium" | "large"
type StoolColor = "brown" | "dark" | "light" | "yellow" | "green" | "black" | "red"

type StoolRecord = BaseRecord & {
  date: string
  status: StoolStatus
  type: StoolType
  volume: StoolVolume
  color: StoolColor
  notes: string
  tags: string[]
  attachments: string[]
}

// MyRecord 类型定义
type MyRecord = BaseRecord & {
  dateTime: string
  content: string
  tags: string[]
  attachments: string[]
}

type StoolDatabase = {
  ensureInitialized(): Promise<void>
  saveRecord(record: Omit<StoolRecord, "id" | "createdAt" | "updatedAt">): Promise<string>
  updateRecord(id: string, record: Partial<StoolRecord>): Promise<void>
  getRecord(id: string): Promise<StoolRecord | null>
  getUserRecords(userId: string): Promise<StoolRecord[]>
  deleteRecord(id: string): Promise<void>
  softDeleteRecord(id: string): Promise<void>
}

// MyRecord 数据库接口
type MyRecordDatabase = {
  ensureInitialized(): Promise<void>
  saveRecord(record: Omit<MyRecord, "id" | "createdAt" | "updatedAt">): Promise<string>
  updateRecord(id: string, record: Partial<MyRecord>): Promise<void>
  getRecord(id: string): Promise<MyRecord | null>
  getUserRecords(userId: string): Promise<MyRecord[]>
  deleteRecord(id: string): Promise<void>
  softDeleteRecord(id: string): Promise<void>
}

// 全局数据库版本号
const DB_VERSION = 5

// StoolDB 实现类
class StoolDB implements StoolDatabase {
  private dbName = "HealthCalendarDB"
  private db: IDBDatabase | null = null

  async ensureInitialized(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION)

      request.onerror = () => {
        console.error("IndexedDB error:", request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log("StoolDB initialized successfully")
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = (event.target as IDBOpenDBRequest).transaction!
        const oldVersion = event.oldVersion
        console.log("StoolDB upgrade needed, current stores:", Array.from(db.objectStoreNames))

        if (!db.objectStoreNames.contains("users")) {
          const userStore = db.createObjectStore("users", { keyPath: "id" })
          userStore.createIndex("name", "name", { unique: false })
          userStore.createIndex("isActive", "isActive", { unique: false })
          console.log("Created users object store")
        }

        if (!db.objectStoreNames.contains("stoolRecords")) {
          const store = db.createObjectStore("stoolRecords", { keyPath: "id" })
          store.createIndex("userId", "userId", { unique: false })
          store.createIndex("date", "date", { unique: false })
          console.log("Created stoolRecords object store")
        }

        // 版本 5：添加 myRecords 表
        if (!db.objectStoreNames.contains("myRecords")) {
          const store = db.createObjectStore("myRecords", { keyPath: "id" })
          store.createIndex("userId", "userId", { unique: false })
          store.createIndex("dateTime", "dateTime", { unique: false })
          console.log("Created myRecords object store")
        }

        // 版本 4：添加 createdAt 和 updatedAt 字段迁移
        if (oldVersion < 4 && db.objectStoreNames.contains("stoolRecords")) {
          const stoolRecordsStore = transaction.objectStore("stoolRecords")

          // 迁移排便记录数据
          const stoolRequest = stoolRecordsStore.getAll()
          stoolRequest.onsuccess = () => {
            const records = stoolRequest.result
            records.forEach((record: any) => {
              const now = new Date().toISOString()
              if (!record.createdAt) {
                record.createdAt = record.date || now
              }
              if (!record.updatedAt) {
                record.updatedAt = record.date || now
              }
              stoolRecordsStore.put(record)
            })
          }
        }
      }

      request.onblocked = () => {
        console.warn("IndexedDB upgrade blocked. Please close other tabs with this app.")
        reject(new Error("Database upgrade blocked"))
      }
    })
  }

  async getUserRecords(userId: string): Promise<StoolRecord[]> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["stoolRecords"], "readonly")
      const store = transaction.objectStore("stoolRecords")
      const index = store.index("userId")
      const request = index.getAll(userId)

      request.onsuccess = () => {
        // 过滤掉已删除的记录 (delFlag = true)
        const records = request.result.filter((record: StoolRecord) => !record.delFlag)
        resolve(records)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getRecord(id: string): Promise<StoolRecord | null> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["stoolRecords"], "readonly")
      const store = transaction.objectStore("stoolRecords")
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async saveRecord(record: Omit<StoolRecord, "id" | "createdAt" | "updatedAt">): Promise<string> {
    await this.ensureInitialized()

    const id = Date.now().toString()
    const now = new Date().toISOString()
    const fullRecord: StoolRecord = {
      ...record,
      id,
      delFlag: false, // 初始值为 false
      createdAt: now,
      updatedAt: now,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["stoolRecords"], "readwrite")
      const store = transaction.objectStore("stoolRecords")
      const request = store.add(fullRecord)

      request.onsuccess = () => resolve(id)
      request.onerror = () => reject(request.error)
    })
  }

  async updateRecord(id: string, updates: Partial<StoolRecord>): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["stoolRecords"], "readwrite")
      const store = transaction.objectStore("stoolRecords")
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const record = getRequest.result
        if (!record) {
          reject(new Error("Record not found"))
          return
        }

        const updatedRecord = {
          ...record,
          ...updates,
          updatedAt: new Date().toISOString(),
        }

        const putRequest = store.put(updatedRecord)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async deleteRecord(id: string): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["stoolRecords"], "readwrite")
      const store = transaction.objectStore("stoolRecords")
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async softDeleteRecord(id: string): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["stoolRecords"], "readwrite")
      const store = transaction.objectStore("stoolRecords")
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const record = getRequest.result
        if (!record) {
          reject(new Error("Record not found"))
          return
        }

        // 设置删除标志并更新时间戳
        const updatedRecord = {
          ...record,
          delFlag: true,
          updatedAt: new Date().toISOString(),
        }

        const putRequest = store.put(updatedRecord)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(getRequest.error)
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }
}

const stoolDB = new StoolDB()

// MyRecordDB 实现类
class MyRecordDB implements MyRecordDatabase {
  private dbName = "HealthCalendarDB" // 使用与用户数据相同的数据库
  private db: IDBDatabase | null = null

  async ensureInitialized(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION)

      request.onerror = () => {
        console.error("MyRecordDB IndexedDB error:", request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log("MyRecordDB initialized successfully")
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = (event.target as IDBOpenDBRequest).transaction!
        const oldVersion = event.oldVersion
        console.log("MyRecordDB upgrade needed, current stores:", Array.from(db.objectStoreNames))

        // 确保用户存储存在（与 userDatabase 兼容）
        if (!db.objectStoreNames.contains("users")) {
          const userStore = db.createObjectStore("users", { keyPath: "id" })
          userStore.createIndex("name", "name", { unique: false })
          userStore.createIndex("isActive", "isActive", { unique: false })
          console.log("Created users object store in MyRecordDB")
        }

        // 确保排便记录存储存在（与 stoolDB 兼容）
        if (!db.objectStoreNames.contains("stoolRecords")) {
          const stoolStore = db.createObjectStore("stoolRecords", { keyPath: "id" })
          stoolStore.createIndex("userId", "userId", { unique: false })
          stoolStore.createIndex("date", "date", { unique: false })
          console.log("Created stoolRecords object store in MyRecordDB")
        }

        // 创建我的记录存储
        if (!db.objectStoreNames.contains("myRecords")) {
          const store = db.createObjectStore("myRecords", { keyPath: "id" })
          store.createIndex("userId", "userId", { unique: false })
          store.createIndex("dateTime", "dateTime", { unique: false })
          console.log("Created myRecords object store")
        }
      }

      request.onblocked = () => {
        console.warn("MyRecordDB IndexedDB upgrade blocked. Please close other tabs with this app.")
        reject(new Error("Database upgrade blocked"))
      }
    })
  }

  async saveRecord(record: Omit<MyRecord, "id" | "createdAt" | "updatedAt">): Promise<string> {
    await this.ensureInitialized()

    const id = Date.now().toString()
    const now = new Date().toISOString()
    const fullRecord: MyRecord = {
      ...record,
      id,
      delFlag: false, // 初始值为 false
      createdAt: now,
      updatedAt: now,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["myRecords"], "readwrite")
      const store = transaction.objectStore("myRecords")
      const request = store.add(fullRecord)

      request.onsuccess = () => resolve(id)
      request.onerror = () => reject(request.error)
    })
  }

  async updateRecord(id: string, updates: Partial<MyRecord>): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["myRecords"], "readwrite")
      const store = transaction.objectStore("myRecords")
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const record = getRequest.result
        if (!record) {
          reject(new Error("Record not found"))
          return
        }

        const updatedRecord = {
          ...record,
          ...updates,
          updatedAt: new Date().toISOString(),
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
      const transaction = this.db!.transaction(["myRecords"], "readonly")
      const store = transaction.objectStore("myRecords")
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getUserRecords(userId: string): Promise<MyRecord[]> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["myRecords"], "readonly")
      const store = transaction.objectStore("myRecords")
      const index = store.index("userId")
      const request = index.getAll(userId)

      request.onsuccess = () => {
        // 过滤掉已删除的记录 (delFlag = true)
        const records = request.result.filter((record: MyRecord) => !record.delFlag)
        resolve(records)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async deleteRecord(id: string): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["myRecords"], "readwrite")
      const store = transaction.objectStore("myRecords")
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async softDeleteRecord(id: string): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["myRecords"], "readwrite")
      const store = transaction.objectStore("myRecords")
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const record = getRequest.result
        if (!record) {
          reject(new Error("Record not found"))
          return
        }

        // 设置删除标志并更新时间戳
        const updatedRecord = {
          ...record,
          delFlag: true,
          updatedAt: new Date().toISOString(),
        }

        const putRequest = store.put(updatedRecord)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(getRequest.error)
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }
}

const myRecordDB = new MyRecordDB()

// 通用记录类型（用于显示）
type DisplayRecord = {
  id: string
  type: "meal" | "stool" | "myrecord" | "personal" | "physical" | "period"
  date: string
  originalDate?: string
  title: string
  description: string
  tags: string[]
  record?: any
  isUpdated?: boolean
}

type HealthCalendarProps = {}

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onAddUser: (userName: string, avatarUrl: string) => void
  onEditUser?: (userId: string, userName: string, avatarUrl: string) => void
  editUser?: UserType | null
  isEditMode?: boolean
}

// 通用头像组件，带错误处理
const SafeAvatar: React.FC<{
  src: string
  alt: string
  className?: string
  fallbackClassName?: string
}> = ({ src, alt, className = "", fallbackClassName = "" }) => {
  const [hasError, setHasError] = useState(false)

  const DefaultAvatar = () => (
    <div
      className={`bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center rounded-full ${fallbackClassName}`}
    >
      <User className="text-white w-1/2 h-1/2" />
    </div>
  )

  if (hasError || !src) {
    return <DefaultAvatar />
  }

  return <img src={src || "/placeholder.svg"} alt={alt} className={className} onError={() => setHasError(true)} />
}

// AddUserModal Component
const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onAddUser,
  onEditUser,
  editUser,
  isEditMode = false,
}) => {
  const [userName, setUserName] = useState("")
  const [selectedAvatar, setSelectedAvatar] = useState("")
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({})

  // 当进入编辑模式时，设置初始值
  useEffect(() => {
    if (isEditMode && editUser) {
      setUserName(editUser.name)
      setSelectedAvatar(editUser.avatarUrl)
    } else {
      setUserName("")
      setSelectedAvatar("")
    }
  }, [isEditMode, editUser])

  const avatarOptions = [
    "https://images.unsplash.com/photo-1494790108755-2616b2e4d93d?w=80&h=80&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=80&h=80&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=80&h=80&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
  ]

  // 默认头像 SVG
  const DefaultAvatar = ({ className = "" }) => (
    <div className={`bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center ${className}`}>
      <User className="text-white w-1/2 h-1/2" />
    </div>
  )

  const handleImageError = (imageUrl: string) => {
    setImageErrors((prev) => ({ ...prev, [imageUrl]: true }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userName.trim()) {
      if (isEditMode && editUser && onEditUser) {
        onEditUser(editUser.id, userName.trim(), selectedAvatar || editUser.avatarUrl)
      } else {
        onAddUser(userName.trim(), selectedAvatar || avatarOptions[0])
      }
      setUserName("")
      setSelectedAvatar("")
    }
  }

  const handleClose = () => {
    setUserName("")
    setSelectedAvatar("")
    setImageErrors({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={handleClose}></div>

      {/* Modal Content */}
      <div className="relative flex items-center justify-center min-h-screen p-6 w-full">
        <div className="glass-morphism rounded-3xl p-6 w-full max-w-md transform transition-all scale-100 opacity-100">
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
              <Users className="text-health-primary mr-2" />
              {isEditMode ? "编辑用户" : "添加新用户"}
            </h3>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X className="text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User ID (只在编辑模式显示) */}
            {isEditMode && editUser && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">用户ID</label>
                <div className="relative">
                  <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={editUser.id}
                    readOnly
                    className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl text-gray-600 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500">用户ID不可修改</p>
              </div>
            )}

            {/* User Name Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">用户名称</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="请输入用户名称"
                  className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-health-primary/20 focus:border-health-primary transition-all"
                  required
                />
              </div>
            </div>

            {/* Avatar Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center">
                <Camera className="w-4 h-4 mr-2" />
                选择头像
              </label>
              <div className="grid grid-cols-3 gap-3">
                {avatarOptions.map((avatar, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`relative w-20 h-20 rounded-2xl overflow-hidden transition-all ${
                      selectedAvatar === avatar || (!selectedAvatar && index === 0)
                        ? "ring-4 ring-health-primary ring-offset-2 scale-105"
                        : "ring-2 ring-gray-200 hover:ring-health-primary/50 hover:scale-102"
                    }`}
                  >
                    {imageErrors[avatar] ? (
                      <DefaultAvatar className="w-full h-full rounded-2xl" />
                    ) : (
                      <img
                        src={avatar || "/placeholder.svg"}
                        alt={`头像选项 ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(avatar)}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 text-gray-600 font-medium hover:text-gray-800 transition-colors bg-gray-100 hover:bg-gray-200 rounded-2xl"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!userName.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-health-primary to-health-accent text-white font-semibold rounded-2xl hover:from-health-secondary hover:to-health-primary transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                {isEditMode ? "保存修改" : "添加用户"}
              </button>
            </div>
          </form>

          {/* Tips */}
          <div className="mt-4 p-3 bg-blue-50 rounded-2xl">
            <p className="text-xs text-blue-600">
              💡 提示：{isEditMode ? "修改后的用户信息将立即生效" : "添加的用户将可以独立记录和管理自己的健康数据"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const HealthCalendar: React.FC<HealthCalendarProps> = () => {
  const router = useRouter()
  // const [activeTab, setActiveTab] = useState(() => {
  //   return localStorage.getItem('activeTab') || 'recent'; // fallback to 'recent' if not set
  // });
  const [activeTab, setActiveTab] = useState("recent")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [users, setUsers] = useState<UserType[]>([])
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 添加 stoolRecords 状态
  const [stoolRecords, setStoolRecords] = useState<StoolRecord[]>([])

  // 添加 myRecords 状态
  const [myRecords, setMyRecords] = useState<MyRecord[]>([])

  const [mealRecords, setMealRecords] = useState<any[]>([])

  // 添加 periodRecords 状态
  const [periodRecords, setPeriodRecords] = useState<any[]>([])

  // 编辑用户相关状态
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [oneDriveState, oneDriveActions] = useOneDriveSync()
  // const [activeTab, setActiveTab] = useState<'stool' | 'myrecord' | 'personal' | 'physical'>('stool')

  // OneDrive同步状态 - 使用错误边界保护
  // const [oneDriveState, oneDriveActions] = (() => {
  //   try {
  //     return useOneDriveSync()
  //   } catch (error) {
  //     console.error('OneDrive同步初始化失败:', error)
  //     // 返回默认状态，不阻塞主应用
  //     return [{
  //       isAuthenticated: false,
  //       isConnecting: false,
  //       lastSyncTime: null,
  //       syncStatus: 'idle' as const,
  //       error: null,
  //       userInfo: null,
  //       exportResult: null,
  //       isExporting: false,
  //     }, {
  //       connect: async () => console.warn('OneDrive功能不可用'),
  //       disconnect: async () => {},
  //       checkConnection: async () => {},
  //       startSync: async (_userId: string) => {},
  //       exportData: async () => {},
  //       exportTable: async () => {},
  //       clearError: () => {},
  //     }]
  //   }
  // })()

  useEffect(() => {
    const storedTab = localStorage.getItem("activeTab")
    if (storedTab) {
      setActiveTab(storedTab)
    }

    // 初始化用户数据
    initializeUsers()

    // 点击外部关闭下拉菜单
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest(".user-menu-container")) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener("click", handleClickOutside)

    // Animate calendar cells on load
    const calendarCells = document.querySelectorAll(".calendar-cell")
    calendarCells.forEach((cell, index) => {
      const element = cell as HTMLElement
      element.style.animationDelay = `${index * 0.02}s`
      element.classList.add("animate-fade-in")
    })

    // Animate record cards
    const recordCards = document.querySelectorAll(".record-card")
    recordCards.forEach((card, index) => {
      const element = card as HTMLElement
      element.style.animationDelay = `${0.1 + index * 0.1}s`
      element.classList.add("animate-slide-up")
    })

    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [])

  const initializeUsers = async () => {
    try {
      setIsLoading(true)

      // 首先确保数据库完全初始化
      console.log("初始化用户数据...")
      // await userDB.ensureInitialized()
      // console.log('初始化 stoolDB...')
      // await stoolDB.ensureInitialized()

      // 获取所有用户
      const allUsers = await adminService.getAllUsers()

      // 初始化默认用户（如果没有用户）
      // const defaultUser = await userDB.initializeDefaultUser()
      const defaultUser = await adminService.getDefaultUser()

      // 获取当前当前用户
      // const activeUser = await userDB.getActiveUser()

      setUsers(allUsers)
      setCurrentUser((await adminService.getCurrentUser()) || defaultUser)
    } catch (error) {
      console.error("初始化用户数据失败:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUsers = async () => {
    try {
      // const allUsers = await userDB.getAllUsers()
      // const activeUser = await userDB.getActiveUser()
      // setUsers(allUsers)
      // setCurrentUser(activeUser)
      initializeUsers()
    } catch (error) {
      console.error("刷新用户数据失败:", error)
    }
  }

  // 添加获取排便记录的函数
  const loadStoolRecords = async () => {
    if (!currentUser) {
      console.log("loadStoolRecords: 没有当前用户")
      return
    }

    try {
      console.log("loadStoolRecords: 开始加载数据，用户ID:", currentUser.id)
      // await stoolDB.ensureInitialized
      // const records = await stoolDB.getUserRecords(currentUser.id)
      const records = await adminService.getUserRecords("stoolRecords", currentUser.id)
      console.log("loadStoolRecords: 获取到记录数:", records.length)
      console.log("loadStoolRecords: 记录详情:", records)
      // 按日期倒序排列
      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setStoolRecords(records)
    } catch (error) {
      console.error("获取排便记录失败:", error)
    }
  }

  // 添加获取我的记录的函数
  const loadMyRecords = async () => {
    if (!currentUser) {
      console.log("loadMyRecords: 没有当前用户")
      return
    }

    try {
      console.log("loadMyRecords: 开始加载数据，用户ID:", currentUser.id)
      // await myRecordDB.ensureInitialized()
      // const records = await myRecordDB.getUserRecords(currentUser.id)
      const records = await adminService.getUserRecords("myRecords", currentUser.id)
      console.log("loadMyRecords: 获取到记录数:", records.length)
      console.log("loadMyRecords: 记录详情:", records)
      // 按日期倒序排列
      records.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
      setMyRecords(records)
    } catch (error) {
      console.error("获取我的记录失败:", error)
    }
  }

  // 添加获取用餐记录的函数
  const loadMealRecords = async () => {
    if (!currentUser) {
      console.log("loadMealRecords: 没有当前用户")
      return
    }

    try {
      console.log("loadMealRecords: 开始加载数据，用户ID:", currentUser.id)
      // await myRecordDB.ensureInitialized()
      // const records = await myRecordDB.getUserRecords(currentUser.id)
      const records = await adminService.getUserRecords("mealRecords", currentUser.id)
      console.log("loadMealRecords: 获取到记录数:", records.length)
      console.log("loadMealRecords: 记录详情:", records)
      // 按日期倒序排列
      records.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
      setMealRecords(records)
    } catch (error) {
      console.error("获取用餐记录失败:", error)
    }
  }

  // 添加获取生理记录的函数
  const loadPeriodRecords = async () => {
    if (!currentUser) {
      console.log("loadPeriodRecords: 没有当前用户")
      return
    }

    try {
      console.log("loadPeriodRecords: 开始加载数据，用户ID:", currentUser.id)
      const records = await adminService.getUserRecords("periodRecords", currentUser.id)
      console.log("loadPeriodRecords: 获取到记录数:", records.length)
      console.log("loadPeriodRecords: 记录详情:", records)
      // 按日期倒序排列
      records.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
      setPeriodRecords(records)
    } catch (error) {
      console.error("获取生理记录失败:", error)
    }
  }

  // 当用户变化时重新加载数据
  useEffect(() => {
    if (currentUser) {
      loadStoolRecords()
      loadMyRecords()
      loadMealRecords()
      loadPeriodRecords()
    }
  }, [currentUser])

  // 添加测试数据的函数
  const addTestDataIfNeeded = async () => {
    if (!currentUser) return

    try {
      await stoolDB.ensureInitialized()
      const existingRecords = await stoolDB.getUserRecords(currentUser.id)

      // 如果没有记录，添加一些测试数据
      if (existingRecords.length === 0) {
        console.log("添加测试数据...")

        const testRecords = [
          {
            userId: currentUser.id,
            date: "2025-07-21T09:30:00.000Z",
            status: "normal" as const,
            type: 4 as const,
            volume: "medium" as const,
            color: "brown" as const,
            notes: "早上正常排便",
            tags: ["健康状态良好"],
            attachments: [],
            delFlag: false,
          },
          {
            userId: currentUser.id,
            date: "2025-07-20T14:15:00.000Z",
            status: "diarrhea" as const,
            type: 6 as const,
            volume: "medium" as const,
            color: "light" as const,
            notes: "午后有点软便",
            tags: ["可能吃了过多水果"],
            attachments: [],
            delFlag: false,
          },
          {
            userId: currentUser.id,
            date: "2025-07-19T08:45:00.000Z",
            status: "normal" as const,
            type: 4 as const,
            volume: "large" as const,
            color: "brown" as const,
            notes: "正常排便，状态良好",
            tags: [],
            attachments: [],
            delFlag: false,
          },
        ]

        for (const record of testRecords) {
          const recordId = await stoolDB.saveRecord(record)
          console.log("添加了测试记录:", recordId)
        }

        // 重新加载数据
        setTimeout(() => {
          loadStoolRecords()
        }, 500)
      }
    } catch (error) {
      console.error("添加测试数据失败:", error)
    }
  }

  const openRecordModal = () => {
    setIsModalOpen(true)
  }

  const closeRecordModal = () => {
    setIsModalOpen(false)
  }

  const selectRecordType = (type: string) => {
    closeRecordModal()

    switch (type) {
      case "meals":
        console.log("选择了一日三餐记录")
        // window.location.href = 'meal_page.html'
        router.push("/meal")
        break
      case "stool":
        console.log("选择了排便记录")
        router.push("/stool")
        break
      case "period":
        console.log("选择了生理记录")
        router.push("/period")
        break
      case "myrecord":
        console.log("选择了我的记录")
        router.push("/myrecord")
        break
    }
  }

  const goToPrivacyCalendar = () => {
    console.log("跳转到隐私日历")
    window.location.href = "period_calendar.html"
  }

  const editStoolRecord = (recordId: string) => {
    console.log("编辑排便记录:", recordId)
    router.push(`/stool?edit=${recordId}`)
  }

  const editMyRecord = (recordId: string) => {
    console.log("编辑我的记录:", recordId)
    router.push(`/myrecord?edit=${recordId}`)
  }

  const editMealRecord = (recordId: string) => {
    console.log("编辑用餐记录:", recordId)
    router.push(`/meal?edit=${recordId}`)
  }

  const editPeriodRecord = (recordId: string) => {
    console.log("编辑生理记录:", recordId)
    router.push(`/period?edit=${recordId}`)
  }

  const deleteStoolRecord = async (recordId: string) => {
    try {
      if (!confirm("确定要删除此记录吗？")) return
      console.log("删除排便记录:", recordId)
      // await stoolDB.softDeleteRecord(recordId)
      await adminService.softDeleteStoolRecord(recordId)
      // 重新加载数据
      await loadStoolRecords()
      console.log("排便记录已删除")
    } catch (error) {
      console.error("删除排便记录失败:", error)
    }
  }

  const deleteMyRecord = async (recordId: string) => {
    try {
      if (!confirm("确定要删除此记录吗？")) return
      console.log("删除我的记录:", recordId)
      // await myRecordDB.softDeleteRecord(recordId)
      await adminService.softDeleteMyRecord(recordId)
      // 重新加载数据
      await loadMyRecords()
      console.log("我的记录已删除")
    } catch (error) {
      console.error("删除我的记录失败:", error)
    }
  }

  const deleteMealRecord = async (recordId: string) => {
    try {
      if (!confirm("确定要删除此记录吗？")) return
      console.log("删除用餐记录:", recordId)
      // await adminService.softDeleteMealRecord(recordId)
      await adminService.softDeleteRecord("mealRecords", recordId)
      // 重新加载数据
      await loadMealRecords()
      console.log("用餐记录已删除")
    } catch (error) {
      console.error("删除用餐记录失败:", error)
    }
  }

  const deletePeriodRecord = async (recordId: string) => {
    try {
      if (!confirm("确定要删除此记录吗？")) return
      console.log("删除生理记录:", recordId)
      await adminService.softDeletePeriodRecord(recordId)
      // 重新加载数据
      await loadPeriodRecords()
      console.log("生理记录已删除")
    } catch (error) {
      console.error("删除生理记录失败:", error)
    }
  }

  // 添加辅助函数
  const formatRecordTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
  }

  const formatRecordDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "今天, " + date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "昨天, " + date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
    } else {
      return date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
    }
  }

  const getStoolStatusText = (status: StoolRecord["status"]) => {
    const statusMap = {
      normal: "正常",
      difficult: "困难",
      constipation: "便秘",
      diarrhea: "腹泻",
    }
    return statusMap[status] || "未知"
  }

  const getStatusColor = (status: StoolRecord["status"]) => {
    const colorMap = {
      normal: "bg-green-100 text-green-600",
      difficult: "bg-yellow-100 text-yellow-600",
      constipation: "bg-orange-100 text-orange-600",
      diarrhea: "bg-red-100 text-red-600",
    }
    return colorMap[status] || "bg-gray-100 text-gray-600"
  }

  const getTypeText = (type: StoolRecord["type"]) => {
    if (type === "unknown") return "未知类型"
    return `类型${type}`
  }

  const switchTab = (tabName: string) => {
    setActiveTab(tabName)
    localStorage.setItem("activeTab", tabName)
  }

  // Settings Functions
  const addUser = () => {
    setIsAddUserModalOpen(true)
  }

  const closeAddUserModal = () => {
    setIsAddUserModalOpen(false)
  }

  const handleAddUser = async (userName: string, avatarUrl: string) => {
    try {
      // 验证用户名
      if (!UserUtils.isValidUserName(userName)) {
        alert("用户名长度应在1-20个字符之间")
        return
      }

      // 检查用户名是否已存在
      // const existingUsers = await userDB.getAllUsers()
      const existingUsers = await adminService.getAllUsers()
      const nameExists = existingUsers.some((user) => user.name.toLowerCase() === userName.toLowerCase())

      if (nameExists) {
        alert("用户名已存在，请选择其他名称")
        return
      }

      // 添加新用户
      // const newUser = await userDB.addUser({
      //   name: userName,
      //   avatarUrl,
      //   isActive: false // 新用户默认不激活
      // })

      const newUser = await adminService.saveUser({
        name: userName,
        avatarUrl,
        isActive: false, // 新用户默认不激活
      })

      console.log("新用户已添加:", newUser)
      alert(`用户 "${userName}" 已成功添加！`)

      // 刷新用户列表
      await refreshUsers()
      closeAddUserModal()
    } catch (error) {
      console.error("添加用户失败:", error)
      alert("添加用户失败，请重试")
    }
  }

  const switchUser = async (userId: string) => {
    try {
      // await userDB.setActiveUser(userId)
      await adminService.setCurrentUser(userId)
      setCurrentUser(users.find((u) => u.id === userId) || null)
      console.log("已切换用户:", userId)
      // 刷新用户后会通过 useEffect 自动重新加载 stool records
      await refreshUsers()
    } catch (error) {
      console.error("切换用户失败:", error)
      alert("切换用户失败，请重试")
    }
  }

  const deleteUserOrig = async (userId: string) => {
    try {
      const user = users.find((u) => u.id === userId)
      if (!user) return

      if (users.length <= 1) {
        alert("至少需要保留一个用户")
        return
      }

      if (confirm(`确定要删除用户 "${user.name}" 吗？`)) {
        await userDB.deleteUser(userId)

        // 如果删除的是当前当前用户，则激活第一个剩余用户
        if (user.isActive) {
          const remainingUsers = await userDB.getAllUsers()
          if (remainingUsers.length > 0) {
            await userDB.setActiveUser(remainingUsers[0].id)
          }
        }

        await refreshUsers()
        console.log("用户已删除:", userId)
      }
    } catch (error) {
      console.error("删除用户失败:", error)
      alert("删除用户失败，请重试")
    }
  }

  const deleteUser = async (userId: string) => {
    try {
      const user = users.find((u) => u.id === userId)
      if (!user) return

      if (users.length <= 1) {
        alert("至少需要保留一个用户")
        return
      }

      if (confirm(`确定要删除用户 "${user.name}" 吗？`)) {
        await adminService.updateUser(userId, {
          ...user,
          delFlag: true,
        })

        await refreshUsers()
        console.log("用户已删除:", userId)
      }
    } catch (error) {
      console.error("删除用户失败:", error)
      alert("删除用户失败，请重试")
    }
  }

  const editUser = (user: UserType) => {
    setEditingUser(user)
    setIsEditUserModalOpen(true)
  }

  const closeEditUserModal = () => {
    setIsEditUserModalOpen(false)
    setEditingUser(null)
  }

  const handleEditUser = async (userId: string, userName: string, avatarUrl: string) => {
    if (!editingUser) return

    try {
      // 验证用户名
      // if (!UserUtils.isValidUserName(userName)) {
      //   alert('用户名长度应在1-20个字符之间')
      //   return
      // }

      // 检查用户名是否已存在（排除当前编辑的用户）
      // const existingUsers = await userDB.getAllUsers()
      // const nameExists = existingUsers.some(user =>
      //   user.name.toLowerCase() === userName.toLowerCase() && user.id !== editingUser.id
      // )

      // if (nameExists) {
      //   alert('用户名已存在，请选择其他名称')
      //   return
      // }

      console.log("正在更新用户信息:", editingUser)
      // 更新用户信息
      await adminService.updateUser(editingUser.id, {
        ...editingUser,
        name: userName,
        avatarUrl,
      })

      console.log("用户信息已更新:", editingUser.id)
      alert(`用户信息已成功更新！`)

      // 刷新用户列表
      await refreshUsers()
      closeEditUserModal()
    } catch (error) {
      console.error("更新用户失败:", error)
      alert("更新用户失败，请重试")
    }
  }

  const syncFromToOneDrive = () => {
    alert("正在同步数据到OneDrive...")
  }

  const exportData = () => {
    alert("正在导出数据...")
  }

  const importData = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json,.csv"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        alert("正在导入文件: " + file.name)
      }
    }
    input.click()
  }

  const clearData = () => {
    if (confirm("确定要清除所有数据吗？此操作不可恢复！")) {
      alert("数据已清除！")
    }
  }

  const syncData = async () => {
    try {
      console.log("开始同步 OneDrive 数据...")
      oneDriveActions.syncIDBOneDriveUsers()
      oneDriveActions.syncIDBOneDriveMyRecords()
      oneDriveActions.syncIDBOneDriveStoolRecords()
      oneDriveActions.syncIDBOneDrivePeriodRecords()
      // setUsersOneDrive(JSON.stringify(usersFileOneDrive, null, 2));
      // initializeUsers();
      refreshUsers()
    } catch (err) {
      console.log("syncData失败: " + (err as Error).message)
    }
  }

  const gotoOneDriveStatus = () => {
    router.push("/onedrive-test")
  }

  const getPeriodStatusText = (status: string) => {
    const statusMap = {
      start: "开始",
      ongoing: "进行中",
      end: "结束",
    }
    return statusMap[status] || "未知"
  }

  const getFlowText = (flow: string) => {
    const flowMap = {
      minimal: "极少",
      light: "较少",
      normal: "正常",
      heavy: "较多",
    }
    return flowMap[flow] || "未知"
  }

  return (
    <div className="overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 hero-gradient"></div>
      <div className="fixed inset-0 bg-white/10"></div>

      <div className="relative min-h-screen">
        {/* Header */}
        <header className="glass-morphism sticky top-0 z-50 px-3 py-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div className="w-8 h-8 health-icon primary rounded-xl flex items-center justify-center">
                  <Heart className="text-white text-sm" />
                </div>
                <div className="absolute inset-0 pulse-ring bg-green-500 bg-opacity-20 rounded-xl"></div>
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-800">健康日历</h1>
                <p className="text-xs text-gray-600 font-medium">生活离不开吃喝拉撒</p>
              </div>
            </div>

            {/* User Profile */}
            <div className="flex items-center">
              <div className="relative user-menu-container">
                {currentUser && !isLoading && (
                  <div className="relative">
                    {/* User Button */}
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center space-x-1.5 px-2 py-1 bg-white/30 backdrop-blur-sm rounded-lg hover:bg-white/40 transition-all border border-white/20"
                    >
                      <SafeAvatar
                        src={currentUser.avatarUrl}
                        alt="用户头像"
                        className="w-5 h-5 rounded-full ring-1 ring-white/50 object-cover"
                        fallbackClassName="w-5 h-5"
                      />
                      <span className="text-xs font-semibold text-gray-800">{currentUser.name}</span>
                      <ChevronLeft
                        className={`text-gray-500 text-xs transition-transform ${isUserMenuOpen ? "rotate-180" : "rotate-90"}`}
                      />
                    </button>

                    {/* User Dropdown Menu */}
                    {isUserMenuOpen && (
                      <div className="absolute top-full right-0 mt-1.5 w-56 bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl border border-white/30 z-50 p-1.5">
                        {/* Current User Section */}
                        <div className="px-2 py-1.5 border-b border-gray-100 mb-1.5">
                          <div className="flex items-center space-x-2">
                            <SafeAvatar
                              src={currentUser.avatarUrl}
                              alt={currentUser.name}
                              className="w-6 h-6 rounded-full ring-1 ring-health-primary/30 object-cover"
                              fallbackClassName="w-6 h-6"
                            />
                            <div>
                              <div className="text-xs font-semibold text-gray-900">{currentUser.name}</div>
                              <div className="text-xs text-health-primary flex items-center">
                                <CheckCircle className="w-2 h-2 mr-1" />
                                当前用户
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Other Users */}
                        <div className="max-h-32 overflow-y-auto">
                          {users
                            .filter((user) => user.id !== currentUser.id)
                            .map((user) => (
                              <button
                                key={user.id}
                                onClick={() => {
                                  switchUser(user.id)
                                  setIsUserMenuOpen(false)
                                }}
                                className="w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-health-primary/10 transition-colors text-left"
                              >
                                <SafeAvatar
                                  src={user.avatarUrl}
                                  alt={user.name}
                                  className="w-6 h-6 rounded-full ring-1 ring-gray-200 object-cover"
                                  fallbackClassName="w-6 h-6"
                                />
                                <div className="flex-1">
                                  <div className="text-xs font-medium text-gray-900">{user.name}</div>
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {isLoading && (
                  <div className="flex items-center space-x-1.5 px-2 py-1 bg-white/30 backdrop-blur-sm rounded-lg border border-white/20">
                    <div className="w-5 h-5 rounded-full bg-gray-300 animate-pulse"></div>
                    <div className="w-10 h-3 bg-gray-300 rounded animate-pulse"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Quick Stats */}
        <section className="px-3 py-2 animate-slide-up">
          <div className="grid grid-cols-3 gap-2">
            <div className="stat-card rounded-xl p-2 flex items-center space-x-1.5">
              <div className="health-icon warm w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0">
                <Utensils className="text-white text-xs" />
              </div>
              <div className="text-left">
                <div className="text-xs text-gray-600">上次用餐</div>
                <div className="text-sm font-bold text-gray-800 leading-tight">3</div>
              </div>
            </div>
            <div className="stat-card rounded-xl p-2 flex items-center space-x-1.5">
              <div className="health-icon primary w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sprout className="text-white text-xs" />
              </div>
              <div className="text-left">
                <div className="text-xs text-gray-600">上次排便</div>
                <div className="text-sm font-bold text-gray-800 leading-tight">2</div>
              </div>
            </div>
            <div className="stat-card rounded-xl p-2 flex items-center space-x-1.5">
              <div className="health-icon soft w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0">
                <Folder className="text-white text-xs" />
              </div>
              <div className="text-left">
                <div className="text-xs text-gray-600">健康统计</div>
              </div>
            </div>
          </div>
        </section>

        {/* Calendar Section */}
        <main className="px-3 pb-6">
          <div className="glass-morphism rounded-2xl p-3 mb-4 animate-fade-in shadow-2xl">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">2025年 7月</h2>
                  <p className="text-xs text-gray-600 mt-0.5">健康记录概览</p>
                </div>
                <button
                  onClick={goToPrivacyCalendar}
                  className="p-2 rounded-xl bg-white/30 hover:bg-white/40 transition-all backdrop-blur-sm health-icon privacy"
                >
                  <Flower2 className="text-white text-sm" />
                </button>
              </div>
              <div className="flex items-center space-x-1">
                <button className="p-2 rounded-xl bg-white/30 hover:bg-white/40 transition-all backdrop-blur-sm">
                  <ChevronLeft className="text-gray-700 w-4 h-4" />
                </button>
                <button className="p-2 rounded-xl bg-white/30 hover:bg-white/40 transition-all backdrop-blur-sm">
                  <ChevronRight className="text-gray-700 w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {/* Week Header */}
              {["日", "一", "二", "三", "四", "五", "六"].map((day, index) => (
                <div key={index} className="text-center text-xs font-semibold text-gray-500 py-2">
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {Array.from({ length: 35 }, (_, i) => {
                const day = i - 1 // Adjust for starting on Sunday
                const isToday = day === 14
                const isCurrentMonth = day >= 1 && day <= 31
                const displayDay = day < 1 ? 30 + day : day > 31 ? day - 31 : day

                return (
                  <div
                    key={i}
                    className={`calendar-cell h-12 flex flex-col items-center justify-center rounded-xl cursor-pointer ${isToday ? "today text-white" : ""}`}
                  >
                    <span
                      className={`text-xs font-${isToday ? "bold" : "semibold"} ${!isCurrentMonth ? "text-gray-400" : "text-gray-800"}`}
                    >
                      {displayDay}
                    </span>
                    {/* Sample dots for some dates */}
                    {(day === 2 ||
                      day === 3 ||
                      day === 6 ||
                      day === 8 ||
                      day === 10 ||
                      day === 12 ||
                      day === 14 ||
                      day === 17) && (
                      <div className="flex mt-0.5">
                        {day === 3 || day === 10 || day === 14 ? (
                          <>
                            <div className="calendar-dot bg-gradient-to-r from-orange-400 to-yellow-500"></div>
                            <div className="calendar-dot bg-gradient-to-r from-green-400 to-emerald-500"></div>
                            {day === 3 || day === 10 ? (
                              <div className="calendar-dot bg-gradient-to-r from-pink-400 to-purple-500"></div>
                            ) : null}
                          </>
                        ) : day === 2 || day === 6 ? (
                          <>
                            <div className="calendar-dot bg-gradient-to-r from-orange-400 to-yellow-500"></div>
                            <div className="calendar-dot bg-gradient-to-r from-green-400 to-emerald-500"></div>
                          </>
                        ) : (
                          <div
                            className={`calendar-dot bg-gradient-to-r ${isToday ? "from-white to-white" : "from-orange-400 to-yellow-500"}`}
                          ></div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center space-x-4 pt-3 border-t border-white/20">
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-gradient-to-r from-orange-400 to-yellow-500 rounded-full shadow-sm"></div>
                <span className="text-xs font-medium text-gray-700">饮食</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full shadow-sm"></div>
                <span className="text-xs font-medium text-gray-700">排便</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full shadow-sm"></div>
                <span className="text-xs font-medium text-gray-700">记录</span>
              </div>
            </div>
          </div>

          {/* Recent Records */}
          <div className="glass-morphism rounded-2xl p-3 shadow-2xl animate-fade-in">
            {/* Tab Navigation */}
            <div className="flex items-center mb-4 bg-gray-50 rounded-xl p-0.5">
              <button
                onClick={() => switchTab("recent")}
                className={`flex-1 px-3 py-1.5 text-xs font-semibold transition-all rounded-lg ${activeTab === "recent" ? "text-health-primary bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                最近记录
              </button>
              <button
                onClick={() => switchTab("updates")}
                className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === "updates" ? "text-health-primary bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                最近更新
              </button>
              <button
                onClick={() => switchTab("settings")}
                className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === "settings" ? "text-health-primary bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                设置
              </button>
            </div>

            {/* Tab Content */}
            <div id="tabContent">
              {/* Recent Records Tab - Timeline Layout */}
              {activeTab === "recent" && (
                <div className="tab-content">
                  {/* 调试信息 */}
                  {/* <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3 text-xs">
                    <div>当前用户: {currentUser?.name || '无'}</div>
                    <div>排便记录数: {stoolRecords.length}</div>
                    <div>加载状态: {isLoading ? '加载中...' : '已完成'}</div>
                  </div> */}

                  <div className="timeline-container">
                    <div className="timeline-line"></div>

                    {/* 创建混合的记录数据 */}
                    {(() => {
                      // 创建静态记录数据
                      const staticRecords: DisplayRecord[] = [
                        {
                          id: "breakfast-1",
                          type: "meal",
                          date: "2025-07-21T08:30:00",
                          title: "早餐记录",
                          description: "全麦面包 + 鸡蛋 + 牛奶",
                          tags: ["食量: 适中", "有附件"],
                        },
                        {
                          id: "lunch-1",
                          type: "meal",
                          date: "2025-07-21T12:30:00",
                          title: "午餐记录",
                          description: "米饭 + 青菜 + 鸡肉",
                          tags: ["食量: 适中", "心情不错"],
                        },
                        {
                          id: "dinner-1",
                          type: "meal",
                          date: "2025-07-20T19:45:00",
                          title: "晚餐记录",
                          description: "蔬菜沙拉 + 鸡胸肉",
                          tags: ["食量: 较少"],
                        },
                        {
                          id: "personal-1",
                          type: "personal",
                          date: "2025-07-18T22:30:00",
                          title: "我的记录",
                          description: "今日步数 7,200 步",
                          tags: ["运动量: 一般"],
                        },
                        {
                          id: "physical-1",
                          type: "physical",
                          date: "2025-07-10T20:30:00",
                          title: "生理记录",
                          description: "体温 36.5°C，血压正常",
                          tags: ["状态: 正常"],
                        },
                      ]

                      // 将排便记录转换为统一格式
                      const stoolRecordsFormatted: DisplayRecord[] = stoolRecords.map((record) => ({
                        id: record.id,
                        type: "stool",
                        date: record.dateTime,
                        title: "排便记录",
                        description:
                          record.notes || `${getStoolStatusText(record.status)}，${getTypeText(record.type)}`,
                        tags: [
                          `状态: ${getStoolStatusText(record.status)}`,
                          `类型: ${getTypeText(record.type)}`,
                          ...(record.tags || []),
                        ],
                        record: record,
                      }))

                      // 将我的记录转换为统一格式
                      const myRecordsFormatted: DisplayRecord[] = myRecords.map((record) => ({
                        id: record.id,
                        type: "myrecord",
                        date: record.dateTime,
                        title: "我的记录",
                        description: record.content.slice(0, 50) + (record.content.length > 50 ? "..." : ""),
                        tags: record.tags,
                        record: record,
                      }))

                      // 将用餐记录转换为统一格式
                      const mealRecordsFormatted: DisplayRecord[] = mealRecords.map((record) => ({
                        id: record.id,
                        type: "meal",
                        date: record.dateTime,
                        title: "用餐记录",
                        description:
                          record.notes?.slice(0, 50) + (record.notes?.length > 50 ? "..." : "") || "用餐记录",
                        tags: record.tags || [],
                        record: record,
                      }))

                      // 将生理记录转换为统一格式
                      const periodRecordsFormatted: DisplayRecord[] = periodRecords.map((record) => ({
                        id: record.id,
                        type: "period",
                        date: record.dateTime,
                        title: "生理记录",
                        description: `${getPeriodStatusText(record.status)}，${getFlowText(record.flow)}`,
                        tags: [
                          `状态: ${getPeriodStatusText(record.status)}`,
                          `流量: ${getFlowText(record.flow)}`,
                          ...(record.tags || []),
                        ],
                        record: record,
                      }))

                      // 合并所有记录并按时间排序
                      const allRecords = [
                        ...stoolRecordsFormatted,
                        ...myRecordsFormatted,
                        ...mealRecordsFormatted,
                        ...periodRecordsFormatted,
                      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

                      // 按日期分组
                      const groupedRecords = allRecords.reduce(
                        (groups, record) => {
                          const dateKey = formatRecordDate(record.date)
                          if (!groups[dateKey]) {
                            groups[dateKey] = []
                          }
                          groups[dateKey].push(record)
                          return groups
                        },
                        {} as Record<string, typeof allRecords>,
                      )

                      return Object.entries(groupedRecords).map(([dateKey, records], groupIndex) => (
                        <div key={dateKey}>
                          {/* Date header */}
                          <div className={`timeline-date ${groupIndex > 0 ? "past-date" : ""}`}>{dateKey}</div>

                          {/* Records for this date */}
                          {records.map((record) => (
                            <div key={record.id} className={`timeline-item ${groupIndex > 0 ? "past-item" : ""}`}>
                              <div className="timeline-time">{formatRecordTime(record.date)}</div>
                              <div className={`record-card rounded-xl p-2.5 shadow-sm transition-all relative`}>
                                {/* 删除按钮 - 只为可编辑的记录类型显示 */}
                                {(record.type === "stool" ||
                                  record.type === "myrecord" ||
                                  record.type === "meal" ||
                                  record.type === "period") && (
                                  <button
                                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors z-10"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (record.type === "stool") {
                                        deleteStoolRecord(record.id)
                                      } else if (record.type === "myrecord") {
                                        deleteMyRecord(record.id)
                                      } else if (record.type === "meal") {
                                        deleteMealRecord(record.id)
                                      } else if (record.type === "period") {
                                        deletePeriodRecord(record.id)
                                      }
                                    }}
                                    title="删除记录"
                                  >
                                    <Trash2 className="text-red-500 w-3 h-3" />
                                  </button>
                                )}

                                <div
                                  className={`flex items-start ${
                                    record.type === "stool" ||
                                    record.type === "myrecord" ||
                                    record.type === "meal" ||
                                    record.type === "period"
                                      ? "cursor-pointer hover:bg-gray-50 rounded-lg p-1 -m-1"
                                      : ""
                                  }`}
                                  onClick={() => {
                                    if (record.type === "stool") {
                                      editStoolRecord(record.id)
                                    } else if (record.type === "myrecord") {
                                      editMyRecord(record.id)
                                    } else if (record.type === "meal") {
                                      editMealRecord(record.id)
                                    } else if (record.type === "period") {
                                      editPeriodRecord(record.id)
                                    }
                                  }}
                                >
                                  {/* Icon based on record type */}
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                      record.type === "meal"
                                        ? "bg-orange-100"
                                        : record.type === "stool"
                                          ? "bg-green-100"
                                          : record.type === "myrecord"
                                            ? "bg-blue-100"
                                            : record.type === "period"
                                              ? "bg-pink-100"
                                              : record.type === "personal"
                                                ? "bg-purple-100"
                                                : record.type === "physical"
                                                  ? "bg-pink-100"
                                                  : "bg-gray-100"
                                    }`}
                                  >
                                    {record.type === "meal" && <Utensils className="text-orange-500 w-4 h-4" />}
                                    {record.type === "stool" && <Sprout className="text-green-500 w-4 h-4" />}
                                    {record.type === "myrecord" && <Folder className="text-blue-500 w-4 h-4" />}
                                    {record.type === "period" && <Heart className="text-pink-500 w-4 h-4" />}
                                    {record.type === "personal" && <Folder className="text-purple-500 w-4 h-4" />}
                                    {record.type === "physical" && <Heart className="text-pink-500 w-4 h-4" />}
                                  </div>

                                  <div className="ml-2 flex-1 pr-8">
                                    <div className="flex justify-between items-start">
                                      <div className="text-sm font-semibold text-gray-900">{record.title}</div>
                                      {(record.type === "stool" ||
                                        record.type === "myrecord" ||
                                        record.type === "meal" ||
                                        record.type === "period") && (
                                        <div className="text-xs text-gray-400">点击编辑</div>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-0.5">{record.description}</div>
                                    {record.tags.length > 0 && (
                                      <div className="flex items-center space-x-1.5 mt-1.5 flex-wrap gap-1">
                                        {record.tags.slice(0, 3).map((tag, tagIndex) => (
                                          <span
                                            key={tagIndex}
                                            className={`px-1.5 py-0.5 text-xs rounded-md ${
                                              record.type === "stool" && tagIndex === 0
                                                ? getStatusColor((record as any).record?.status)
                                                : record.type === "meal" && tagIndex === 0
                                                  ? "bg-orange-100 text-orange-600"
                                                  : record.type === "myrecord"
                                                    ? "bg-blue-100 text-blue-600"
                                                    : record.type === "period"
                                                      ? "bg-pink-100 text-pink-600"
                                                      : record.type === "personal"
                                                        ? "bg-purple-100 text-purple-600"
                                                        : record.type === "physical"
                                                          ? "bg-green-100 text-green-600"
                                                          : "bg-gray-100 text-gray-600"
                                            }`}
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              )}

              {/* Recent Updates Tab */}
              {activeTab === "updates" && (
                <div className="tab-content">
                  {/* 调试信息 */}
                  {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3 text-xs">
                    <div>当前用户: {currentUser?.name || '无'}</div>
                    <div>排便记录数: {stoolRecords.length}</div>
                    <div>加载状态: {isLoading ? '加载中...' : '已完成'}</div>
                    {stoolRecords.length > 0 && (
                      <div>记录详情: {stoolRecords.map(r => `ID:${r.id.slice(-4)},日期:${r.date.slice(0,10)}`).join(', ')}</div>
                    )}
                  </div> */}

                  <div className="timeline-container">
                    <div className="timeline-line"></div>

                    {/* 创建按 updatedAt 排序的记录数据 */}
                    {(() => {
                      // 将排便记录转换为统一格式，按 updatedAt 排序
                      const stoolRecordsFormatted: DisplayRecord[] = stoolRecords.map((record) => ({
                        id: record.id,
                        type: "stool",
                        date: record.updatedAt, // 使用 updatedAt 而不是 date
                        originalDate: record.date, // 保留原始日期用于显示
                        title: "排便记录",
                        description:
                          record.notes || `${getStoolStatusText(record.status)}，${getTypeText(record.type)}`,
                        tags: [
                          `状态: ${getStoolStatusText(record.status)}`,
                          `类型: ${getTypeText(record.type)}`,
                          ...(record.tags || []),
                        ],
                        record: record,
                        isUpdated: record.updatedAt !== record.createdAt, // 判断是否是更新的记录
                      }))

                      // 将我的记录转换为统一格式，按 updatedAt 排序
                      const myRecordsFormattedByUpdate: DisplayRecord[] = myRecords.map((record) => ({
                        id: record.id,
                        type: "myrecord",
                        date: record.updatedAt,
                        originalDate: record.dateTime, // 保留原始日期时间用于显示
                        title: "我的记录",
                        description: record.content.slice(0, 50) + (record.content.length > 50 ? "..." : ""),
                        tags: record.tags,
                        record: record,
                        isUpdated: record.updatedAt !== record.createdAt,
                      }))

                      // 将用餐记录转换为统一格式，按 updatedAt 排序
                      const mealRecordsFormattedByUpdate: DisplayRecord[] = mealRecords.map((record) => ({
                        id: record.id,
                        type: "meal",
                        date: record.updatedAt,
                        originalDate: record.dateTime, // 保留原始日期时间用于显示
                        title: "用餐记录",
                        description:
                          record.notes?.slice(0, 50) + (record.notes?.length > 50 ? "..." : "") || "用餐记录",
                        tags: record.tags || [],
                        record: record,
                        isUpdated: record.updatedAt !== record.createdAt,
                      }))

                      // 将生理记录转换为统一格式，按 updatedAt 排序
                      const periodRecordsFormattedByUpdate: DisplayRecord[] = periodRecords.map((record) => ({
                        id: record.id,
                        type: "period",
                        date: record.updatedAt,
                        originalDate: record.dateTime,
                        title: "生理记录",
                        description: `${getPeriodStatusText(record.status)}，${getFlowText(record.flow)}`,
                        tags: [
                          `状态: ${getPeriodStatusText(record.status)}`,
                          `流量: ${getFlowText(record.flow)}`,
                          ...(record.tags || []),
                        ],
                        record: record,
                        isUpdated: record.updatedAt !== record.createdAt,
                      }))

                      // 显示所有记录，按 updatedAt 时间排序（最新的在前）
                      const updatedRecords = [
                        ...stoolRecordsFormatted,
                        ...myRecordsFormattedByUpdate,
                        ...mealRecordsFormattedByUpdate,
                        ...periodRecordsFormattedByUpdate,
                      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

                      if (updatedRecords.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                              <Clock className="text-gray-400 text-xl" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">最近更新</h3>
                            <p className="text-sm text-gray-500">暂无更新内容</p>
                          </div>
                        )
                      }

                      // 按日期分组（使用 updatedAt）
                      const groupedRecords = updatedRecords.reduce(
                        (groups, record) => {
                          const dateKey = formatRecordDate(record.date)
                          if (!groups[dateKey]) {
                            groups[dateKey] = []
                          }
                          groups[dateKey].push(record)
                          return groups
                        },
                        {} as Record<string, typeof updatedRecords>,
                      )

                      return Object.entries(groupedRecords).map(([dateKey, records], groupIndex) => (
                        <div key={dateKey}>
                          {/* Date header */}
                          <div className={`timeline-date ${groupIndex > 0 ? "past-date" : ""}`}>{dateKey}</div>

                          {/* Records for this date */}
                          {records.map((record) => (
                            <div key={record.id} className={`timeline-item ${groupIndex > 0 ? "past-item" : ""}`}>
                              <div className="timeline-time">{formatRecordTime(record.date)}</div>
                              <div className={`record-card rounded-xl p-2.5 shadow-sm transition-all relative`}>
                                {/* 删除按钮 */}
                                <button
                                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors z-10"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (record.type === "stool") {
                                      deleteStoolRecord(record.id)
                                    } else if (record.type === "myrecord") {
                                      deleteMyRecord(record.id)
                                    } else if (record.type === "meal") {
                                      deleteMealRecord(record.id)
                                    }
                                  }}
                                  title="删除记录"
                                >
                                  <Trash2 className="text-red-500 w-3 h-3" />
                                </button>

                                <div
                                  className={`flex items-start ${
                                    record.type === "stool" || record.type === "myrecord" || record.type === "meal"
                                      ? "cursor-pointer hover:bg-gray-50 rounded-lg p-1 -m-1"
                                      : ""
                                  }`}
                                  onClick={() => {
                                    if (record.type === "stool") {
                                      editStoolRecord(record.id)
                                    } else if (record.type === "myrecord") {
                                      editMyRecord(record.id)
                                    } else if (record.type === "meal") {
                                      editMealRecord(record.id)
                                    }
                                  }}
                                >
                                  {/* Icon based on record type */}
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                      record.type === "stool"
                                        ? "bg-green-100"
                                        : record.type === "myrecord"
                                          ? "bg-blue-100"
                                          : record.type === "meal"
                                            ? "bg-orange-100"
                                            : "bg-gray-100"
                                    }`}
                                  >
                                    {record.type === "stool" && <Sprout className="text-green-500 w-4 h-4" />}
                                    {record.type === "myrecord" && <Folder className="text-blue-500 w-4 h-4" />}
                                    {record.type === "meal" && <Utensils className="text-orange-500 w-4 h-4" />}
                                  </div>

                                  <div className="ml-2 flex-1 pr-8">
                                    <div className="flex justify-between items-start">
                                      <div className="text-sm font-semibold text-gray-900 flex items-center">
                                        {record.title}
                                        <span
                                          className={`ml-2 px-1.5 py-0.5 text-xs rounded-md ${
                                            record.isUpdated
                                              ? "bg-blue-100 text-blue-600"
                                              : "bg-green-100 text-green-600"
                                          }`}
                                        >
                                          {record.isUpdated ? "已更新" : "新增"}
                                        </span>
                                      </div>
                                      {(record.type === "stool" ||
                                        record.type === "myrecord" ||
                                        record.type === "meal") && (
                                        <div className="text-xs text-gray-400">点击编辑</div>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-0.5">{record.description}</div>
                                    {/* 显示原始记录时间和更新时间 */}
                                    <div className="text-xs text-gray-500 mt-1">
                                      记录时间:{" "}
                                      {record.originalDate
                                        ? formatRecordTime(record.originalDate)
                                        : formatRecordTime(record.date)}{" "}
                                      | 更新时间: {formatRecordTime(record.date)}
                                    </div>
                                    {record.tags.length > 0 && (
                                      <div className="flex items-center space-x-1.5 mt-1.5 flex-wrap gap-1">
                                        {record.tags.slice(0, 3).map((tag, tagIndex) => (
                                          <span
                                            key={tagIndex}
                                            className={`px-1.5 py-0.5 text-xs rounded-md ${
                                              record.type === "stool" && tagIndex === 0
                                                ? getStatusColor((record as any).record?.status)
                                                : record.type === "meal" && tagIndex === 0
                                                  ? "bg-orange-100 text-orange-600"
                                                  : record.type === "myrecord"
                                                    ? "bg-blue-100 text-blue-600"
                                                    : "bg-gray-100 text-gray-600"
                                            }`}
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <div className="tab-content">
                  <div className="space-y-4">
                    {/* Data Management */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                        <Database className="text-health-primary mr-2" />
                        数据管理
                      </h4>

                      <div className="space-y-3">
                        {/* <button onClick={syncFromToOneDrive} className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-3">
                            <Download className="text-blue-500" />
                            <div className="text-left">
                              <div className="text-sm font-medium text-gray-900">OneDrive同期</div>
                              <div className="text-xs text-gray-500">OneDrive同期</div>
                            </div>
                          </div>
                          <ChevronRight className="text-gray-400" />
                        </button> */}
                        {/* OneDrive同步 */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                              OneDrive同步
                              {oneDriveState.isAuthenticated && <CheckCircle className="w-3 h-3 text-green-500 ml-1" />}
                              {oneDriveState.error && <AlertCircle className="w-3 h-3 text-red-500 ml-1" />}
                            </div>
                            <div className="text-xs text-gray-500">
                              {oneDriveState.isAuthenticated
                                ? `已连接 · 最后同步: ${formatSyncTime(oneDriveState.lastSyncTime)}`
                                : "自动备份到OneDrive云端"}
                            </div>
                            {oneDriveState.userInfo && (
                              <div className="text-xs text-health-primary mt-0.5">
                                {oneDriveState.userInfo.username}
                              </div>
                            )}
                            {oneDriveState.error && (
                              <div className="text-xs text-red-500 mt-0.5">{oneDriveState.error}</div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* {oneDriveState.isAuthenticated && (
                              <button
                                onClick={() => {
                                  if (currentUser) {
                                    oneDriveActions.exportData(currentUser.id)
                                  }
                                }}
                                disabled={oneDriveState.syncStatus === 'syncing' || oneDriveState.isConnecting || oneDriveState.isExporting || !currentUser}
                                className="px-2 py-1 text-xs text-health-primary hover:bg-health-primary/10 rounded-md transition-colors disabled:opacity-50"
                              >
                                {oneDriveState.isExporting ? '导出中...' : oneDriveState.syncStatus === 'syncing' ? '同步中...' : '导出数据'}
                              </button>
                            )} */}
                            {/* {oneDriveState.isAuthenticated && (
                              <button
                                onClick={() => currentUser && oneDriveActions.startSync(currentUser.id)}
                                disabled={!currentUser || oneDriveState.syncStatus === 'syncing' || oneDriveState.isConnecting || oneDriveState.isExporting}
                                className="px-2 py-1 text-xs text-health-primary hover:bg-health-primary/10 rounded-md transition-colors disabled:opacity-50"
                              >
                                {oneDriveState.syncStatus === 'syncing' ? '同步中...' : '立即同步'}
                              </button>
                            )} */}
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={oneDriveState.isAuthenticated}
                                onChange={async (e) => {
                                  if (e.target.checked) {
                                    await oneDriveActions.connect()
                                    await oneDriveActions.checkConnection()
                                    await syncData()
                                  } else {
                                    await oneDriveActions.disconnect()
                                  }
                                }}
                                disabled={oneDriveState.isConnecting}
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-health-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-health-primary peer-disabled:opacity-50"></div>
                            </label>
                          </div>
                        </div>

                        <button
                          onClick={syncData}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <Download className="text-blue-500" />
                            <div className="text-left">
                              <div className="text-sm font-medium text-gray-900">立即同步</div>
                              <div className="text-xs text-gray-500">立即同步</div>
                            </div>
                          </div>
                          <ChevronRight className="text-gray-400" />
                        </button>

                        <button
                          onClick={gotoOneDriveStatus}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <Upload className="text-green-500" />
                            <div className="text-left">
                              <div className="text-sm font-medium text-gray-900">OneDrive登录状态</div>
                              <div className="text-xs text-gray-500">OneDrive登录状态确认</div>
                            </div>
                          </div>
                          <ChevronRight className="text-gray-400" />
                        </button>

                        {/* <button onClick={exportData} className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-3">
                            <Download className="text-blue-500" />
                            <div className="text-left">
                              <div className="text-sm font-medium text-gray-900">导出数据</div>
                              <div className="text-xs text-gray-500">导出所有健康记录</div>
                            </div>
                          </div>
                          <ChevronRight className="text-gray-400" />
                        </button> */}

                        {/* <button onClick={importData} className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-3">
                            <Upload className="text-green-500" />
                            <div className="text-left">
                              <div className="text-sm font-medium text-gray-900">导入数据</div>
                              <div className="text-xs text-gray-500">从文件导入健康数据</div>
                            </div>
                          </div>
                          <ChevronRight className="text-gray-400" />
                        </button> */}

                        {/* <button onClick={clearData} className="w-full flex items-center justify-between p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                          <div className="flex items-center space-x-3">
                            <Trash2 className="text-red-500" />
                            <div className="text-left">
                              <div className="text-sm font-medium text-red-700">清除数据</div>
                              <div className="text-xs text-red-500">删除所有健康记录</div>
                            </div>
                          </div>
                          <ChevronRight className="text-red-400" />
                        </button> */}
                      </div>
                    </div>

                    {/* User Management Section */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                        <Users className="text-health-primary mr-2" />
                        用户管理
                        {users.length > 0 && (
                          <span className="ml-2 text-xs bg-health-primary/10 text-health-primary px-2 py-1 rounded-full">
                            {users.length}个用户
                          </span>
                        )}
                      </h4>
                      <div className="space-y-3">
                        {isLoading ? (
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-gray-300 animate-pulse"></div>
                              <div className="space-y-1">
                                <div className="w-16 h-4 bg-gray-300 rounded animate-pulse"></div>
                                <div className="w-12 h-3 bg-gray-300 rounded animate-pulse"></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* User List */}
                            {users.map((user) => (
                              <div
                                key={user.id}
                                className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                                  user.isActive
                                    ? "bg-health-primary/5 border border-health-primary/20"
                                    : "bg-gray-50 hover:bg-gray-100"
                                }`}
                                onClick={() => editUser(user)}
                                style={{ cursor: "pointer" }}
                              >
                                <div className="flex items-center space-x-3 flex-1">
                                  <SafeAvatar
                                    src={user.avatarUrl}
                                    alt={user.name}
                                    className={`w-10 h-10 rounded-full ring-2 object-cover ${
                                      user.isActive ? "ring-health-primary/40" : "ring-gray-200"
                                    }`}
                                    fallbackClassName="w-10 h-10"
                                  />
                                  <div>
                                    <div className="text-sm font-semibold text-gray-900 flex items-center">
                                      {user.name}
                                      {user.isActive && <CheckCircle className="w-3 h-3 text-health-primary ml-1" />}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {user.isActive
                                        ? "当前用户"
                                        : `创建于 ${UserUtils.formatCreatedTime(new Date(user.createdAt))}`}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {!(user.id === currentUser.id) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        switchUser(user.id)
                                      }}
                                      className="px-2 py-1 text-xs text-health-primary hover:bg-health-primary/10 rounded-md transition-colors"
                                    >
                                      切换
                                    </button>
                                  )}
                                  {user.id === currentUser.id && (
                                    <span className="px-2 py-1 bg-health-primary/10 text-health-primary text-xs rounded-md">
                                      当前
                                    </span>
                                  )}
                                  {users.length > 1 && user.id !== "user_self" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        deleteUser(user.id)
                                      }}
                                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="删除用户"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        {/* Add User Button */}
                        <button
                          onClick={addUser}
                          className="w-full flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-health-primary hover:bg-health-primary/5 transition-colors"
                        >
                          <Plus className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-600">添加新用户</span>
                        </button>
                      </div>
                    </div>

                    {/* General Settings */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                        <Settings className="text-health-primary mr-2" />
                        常规设置
                      </h4>
                      <div className="space-y-3">
                        {/* Notification Settings */}
                        {/* <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">推送通知</div>
                            <div className="text-xs text-gray-500">接收记录提醒通知</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-health-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-health-primary"></div>
                          </label>
                        </div> */}

                        {/* Auto Backup */}
                        {/* <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">自动备份</div>
                            <div className="text-xs text-gray-500">自动备份健康数据</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-health-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-health-primary"></div>
                          </label>
                        </div> */}

                        {/* Dark Mode */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">深色模式</div>
                            <div className="text-xs text-gray-500">使用深色主题</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-health-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-health-primary"></div>
                          </label>
                        </div>

                        {/* Admin Panel */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div>
                            <div className="text-sm font-medium text-gray-900">管理面板</div>
                            <div className="text-xs text-gray-500">数据库管理工具</div>
                          </div>
                          <button
                            onClick={() => window.open("/admin", "_blank")}
                            className="px-3 py-1.5 text-xs font-medium text-health-primary hover:text-health-primary/80 bg-health-primary/10 hover:bg-health-primary/20 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Database className="w-3 h-3" />
                            打开
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Floating Action Button */}
        <div className="fixed bottom-6 right-4 z-40">
          <button
            onClick={openRecordModal}
            className="floating-action-btn w-14 h-14 rounded-xl flex items-center justify-center shadow-2xl"
          >
            <Plus className="text-white text-lg" />
          </button>
        </div>

        {/* Record Type Selection Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={closeRecordModal}></div>

            {/* Modal Content */}
            <div className="relative flex items-center justify-center min-h-screen p-6 w-full">
              <div
                className={`glass-morphism rounded-3xl p-6 w-full max-w-sm transform transition-all ${isModalOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">选择记录类型</h3>
                  <button
                    onClick={closeRecordModal}
                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <X className="text-gray-500 w-4 h-4" />
                  </button>
                </div>

                {/* Record Type Options */}
                <div className="space-y-2">
                  {/* 一日三餐 */}
                  <button
                    onClick={() => selectRecordType("meals")}
                    className="w-full record-type-option flex items-center space-x-3 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-105"
                  >
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Utensils className="text-orange-500 text-base" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-sm font-semibold text-gray-900">一日三餐</div>
                      <div className="text-xs text-gray-500">记录早餐、午餐、晚餐</div>
                    </div>
                    <ChevronRight className="text-gray-400 w-4 h-4" />
                  </button>

                  {/* 排便记录 */}
                  <button
                    onClick={() => selectRecordType("stool")}
                    className="w-full record-type-option flex items-center space-x-3 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-105"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Sprout className="text-green-500 text-base" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-sm font-semibold text-gray-900">排便记录</div>
                      <div className="text-xs text-gray-500">记录排便状态和健康</div>
                    </div>
                    <ChevronRight className="text-gray-400 w-4 h-4" />
                  </button>

                  {/* 生理记录 */}
                  <button
                    onClick={() => selectRecordType("period")}
                    className="w-full record-type-option flex items-center space-x-3 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-105"
                  >
                    <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                      <Heart className="text-pink-500 text-base" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-sm font-semibold text-gray-900">生理记录</div>
                      <div className="text-xs text-gray-500">记录生理日期和状态</div>
                    </div>
                    <ChevronRight className="text-gray-400 w-4 h-4" />
                  </button>

                  {/* 我的记录 */}
                  <button
                    onClick={() => selectRecordType("myrecord")}
                    className="w-full record-type-option flex items-center space-x-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all hover:scale-105"
                  >
                    <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                      <Folder className="text-purple-500 text-lg" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-base font-semibold text-gray-900">我的记录</div>
                      <div className="text-sm text-gray-500">随记</div>
                    </div>
                    <ChevronRight className="text-gray-400" />
                  </button>
                </div>

                {/* Cancel Button */}
                <button
                  onClick={closeRecordModal}
                  className="w-full mt-6 py-3 text-gray-600 font-medium hover:text-gray-800 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {isAddUserModalOpen && (
          <AddUserModal isOpen={isAddUserModalOpen} onClose={closeAddUserModal} onAddUser={handleAddUser} />
        )}

        {isEditUserModalOpen && editingUser && (
          <AddUserModal
            isOpen={isEditUserModalOpen}
            onClose={closeEditUserModal}
            onAddUser={handleEditUser}
            onEditUser={handleEditUser}
            editUser={editingUser}
            isEditMode={true}
          />
        )}
      </div>

      <style jsx>{`
        :root {
          --health-primary: #10B981;
          --health-secondary: #059669;
          --health-accent: #34D399;
          --health-warm: #F59E0B;
          --health-cool: #3B82F6;
          --health-soft: #8B5CF6;
        }
        
        .glass-morphism {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        }
        
        .calendar-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin: 0 1px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        
        .calendar-cell {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        
        .calendar-cell:hover {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.1) 100%);
          transform: scale(1.05);
        }
        
        .calendar-cell.today {
          background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
        }
        
        .record-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid rgba(226, 232, 240, 0.8);
        }
        
        .record-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border-color: rgba(16, 185, 129, 0.2);
        }
        
        .floating-action-btn {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .floating-action-btn:hover {
          transform: scale(1.1) rotate(90deg);
          box-shadow: 0 15px 35px rgba(16, 185, 129, 0.4);
        }
        
        .hero-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #667eea 50%, #f093fb 75%, #f5576c 100%);
          background-size: 300% 300%;
          animation: gradient 15s ease infinite;
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .stat-card {
          background: linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%);
          border: 1px solid rgba(226, 232, 240, 0.6);
          transition: all 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .health-icon {
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .health-icon.primary {
          background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
        }
        
        .health-icon.warm {
          background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%);
        }
        
        .health-icon.soft {
          background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%);
        }
        
        .health-icon.privacy {
          background: linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%);
        }
        
        .pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
        }
        
        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          80%, 100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
        
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideUp {
          0% { transform: translateY(100px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        .text-health-primary {
          color: #10B981;
        }
        
        .record-type-option {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .record-type-option:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .record-type-option:active {
          transform: translateY(0) scale(0.98);
        }
        
        /* Timeline Styles */
        .timeline-container {
          position: relative;
          padding-left: 1rem;
        }
        
        .timeline-line {
          position: absolute;
          left: 1.25rem;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(to bottom, 
            rgba(16, 185, 129, 0.3) 0%, 
            rgba(16, 185, 129, 0.15) 100%);
        }
        
        .timeline-date {
          position: relative;
          margin-bottom: 0.75rem;
          padding-left: 2rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--health-primary);
        }
        
        .timeline-date::before {
          content: '';
          position: absolute;
          left: 0.25rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1rem;
          height: 1rem;
          border-radius: 50%;
          background-color: var(--health-primary);
          border: 2px solid white;
          z-index: 10;
          box-shadow: 0 1px 4px rgba(16, 185, 129, 0.3);
        }
        
        .timeline-date.past-date {
          color: #6b7280;
        }
        
        .timeline-date.past-date::before {
          background-color: #d1d5db;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
        }
        
        .timeline-item {
          position: relative;
          margin-bottom: 1rem;
          padding-left: 2rem;
        }
        
        .timeline-item::before {
          content: '';
          position: absolute;
          left: 0.75rem;
          top: 1rem;
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          background-color: var(--health-accent);
          border: 1px solid white;
          z-index: 10;
          box-shadow: 0 1px 3px rgba(16, 185, 129, 0.3);
        }
        
        .timeline-item.past-item::before {
          background-color: #9ca3af;
        }
        
        .timeline-time {
          position: absolute;
          left: -0.25rem;
          top: 1rem;
          background: white;
          padding: 0.125rem 0.375rem;
          border-radius: 8px;
          font-size: 0.65rem;
          font-weight: 500;
          color: var(--health-secondary);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          z-index: 10;
        }
        
        .timeline-item.past-item .timeline-time {
          color: #6b7280;
        }
      `}</style>
    </div>
  )
}

export default HealthCalendar
