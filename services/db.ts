export interface User {
  id: string
  name: string
  relationship: string
  avatar?: string
  createdAt: Date
}

export interface HealthRecord {
  id: string
  userId: string
  type: "stool" | "urine" | "weight" | "blood_pressure" | "temperature" | "other"
  date: Date
  data: any
  notes?: string
  createdAt: Date
}

export interface Settings {
  id: string
  userId: string
  key: string
  value: any
  updatedAt: Date
}

class DatabaseService {
  private db: IDBDatabase | null = null
  private readonly dbName = "HealthCalendarDB"
  private readonly dbVersion = 1

  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        reject(new Error("Failed to open database"))
      }

      request.onsuccess = () => {
        this.db = request.result
        this.initializeDefaultUsers().then(resolve).catch(reject)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Users store
        if (!db.objectStoreNames.contains("users")) {
          const userStore = db.createObjectStore("users", { keyPath: "id" })
          userStore.createIndex("name", "name", { unique: false })
          userStore.createIndex("relationship", "relationship", { unique: false })
        }

        // Health records store
        if (!db.objectStoreNames.contains("healthRecords")) {
          const recordStore = db.createObjectStore("healthRecords", { keyPath: "id" })
          recordStore.createIndex("userId", "userId", { unique: false })
          recordStore.createIndex("type", "type", { unique: false })
          recordStore.createIndex("date", "date", { unique: false })
        }

        // Settings store
        if (!db.objectStoreNames.contains("settings")) {
          const settingsStore = db.createObjectStore("settings", { keyPath: "id" })
          settingsStore.createIndex("userId", "userId", { unique: false })
          settingsStore.createIndex("key", "key", { unique: false })
        }
      }
    })
  }

  async initializeDatabase(): Promise<void> {
    return this.initDB()
  }

  private generateUniqueId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async initializeDefaultUsers(): Promise<void> {
    try {
      const existingUsers = await this.getAllUsers()
      if (existingUsers.length === 0) {
        const defaultUsers = [
          { name: "爸爸", relationship: "父亲", avatar: "/placeholder-user.jpg" },
          { name: "妈妈", relationship: "母亲", avatar: "/placeholder-user.jpg" },
          { name: "宝宝", relationship: "孩子", avatar: "/placeholder-user.jpg" },
        ]

        for (const userData of defaultUsers) {
          await this.addUser(userData)
        }
      }
    } catch (error) {
      console.error("Failed to initialize default users:", error)
    }
  }

  async ensureDefaultUserExists(): Promise<User> {
    try {
      const existingUsers = await this.getAllUsers()

      // 查找"我"这个用户
      let meUser = existingUsers.find((user) => user.name === "我" && user.relationship === "本人")

      if (!meUser) {
        console.log("默认用户'我'不存在，正在创建...")
        meUser = await this.addUser({ name: "我", relationship: "本人" })
        console.log("默认用户'我'创建成功:", meUser)
      } else {
        console.log("默认用户'我'已存在:", meUser.name)
      }

      return meUser
    } catch (error) {
      console.error("确保默认用户存在时出错:", error)
      throw error
    }
  }

  private async userExists(name: string, relationship: string): Promise<boolean> {
    try {
      const users = await this.getAllUsers()
      return users.some((user) => user.name === name && user.relationship === relationship)
    } catch (error) {
      console.error("Error checking user existence:", error)
      return false
    }
  }

  async addUser(userData: Omit<User, "id" | "createdAt">): Promise<User> {
    if (!this.db) throw new Error("Database not initialized")

    // 检查用户是否已存在
    const exists = await this.userExists(userData.name, userData.relationship)
    if (exists) {
      // 如果用户已存在，返回现有用户
      const users = await this.getAllUsers()
      const existingUser = users.find((u) => u.name === userData.name && u.relationship === userData.relationship)
      if (existingUser) {
        return existingUser
      }
    }

    const user: User = {
      id: `user_${this.generateUniqueId()}`,
      ...userData,
      createdAt: new Date(),
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["users"], "readwrite")
      const store = transaction.objectStore("users")
      const request = store.put(user) // 使用 put 而不是 add

      request.onsuccess = () => resolve(user)
      request.onerror = () => reject(new Error("Failed to add user"))
    })
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["users"], "readonly")
      const store = transaction.objectStore("users")
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error("Failed to get users"))
    })
  }

  async getUser(id: string): Promise<User | null> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["users"], "readonly")
      const store = transaction.objectStore("users")
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(new Error("Failed to get user"))
    })
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    const user = await this.getUser(id)
    if (!user) throw new Error("User not found")

    const updatedUser = { ...user, ...updates }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["users"], "readwrite")
      const store = transaction.objectStore("users")
      const request = store.put(updatedUser)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error("Failed to update user"))
    })
  }

  async deleteUser(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["users"], "readwrite")
      const store = transaction.objectStore("users")
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error("Failed to delete user"))
    })
  }

  // Health Records methods
  async addHealthRecord(record: Omit<HealthRecord, "id" | "createdAt">): Promise<HealthRecord> {
    if (!this.db) throw new Error("Database not initialized")

    const healthRecord: HealthRecord = {
      id: `record_${this.generateUniqueId()}`,
      ...record,
      createdAt: new Date(),
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["healthRecords"], "readwrite")
      const store = transaction.objectStore("healthRecords")
      const request = store.add(healthRecord)

      request.onsuccess = () => resolve(healthRecord)
      request.onerror = () => reject(new Error("Failed to add health record"))
    })
  }

  async getHealthRecords(userId: string, type?: string): Promise<HealthRecord[]> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["healthRecords"], "readonly")
      const store = transaction.objectStore("healthRecords")
      const index = store.index("userId")
      const request = index.getAll(userId)

      request.onsuccess = () => {
        let records = request.result
        if (type) {
          records = records.filter((record) => record.type === type)
        }
        resolve(records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      }
      request.onerror = () => reject(new Error("Failed to get health records"))
    })
  }

  async updateHealthRecord(id: string, updates: Partial<HealthRecord>): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["healthRecords"], "readwrite")
      const store = transaction.objectStore("healthRecords")
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const record = getRequest.result
        if (!record) {
          reject(new Error("Health record not found"))
          return
        }

        const updatedRecord = { ...record, ...updates }
        const putRequest = store.put(updatedRecord)

        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(new Error("Failed to update health record"))
      }

      getRequest.onerror = () => reject(new Error("Failed to get health record"))
    })
  }

  async deleteHealthRecord(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["healthRecords"], "readwrite")
      const store = transaction.objectStore("healthRecords")
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error("Failed to delete health record"))
    })
  }

  // Settings methods
  async setSetting(userId: string, key: string, value: any): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    const setting: Settings = {
      id: `${userId}_${key}`,
      userId,
      key,
      value,
      updatedAt: new Date(),
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["settings"], "readwrite")
      const store = transaction.objectStore("settings")
      const request = store.put(setting)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error("Failed to set setting"))
    })
  }

  async getSetting(userId: string, key: string): Promise<any> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["settings"], "readonly")
      const store = transaction.objectStore("settings")
      const request = store.get(`${userId}_${key}`)

      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.value : null)
      }
      request.onerror = () => reject(new Error("Failed to get setting"))
    })
  }

  async getUserSettings(userId: string): Promise<Record<string, any>> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["settings"], "readonly")
      const store = transaction.objectStore("settings")
      const index = store.index("userId")
      const request = index.getAll(userId)

      request.onsuccess = () => {
        const settings: Record<string, any> = {}
        request.result.forEach((setting) => {
          settings[setting.key] = setting.value
        })
        resolve(settings)
      }
      request.onerror = () => reject(new Error("Failed to get user settings"))
    })
  }
}

const dbService = new DatabaseService()
export default dbService
