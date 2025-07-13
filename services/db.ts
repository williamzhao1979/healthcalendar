import Dexie, { type Table } from "dexie"

export interface User {
  id: string
  name: string
  relationship: string
  avatar?: string
  createdAt: Date
  isDefault?: boolean
}

export interface HealthRecord {
  id: string
  userId: string
  type:
    | "food"
    | "stool"
    | "health"
    | "note"
    | "medicine"
    | "sleep"
    | "mental"
    | "pharmacy"
    | "love"
    | "body"
    | "toilet"
    | "sport"
    | "life"
  date: string
  time: string
  data: any
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface Settings {
  id: string
  key: string
  value: any
  updatedAt: Date
}

class HealthCalendarDB extends Dexie {
  users!: Table<User>
  healthRecords!: Table<HealthRecord>
  settings!: Table<Settings>

  constructor() {
    super("HealthCalendarDB")

    this.version(1).stores({
      users: "id, name, relationship, createdAt",
      healthRecords: "id, userId, type, date, time, createdAt",
      settings: "id, key, updatedAt",
    })
  }
}

const db = new HealthCalendarDB()

class DatabaseService {
  private db: HealthCalendarDB

  constructor() {
    this.db = db
  }

  // 初始化数据库
  async initDB(): Promise<void> {
    try {
      await this.db.open()
      await this.ensureDefaultUserExists()
      console.log("数据库初始化成功")
    } catch (error) {
      console.error("数据库初始化失败:", error)
      throw error
    }
  }

  // 别名方法，保持向后兼容
  async initializeDatabase(): Promise<void> {
    return this.initDB()
  }

  // 生成唯一ID
  private generateUniqueId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 确保默认用户存在
  async ensureDefaultUserExists(): Promise<void> {
    try {
      const userCount = await this.db.users.count()
      if (userCount === 0) {
        await this.initializeDefaultUsers()
      }
    } catch (error) {
      console.error("检查默认用户失败:", error)
    }
  }

  // 初始化默认用户
  async initializeDefaultUsers(): Promise<void> {
    const defaultUsers: User[] = [
      {
        id: this.generateUniqueId(),
        name: "我",
        relationship: "self",
        createdAt: new Date(),
        isDefault: true,
      },
      {
        id: this.generateUniqueId(),
        name: "爸爸",
        relationship: "father",
        createdAt: new Date(),
        isDefault: true,
      },
      {
        id: this.generateUniqueId(),
        name: "妈妈",
        relationship: "mother",
        createdAt: new Date(),
        isDefault: true,
      },
    ]

    try {
      for (const user of defaultUsers) {
        await this.db.users.put(user)
      }
      console.log("默认用户创建成功")
    } catch (error) {
      console.error("创建默认用户失败:", error)
    }
  }

  // 用户管理方法
  async getUsers(): Promise<User[]> {
    try {
      return await this.db.users.orderBy("createdAt").toArray()
    } catch (error) {
      console.error("获取用户列表失败:", error)
      return []
    }
  }

  async getUserById(id: string): Promise<User | undefined> {
    try {
      return await this.db.users.get(id)
    } catch (error) {
      console.error("获取用户失败:", error)
      return undefined
    }
  }

  async addUser(user: Omit<User, "id" | "createdAt">): Promise<User> {
    try {
      // 检查是否已存在相同的用户
      const existingUser = await this.db.users
        .where("name")
        .equals(user.name)
        .and((u) => u.relationship === user.relationship)
        .first()

      if (existingUser) {
        return existingUser
      }

      const newUser: User = {
        ...user,
        id: this.generateUniqueId(),
        createdAt: new Date(),
      }

      await this.db.users.put(newUser)
      return newUser
    } catch (error) {
      console.error("添加用户失败:", error)
      throw error
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    try {
      await this.db.users.update(id, updates)
    } catch (error) {
      console.error("更新用户失败:", error)
      throw error
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await this.db.users.delete(id)
      // 同时删除该用户的所有健康记录
      await this.db.healthRecords.where("userId").equals(id).delete()
    } catch (error) {
      console.error("删除用户失败:", error)
      throw error
    }
  }

  // 健康记录管理方法
  async getHealthRecords(userId?: string, type?: string, limit?: number): Promise<HealthRecord[]> {
    try {
      let query = this.db.healthRecords.orderBy("createdAt").reverse()

      if (userId) {
        query = query.filter((record) => record.userId === userId)
      }

      if (type) {
        query = query.filter((record) => record.type === type)
      }

      if (limit) {
        query = query.limit(limit)
      }

      return await query.toArray()
    } catch (error) {
      console.error("获取健康记录失败:", error)
      return []
    }
  }

  async addHealthRecord(record: Omit<HealthRecord, "id" | "createdAt" | "updatedAt">): Promise<HealthRecord> {
    try {
      const newRecord: HealthRecord = {
        ...record,
        id: this.generateUniqueId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await this.db.healthRecords.add(newRecord)
      return newRecord
    } catch (error) {
      console.error("添加健康记录失败:", error)
      throw error
    }
  }

  async updateHealthRecord(id: string, updates: Partial<HealthRecord>): Promise<void> {
    try {
      await this.db.healthRecords.update(id, {
        ...updates,
        updatedAt: new Date(),
      })
    } catch (error) {
      console.error("更新健康记录失败:", error)
      throw error
    }
  }

  async deleteHealthRecord(id: string): Promise<void> {
    try {
      await this.db.healthRecords.delete(id)
    } catch (error) {
      console.error("删除健康记录失败:", error)
      throw error
    }
  }

  // 设置管理方法
  async getSetting(key: string): Promise<any> {
    try {
      const setting = await this.db.settings.get(key)
      return setting?.value
    } catch (error) {
      console.error("获取设置失败:", error)
      return null
    }
  }

  async setSetting(key: string, value: any): Promise<void> {
    try {
      await this.db.settings.put({
        id: key,
        key,
        value,
        updatedAt: new Date(),
      })
    } catch (error) {
      console.error("设置保存失败:", error)
      throw error
    }
  }

  // 数据统计方法
  async getRecordCountByType(userId: string, type: string): Promise<number> {
    try {
      return await this.db.healthRecords
        .where("userId")
        .equals(userId)
        .and((record) => record.type === type)
        .count()
    } catch (error) {
      console.error("获取记录统计失败:", error)
      return 0
    }
  }

  async getRecordsByDateRange(userId: string, startDate: string, endDate: string): Promise<HealthRecord[]> {
    try {
      return await this.db.healthRecords
        .where("userId")
        .equals(userId)
        .and((record) => record.date >= startDate && record.date <= endDate)
        .toArray()
    } catch (error) {
      console.error("获取日期范围记录失败:", error)
      return []
    }
  }
}

const dbService = new DatabaseService()
export default dbService
