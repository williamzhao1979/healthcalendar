// AdminService - 管理员服务类
class AdminService {
  private dbName = "HealthCalendarDB"
  private dbVersion = 1
  private db: IDBDatabase | null = null

  // 初始化数据库
  async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 用户表
        if (!db.objectStoreNames.contains("users")) {
          const userStore = db.createObjectStore("users", { keyPath: "id" })
          userStore.createIndex("name", "name", { unique: false })
          userStore.createIndex("email", "email", { unique: true })
        }

        // 设置表
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" })
        }

        // 生理记录表
        if (!db.objectStoreNames.contains("periodRecords")) {
          const periodStore = db.createObjectStore("periodRecords", { keyPath: "id" })
          periodStore.createIndex("userId", "userId", { unique: false })
          periodStore.createIndex("dateTime", "dateTime", { unique: false })
          periodStore.createIndex("delFlag", "delFlag", { unique: false })
        }

        // 饮食记录表
        if (!db.objectStoreNames.contains("mealRecords")) {
          const mealStore = db.createObjectStore("mealRecords", { keyPath: "id" })
          mealStore.createIndex("userId", "userId", { unique: false })
          mealStore.createIndex("dateTime", "dateTime", { unique: false })
          mealStore.createIndex("delFlag", "delFlag", { unique: false })
        }

        // 大便记录表
        if (!db.objectStoreNames.contains("stoolRecords")) {
          const stoolStore = db.createObjectStore("stoolRecords", { keyPath: "id" })
          stoolStore.createIndex("userId", "userId", { unique: false })
          stoolStore.createIndex("dateTime", "dateTime", { unique: false })
          stoolStore.createIndex("delFlag", "delFlag", { unique: false })
        }
      }
    })
  }

  // 生成唯一ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // 获取所有用户
  async getAllUsers(): Promise<any[]> {
    const db = await this.initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["users"], "readonly")
      const store = transaction.objectStore("users")
      const request = store.getAll()

      request.onsuccess = () => {
        const users = request.result.filter((user: any) => !user.delFlag)
        resolve(users)
      }
      request.onerror = () => reject(request.error)
    })
  }

  // 获取当前用户
  async getCurrentUser(): Promise<any | null> {
    const currentUserId = await this.getSetting("currentUserId")
    if (!currentUserId) {
      // 如果没有当前用户，创建默认用户
      const defaultUser = await this.createDefaultUser()
      await this.setSetting("currentUserId", defaultUser.id)
      return defaultUser
    }

    const db = await this.initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["users"], "readonly")
      const store = transaction.objectStore("users")
      const request = store.get(currentUserId)

      request.onsuccess = () => {
        resolve(request.result || null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  // 创建默认用户
  async createDefaultUser(): Promise<any> {
    const defaultUser = {
      id: this.generateId(),
      name: "默认用户",
      email: "default@example.com",
      avatarUrl: "/placeholder.svg",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      delFlag: false,
    }

    const db = await this.initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["users"], "readwrite")
      const store = transaction.objectStore("users")
      const request = store.add(defaultUser)

      request.onsuccess = () => resolve(defaultUser)
      request.onerror = () => reject(request.error)
    })
  }

  // 设置当前用户
  async setCurrentUser(userId: string): Promise<void> {
    await this.setSetting("currentUserId", userId)
  }

  // 获取设置
  async getSetting(key: string): Promise<any> {
    const db = await this.initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["settings"], "readonly")
      const store = transaction.objectStore("settings")
      const request = store.get(key)

      request.onsuccess = () => {
        resolve(request.result?.value || null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  // 设置设置
  async setSetting(key: string, value: any): Promise<void> {
    const db = await this.initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["settings"], "readwrite")
      const store = transaction.objectStore("settings")
      const request = store.put({ key, value })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 保存生理记录
  async savePeriodRecord(recordData: any): Promise<string> {
    const db = await this.initDB()
    const record = {
      id: this.generateId(),
      ...recordData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      delFlag: false,
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["periodRecords"], "readwrite")
      const store = transaction.objectStore("periodRecords")
      const request = store.add(record)

      request.onsuccess = () => resolve(record.id)
      request.onerror = () => reject(request.error)
    })
  }

  // 更新生理记录
  async updatePeriodRecord(id: string, recordData: any): Promise<void> {
    const db = await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["periodRecords"], "readwrite")
      const store = transaction.objectStore("periodRecords")

      // 先获取现有记录
      const getRequest = store.get(id)
      getRequest.onsuccess = () => {
        const existingRecord = getRequest.result
        if (!existingRecord) {
          reject(new Error("Record not found"))
          return
        }

        // 更新记录
        const updatedRecord = {
          ...existingRecord,
          ...recordData,
          updatedAt: new Date().toISOString(),
        }

        const putRequest = store.put(updatedRecord)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  // 获取用户的生理记录
  async getPeriodRecords(userId: string): Promise<any[]> {
    const db = await this.initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["periodRecords"], "readonly")
      const store = transaction.objectStore("periodRecords")
      const index = store.index("userId")
      const request = index.getAll(userId)

      request.onsuccess = () => {
        const records = request.result.filter((record: any) => !record.delFlag)
        resolve(records.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()))
      }
      request.onerror = () => reject(request.error)
    })
  }

  // 获取用户的单个记录
  async getUserRecord(storeName: string, userId: string, recordId: string): Promise<any | null> {
    const db = await this.initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], "readonly")
      const store = transaction.objectStore(storeName)
      const request = store.get(recordId)

      request.onsuccess = () => {
        const record = request.result
        if (record && record.userId === userId && !record.delFlag) {
          resolve(record)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  // 删除记录（软删除）
  async deleteRecord(storeName: string, recordId: string): Promise<void> {
    const db = await this.initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], "readwrite")
      const store = transaction.objectStore(storeName)

      const getRequest = store.get(recordId)
      getRequest.onsuccess = () => {
        const record = getRequest.result
        if (!record) {
          reject(new Error("Record not found"))
          return
        }

        record.delFlag = true
        record.updatedAt = new Date().toISOString()

        const putRequest = store.put(record)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  // 获取数据库统计信息
  async getStats(): Promise<any> {
    const db = await this.initDB()
    const stats = {
      users: 0,
      periodRecords: 0,
      mealRecords: 0,
      stoolRecords: 0,
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["users", "periodRecords", "mealRecords", "stoolRecords"], "readonly")

      let completed = 0
      const total = 4

      const checkComplete = () => {
        completed++
        if (completed === total) {
          resolve(stats)
        }
      }

      // 统计用户数
      const usersRequest = transaction.objectStore("users").count()
      usersRequest.onsuccess = () => {
        stats.users = usersRequest.result
        checkComplete()
      }
      usersRequest.onerror = () => reject(usersRequest.error)

      // 统计生理记录数
      const periodRequest = transaction.objectStore("periodRecords").count()
      periodRequest.onsuccess = () => {
        stats.periodRecords = periodRequest.result
        checkComplete()
      }
      periodRequest.onerror = () => reject(periodRequest.error)

      // 统计饮食记录数
      const mealRequest = transaction.objectStore("mealRecords").count()
      mealRequest.onsuccess = () => {
        stats.mealRecords = mealRequest.result
        checkComplete()
      }
      mealRequest.onerror = () => reject(mealRequest.error)

      // 统计大便记录数
      const stoolRequest = transaction.objectStore("stoolRecords").count()
      stoolRequest.onsuccess = () => {
        stats.stoolRecords = stoolRequest.result
        checkComplete()
      }
      stoolRequest.onerror = () => reject(stoolRequest.error)
    })
  }

  // 清理数据库
  async clearDatabase(): Promise<void> {
    const db = await this.initDB()
    const storeNames = ["users", "settings", "periodRecords", "mealRecords", "stoolRecords"]

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeNames, "readwrite")

      let completed = 0
      const total = storeNames.length

      const checkComplete = () => {
        completed++
        if (completed === total) {
          resolve()
        }
      }

      storeNames.forEach((storeName) => {
        const store = transaction.objectStore(storeName)
        const request = store.clear()
        request.onsuccess = () => checkComplete()
        request.onerror = () => reject(request.error)
      })
    })
  }
}

// 导出单例实例
export const adminService = new AdminService()
