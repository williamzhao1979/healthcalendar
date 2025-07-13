"use client"

export interface User {
  id: string
  name: string
  avatar?: string
  relationship?: string
  createdAt: number
  updatedAt: number
}

export interface HealthRecord {
  id: string
  userId: string
  type: string
  category?: string
  timestamp: number
  meal?: string
  note?: string
  color?: string
  details?: Record<string, any>
  createdAt: number
  updatedAt: number
}

export interface Settings {
  id: string
  lastUserId: string
  theme?: string
  language?: string
  notifications?: boolean
  updatedAt: number
}

class DatabaseService {
  private dbName = "HealthCalendarDB"
  private dbVersion = 1
  private db: IDBDatabase | null = null

  private databaseInitializationPromise: Promise<IDBDatabase> | null = null
  private initializationRetries = 0
  private maxRetries = 3

  // 数据库初始化
  async initDB(): Promise<IDBDatabase> {
    // 如果数据库已初始化，直接返回
    if (this.db) {
      return this.db
    }

    // 如果有初始化进行中的Promise，返回它，避免多次初始化
    if (this.databaseInitializationPromise) {
      return this.databaseInitializationPromise
    }

    // 创建数据库初始化Promise并保存引用
    this.databaseInitializationPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        console.log(`正在初始化IndexedDB数据库 "${this.dbName}" (版本 ${this.dbVersion})...`)

        // 如果在Safari私密浏览模式下，索引数据库可能不可用
        if (!window.indexedDB) {
          throw new Error("您的浏览器不支持IndexedDB或处于私密浏览模式")
        }

        const request = indexedDB.open(this.dbName, this.dbVersion)

        request.onerror = (event) => {
          console.error("IndexedDB初始化错误:", request.error)
          this.databaseInitializationPromise = null // 清除Promise引用以便重试

          // 如果是权限被拒绝错误，不进行重试
          if (request.error?.name === "SecurityError" || request.error?.name === "InvalidStateError") {
            reject(new Error(`IndexedDB访问被拒绝: ${request.error.message}`))
          } else if (this.initializationRetries < this.maxRetries) {
            // 有限次数重试
            this.initializationRetries++
            console.warn(`数据库初始化失败，正在重试 (${this.initializationRetries}/${this.maxRetries})...`)
            setTimeout(() => {
              this.initDB().then(resolve).catch(reject)
            }, 500) // 短暂延迟后重试
          } else {
            reject(request.error)
          }
        }

        request.onsuccess = (event) => {
          console.log("IndexedDB数据库初始化成功")
          this.db = request.result
          this.initializationRetries = 0 // 重置重试计数器

          // 添加关闭事件处理，以便在数据库被关闭时重新初始化
          this.db.onclose = () => {
            console.log("IndexedDB连接被关闭，将在下次访问时重新初始化")
            this.db = null
            this.databaseInitializationPromise = null
          }

          // 添加版本变更事件处理
          this.db.onversionchange = () => {
            console.log("IndexedDB版本已变更，关闭旧连接")
            this.db?.close()
            this.db = null
            this.databaseInitializationPromise = null
          }

          resolve(this.db)
        }

        request.onupgradeneeded = (event) => {
          console.log("数据库需要升级，创建对象存储...")
          const db = request.result

          try {
            // 创建用户存储区
            if (!db.objectStoreNames.contains("users")) {
              console.log("创建users对象存储")
              const usersStore = db.createObjectStore("users", { keyPath: "id" })
              usersStore.createIndex("name", "name", { unique: false })
              usersStore.createIndex("updatedAt", "updatedAt", { unique: false })
            }

            // 创建健康记录存储区
            if (!db.objectStoreNames.contains("healthRecords")) {
              console.log("创建healthRecords对象存储")
              const recordsStore = db.createObjectStore("healthRecords", { keyPath: "id" })
              recordsStore.createIndex("userId", "userId", { unique: false })
              recordsStore.createIndex("type", "type", { unique: false })
              recordsStore.createIndex("timestamp", "timestamp", { unique: false })
              recordsStore.createIndex("updatedAt", "updatedAt", { unique: false })
            }

            // 创建设置存储区
            if (!db.objectStoreNames.contains("settings")) {
              console.log("创建settings对象存储")
              const settingsStore = db.createObjectStore("settings", { keyPath: "id" })
            }

            console.log("数据库对象存储创建完成")
          } catch (upgradeError) {
            console.error("升级数据库结构时出错:", upgradeError)
            // 不要在这里拒绝Promise，让升级过程继续
          }
        }
      } catch (error) {
        console.error("初始化IndexedDB时出错:", error)
        this.databaseInitializationPromise = null
        reject(error)
      }
    })

    return this.databaseInitializationPromise
  }

  // 确保对象存储存在
  private async ensureObjectStoreExists(storeName: string): Promise<IDBDatabase> {
    try {
      const db = await this.initDB()

      // 检查对象存储是否存在
      if (!db.objectStoreNames.contains(storeName)) {
        console.warn(`对象存储 "${storeName}" 不存在，尝试重新初始化数据库...`)

        // 数据库版本升级以创建缺失的对象存储
        this.db = null
        this.databaseInitializationPromise = null
        this.dbVersion++ // 增加版本号，强制触发onupgradeneeded

        console.log(`正在使用新版本 (${this.dbVersion}) 重新打开数据库以创建缺失的对象存储...`)
        return this.initDB() // 重新初始化数据库
      }

      return db
    } catch (error) {
      console.error(`检查对象存储 "${storeName}" 时出错:`, error)
      throw error
    }
  }

  // 通用方法执行数据库操作
  private async performOperation<T>(
    storeName: string,
    operation: (store: IDBObjectStore) => IDBRequest<T>,
    retryCount = 0,
  ): Promise<T> {
    try {
      // 确保对象存储存在
      const db = await this.ensureObjectStoreExists(storeName)

      return new Promise<T>((resolve, reject) => {
        try {
          console.log(`开始数据库事务: ${storeName}`)
          const transaction = db.transaction(storeName, "readwrite")

          transaction.oncomplete = () => {
            console.log(`事务完成: ${storeName}`)
          }

          transaction.onerror = (event) => {
            console.error(`事务错误 (${storeName}):`, transaction.error)
            reject(transaction.error)
          }

          transaction.onabort = (event) => {
            console.error(`事务中止 (${storeName}):`, transaction.error)
            reject(transaction.error || new Error("事务被中止"))
          }

          const store = transaction.objectStore(storeName)
          const request = operation(store)

          request.onsuccess = () => {
            console.log(`操作成功完成: ${storeName}`)
            resolve(request.result)
          }

          request.onerror = () => {
            console.error(`请求错误 (${storeName}):`, request.error)
            reject(request.error)
          }
        } catch (error) {
          console.error(`执行操作错误 (${storeName}):`, error)
          reject(error)
        }
      })
    } catch (error) {
      console.error(`数据库操作错误 (${storeName}):`, error)

      // 重试逻辑
      if (retryCount < 3) {
        console.log(`重试操作 (${retryCount + 1}/3): ${storeName}`)
        // 短暂延迟后重试
        await new Promise((resolve) => setTimeout(resolve, 500))
        return this.performOperation(storeName, operation, retryCount + 1)
      }

      throw error
    }
  }

  // 用户操作
  async getUsers(): Promise<User[]> {
    try {
      // 先确保数据库和用户对象存储已初始化
      await this.ensureObjectStoreExists("users")

      const users = await this.performOperation<User[]>("users", (store) => {
        return store.getAll()
      })

      console.log(`获取到 ${users.length} 个用户`)
      return users
    } catch (error) {
      console.error("获取用户列表失败:", error)
      // 如果出错，返回空数组而不是抛出错误，使应用可以继续运行
      return []
    }
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.performOperation<User | undefined>("users", (store) => {
      return store.get(id)
    })
  }

  async addUser(user: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    const timestamp = Date.now()
    const newUser: User = {
      id: `user_${timestamp}`,
      ...user,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    try {
      console.log(`正在添加新用户: ${user.name || "未命名"}`, newUser)

      // 先确保数据库和用户对象存储已初始化
      await this.ensureObjectStoreExists("users")

      // 执行添加操作
      await this.performOperation("users", (store) => {
        return store.add(newUser)
      })

      console.log(`用户添加成功: ${newUser.id}`)
      return newUser
    } catch (error) {
      console.error("添加用户失败:", error)

      // 如果错误是由于密钥已存在，尝试用put替代add
      if (error instanceof DOMException && error.name === "ConstraintError") {
        console.log("尝试使用put替代add...")
        await this.performOperation("users", (store) => {
          return store.put(newUser)
        })
        return newUser
      }

      throw error
    }
  }

  async updateUser(id: string, userData: Partial<Omit<User, "id" | "createdAt" | "updatedAt">>): Promise<User> {
    const user = await this.getUserById(id)

    if (!user) {
      throw new Error(`找不到ID为${id}的用户`)
    }

    const updatedUser: User = {
      ...user,
      ...userData,
      updatedAt: Date.now(),
    }

    await this.performOperation("users", (store) => {
      return store.put(updatedUser)
    })

    return updatedUser
  }

  async deleteUser(id: string): Promise<void> {
    await this.performOperation("users", (store) => {
      return store.delete(id)
    })
  }

  // 初始化默认用户
  async initializeDefaultUsers(): Promise<void> {
    try {
      const existingUsers = await this.getUsers()

      // 如果已经有用户，不需要创建默认用户
      if (existingUsers.length > 0) {
        console.log("用户已存在，跳过默认用户创建")
        return
      }

      console.log("创建默认用户...")
      const defaultUsers = [
        { name: "我", relationship: "本人" },
        { name: "爸爸", relationship: "父亲" },
        { name: "妈妈", relationship: "母亲" },
      ]

      for (const userData of defaultUsers) {
        await this.addUser(userData)
        console.log(`已创建默认用户: ${userData.name}`)
      }

      console.log("默认用户创建完成")
    } catch (error) {
      console.error("创建默认用户失败:", error)
      throw error
    }
  }

  // 健康记录操作
  async getHealthRecords(
    userId: string,
    options?: {
      type?: string
      startDate?: number
      endDate?: number
      limit?: number
    },
  ): Promise<HealthRecord[]> {
    const db = await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("healthRecords", "readonly")
      const store = transaction.objectStore("healthRecords")

      // 如果userId为空，获取所有记录；否则按用户过滤
      const request = userId ? store.index("userId").getAll(userId) : store.getAll()

      request.onsuccess = () => {
        let records = request.result

        // 应用过滤器
        if (options) {
          if (options.type) {
            records = records.filter((record) => record.type === options.type)
          }

          if (options.startDate) {
            records = records.filter((record) => record.timestamp >= options.startDate!)
          }

          if (options.endDate) {
            records = records.filter((record) => record.timestamp <= options.endDate!)
          }

          records.sort((a, b) => b.timestamp - a.timestamp)

          if (options.limit) {
            records = records.slice(0, options.limit)
          }
        }

        resolve(records)
      }

      request.onerror = () => reject(request.error)
    })
  }

  async getHealthRecordById(id: string): Promise<HealthRecord | undefined> {
    return this.performOperation<HealthRecord | undefined>("healthRecords", (store) => {
      return store.get(id)
    })
  }

  async addHealthRecord(record: Omit<HealthRecord, "id" | "createdAt" | "updatedAt">): Promise<HealthRecord> {
    const timestamp = Date.now()
    const newRecord: HealthRecord = {
      id: `record_${timestamp}`,
      ...record,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await this.performOperation("healthRecords", (store) => {
      return store.add(newRecord)
    })

    return newRecord
  }

  async updateHealthRecord(
    id: string,
    recordData: Partial<Omit<HealthRecord, "id" | "userId" | "createdAt" | "updatedAt">>,
  ): Promise<HealthRecord> {
    const record = await this.getHealthRecordById(id)

    if (!record) {
      throw new Error(`找不到ID为${id}的健康记录`)
    }

    const updatedRecord: HealthRecord = {
      ...record,
      ...recordData,
      updatedAt: Date.now(),
    }

    await this.performOperation("healthRecords", (store) => {
      return store.put(updatedRecord)
    })

    return updatedRecord
  }

  async deleteHealthRecord(id: string): Promise<void> {
    await this.performOperation("healthRecords", (store) => {
      return store.delete(id)
    })
  }

  // 设置操作
  async getSettings(): Promise<Settings | null> {
    try {
      const settings = await this.performOperation<Settings | undefined>("settings", (store) => {
        return store.get("settings")
      })

      return settings || null
    } catch (error) {
      return null
    }
  }

  async updateSettings(settingsData: Partial<Omit<Settings, "id" | "updatedAt">>): Promise<Settings> {
    let settings: Settings

    try {
      const existingSettings = await this.getSettings()

      if (existingSettings) {
        settings = {
          ...existingSettings,
          ...settingsData,
          updatedAt: Date.now(),
        }
      } else {
        settings = {
          id: "settings",
          lastUserId: settingsData.lastUserId || "",
          ...settingsData,
          updatedAt: Date.now(),
        }
      }

      await this.performOperation("settings", (store) => {
        return store.put(settings)
      })

      return settings
    } catch (error) {
      console.error("更新设置时出错:", error)
      throw error
    }
  }

  // 从localStorage迁移数据
  async migrateFromLocalStorage(): Promise<void> {
    try {
      // 确保数据库已经初始化
      const db = await this.initDB()

      // 检查必要的对象存储是否存在
      if (!db.objectStoreNames.contains("users") || !db.objectStoreNames.contains("settings")) {
        console.warn("数据库对象存储不完整，无法迁移数据")
        return
      }

      // 迁移用户
      const storedUsers = localStorage.getItem("healthCalendarUsers")
      if (storedUsers) {
        try {
          const users = JSON.parse(storedUsers)
          const timestamp = Date.now()

          if (Array.isArray(users)) {
            for (const user of users) {
              if (user && typeof user === "object" && user.id) {
                try {
                  await this.performOperation("users", (store) => {
                    return store.put({
                      ...user,
                      createdAt: user.createdAt || timestamp,
                      updatedAt: timestamp,
                    })
                  })
                  console.log(`已迁移用户: ${user.name || user.id}`)
                } catch (userError) {
                  console.error(`迁移用户 ${user.id} 失败:`, userError)
                }
              }
            }
          } else {
            console.warn("localStorage中的用户数据格式无效")
          }
        } catch (parseError) {
          console.error("解析localStorage中的用户数据失败:", parseError)
        }
      }

      // 迁移当前用户ID
      const currentUserId = localStorage.getItem("healthCalendarCurrentUserId")
      if (currentUserId) {
        try {
          await this.updateSettings({ lastUserId: currentUserId })
          console.log(`已迁移当前用户ID: ${currentUserId}`)
        } catch (settingsError) {
          console.error("迁移当前用户ID失败:", settingsError)
        }
      }

      // 迁移后清理localStorage
      // localStorage.removeItem("healthCalendarUsers");
      // localStorage.removeItem("healthCalendarCurrentUserId");

      console.log("从localStorage迁移数据完成")
    } catch (error) {
      console.error("从localStorage迁移数据时出错:", error)
      throw error // 重新抛出错误以便调用者可以处理
    }
  }
}

// 创建单例实例
const dbService = new DatabaseService()

export default dbService
