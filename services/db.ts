import Dexie, { type EntityTable } from "dexie"

export interface User {
  id: string
  name: string
  avatar?: string
  createdAt: Date
}

export interface HealthRecord {
  id: string
  userId: string
  date: string
  type: "stool" | "medication" | "symptom" | "other"
  data: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface Settings {
  id: string
  userId: string
  key: string
  value: any
  updatedAt: Date
}

class HealthDatabase extends Dexie {
  users!: EntityTable<User, "id">
  healthRecords!: EntityTable<HealthRecord, "id">
  settings!: EntityTable<Settings, "id">

  constructor() {
    super("HealthDatabase")
    this.version(1).stores({
      users: "id, name, createdAt",
      healthRecords: "id, userId, date, type, createdAt, updatedAt",
      settings: "id, userId, key, updatedAt",
    })
  }
}

const db = new HealthDatabase()

class DatabaseService {
  private db = db

  async initialize() {
    try {
      await this.db.open()

      // 检查是否有默认用户，如果没有则创建
      const userCount = await this.db.users.count()
      if (userCount === 0) {
        await this.createDefaultUsers()
      }
    } catch (error) {
      console.error("Database initialization failed:", error)
      throw error
    }
  }

  private async createDefaultUsers() {
    const defaultUsers: Omit<User, "id">[] = [
      {
        name: "张三",
        avatar: "/placeholder-user.jpg",
        createdAt: new Date(),
      },
      {
        name: "李四",
        avatar: "/placeholder-user.jpg",
        createdAt: new Date(),
      },
      {
        name: "王五",
        avatar: "/placeholder-user.jpg",
        createdAt: new Date(),
      },
    ]

    for (const user of defaultUsers) {
      await this.addUser(user)
    }
  }

  // User methods
  async getAllUsers(): Promise<User[]> {
    return await this.db.users.orderBy("createdAt").toArray()
  }

  async getUser(id: string): Promise<User | undefined> {
    return await this.db.users.get(id)
  }

  async addUser(userData: Omit<User, "id" | "createdAt">): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      ...userData,
      createdAt: new Date(),
    }
    await this.db.users.add(user)
    return user
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    await this.db.users.update(id, updates)
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.users.delete(id)
    // Also delete related records
    await this.db.healthRecords.where("userId").equals(id).delete()
    await this.db.settings.where("userId").equals(id).delete()
  }

  // Health Record methods
  async getHealthRecords(userId: string, type?: string): Promise<HealthRecord[]> {
    let query = this.db.healthRecords.where("userId").equals(userId)
    if (type) {
      query = query.and((record) => record.type === type)
    }
    return await query.orderBy("date").reverse().toArray()
  }

  async addHealthRecord(recordData: Omit<HealthRecord, "id" | "createdAt" | "updatedAt">): Promise<HealthRecord> {
    const record: HealthRecord = {
      id: crypto.randomUUID(),
      ...recordData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await this.db.healthRecords.add(record)
    return record
  }

  async updateHealthRecord(id: string, updates: Partial<HealthRecord>): Promise<void> {
    await this.db.healthRecords.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  }

  async deleteHealthRecord(id: string): Promise<void> {
    await this.db.healthRecords.delete(id)
  }

  // Settings methods
  async getSetting(userId: string, key: string): Promise<any> {
    const setting = await this.db.settings.where({ userId, key }).first()
    return setting?.value
  }

  async setSetting(userId: string, key: string, value: any): Promise<void> {
    const existing = await this.db.settings.where({ userId, key }).first()
    if (existing) {
      await this.db.settings.update(existing.id, {
        value,
        updatedAt: new Date(),
      })
    } else {
      await this.db.settings.add({
        id: crypto.randomUUID(),
        userId,
        key,
        value,
        updatedAt: new Date(),
      })
    }
  }

  async deleteSetting(userId: string, key: string): Promise<void> {
    await this.db.settings.where({ userId, key }).delete()
  }
}

const dbService = new DatabaseService()
export default dbService
