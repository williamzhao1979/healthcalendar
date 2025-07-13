import Dexie, { type EntityTable } from "dexie"

// 用户接口
export interface User {
  id: string
  name: string
  avatar?: string
  relationship?: string
  birthDate?: string
  gender?: "male" | "female" | "other"
  phone?: string
  email?: string
  address?: string
  emergencyContact?: string
  medicalHistory?: string[]
  allergies?: string[]
  medications?: string[]
  createdAt: number
  updatedAt?: number
}

// 健康记录接口
export interface HealthRecord {
  id: string
  userId: string
  type: string
  category: string
  timestamp: number
  note?: string
  details?: Record<string, any>
  attachments?: Array<{
    name: string
    size: number
    type: string
    compressed?: boolean
  }>
  createdAt: number
  updatedAt?: number
}

// 设置接口
export interface Setting {
  key: string
  value: any
  updatedAt: number
}

// 数据库类
class HealthCalendarDB extends Dexie {
  users!: EntityTable<User, "id">
  healthRecords!: EntityTable<HealthRecord, "id">
  settings!: EntityTable<Setting, "key">

  constructor() {
    super("HealthCalendarDB")

    this.version(1).stores({
      users: "id, name, relationship, createdAt",
      healthRecords: "id, userId, type, category, timestamp, createdAt",
      settings: "key, updatedAt",
    })
  }
}

// 数据库实例
const db = new HealthCalendarDB()

// 数据库服务类
class DatabaseService {
  private initialized = false

  // 初始化数据库
  async initialize() {
    if (this.initialized) return

    try {
      await db.open()

      // 检查是否有默认用户，如果没有则创建
      const userCount = await db.users.count()
      if (userCount === 0) {
        await this.createDefaultUsers()
      }

      this.initialized = true
      console.log("数据库初始化成功")
    } catch (error) {
      console.error("数据库初始化失败:", error)
      throw error
    }
  }

  // 创建默认用户
  private async createDefaultUsers() {
    const defaultUsers: Omit<User, "id" | "createdAt">[] = [
      {
        name: "张三",
        relationship: "本人",
        avatar: "/placeholder-user.jpg",
        gender: "male",
        birthDate: "1990-01-01",
      },
      {
        name: "李四",
        relationship: "配偶",
        avatar: "/placeholder-user.jpg",
        gender: "female",
        birthDate: "1992-05-15",
      },
      {
        name: "小明",
        relationship: "子女",
        avatar: "/placeholder-user.jpg",
        gender: "male",
        birthDate: "2015-08-20",
      },
    ]

    for (const userData of defaultUsers) {
      await this.addUser(userData)
    }
  }

  // 生成唯一ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // 用户相关方法
  async getUsers(): Promise<User[]> {
    try {
      return await db.users.orderBy("createdAt").toArray()
    } catch (error) {
      console.error("获取用户列表失败:", error)
      return []
    }
  }

  async getUserById(id: string): Promise<User | undefined> {
    try {
      return await db.users.get(id)
    } catch (error) {
      console.error("获取用户失败:", error)
      return undefined
    }
  }

  async addUser(userData: Omit<User, "id" | "createdAt">): Promise<User> {
    try {
      const user: User = {
        ...userData,
        id: this.generateId(),
        createdAt: Date.now(),
      }

      await db.users.add(user)
      return user
    } catch (error) {
      console.error("添加用户失败:", error)
      throw error
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    try {
      await db.users.update(id, {
        ...updates,
        updatedAt: Date.now(),
      })
    } catch (error) {
      console.error("更新用户失败:", error)
      throw error
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      // 删除用户相关的健康记录
      await db.healthRecords.where("userId").equals(id).delete()
      // 删除用户
      await db.users.delete(id)
    } catch (error) {
      console.error("删除用户失败:", error)
      throw error
    }
  }

  // 健康记录相关方法
  async getHealthRecords(userId?: string): Promise<HealthRecord[]> {
    try {
      if (userId) {
        return await db.healthRecords.where("userId").equals(userId).orderBy("timestamp").reverse().toArray()
      } else {
        return await db.healthRecords.orderBy("timestamp").reverse().toArray()
      }
    } catch (error) {
      console.error("获取健康记录失败:", error)
      return []
    }
  }

  async addHealthRecord(recordData: Omit<HealthRecord, "id" | "createdAt">): Promise<HealthRecord> {
    try {
      const record: HealthRecord = {
        ...recordData,
        id: this.generateId(),
        createdAt: Date.now(),
      }

      await db.healthRecords.add(record)
      return record
    } catch (error) {
      console.error("添加健康记录失败:", error)
      throw error
    }
  }

  async updateHealthRecord(id: string, updates: Partial<HealthRecord>): Promise<void> {
    try {
      await db.healthRecords.update(id, {
        ...updates,
        updatedAt: Date.now(),
      })
    } catch (error) {
      console.error("更新健康记录失败:", error)
      throw error
    }
  }

  async deleteHealthRecord(id: string): Promise<void> {
    try {
      await db.healthRecords.delete(id)
    } catch (error) {
      console.error("删除健康记录失败:", error)
      throw error
    }
  }

  // 设置相关方法
  async getSetting(key: string): Promise<any> {
    try {
      const setting = await db.settings.get(key)
      return setting?.value
    } catch (error) {
      console.error("获取设置失败:", error)
      return null
    }
  }

  async setSetting(key: string, value: any): Promise<void> {
    try {
      await db.settings.put({
        key,
        value,
        updatedAt: Date.now(),
      })
    } catch (error) {
      console.error("设置保存失败:", error)
      throw error
    }
  }

  // 清空所有数据
  async clearAllData(): Promise<void> {
    try {
      await db.users.clear()
      await db.healthRecords.clear()
      await db.settings.clear()
    } catch (error) {
      console.error("清空数据失败:", error)
      throw error
    }
  }
}

// 导出数据库服务实例
const dbService = new DatabaseService()
export default dbService
