// lib/adminService.ts
// IndexedDB 管理服务，用于后台管理功能

import { request } from 'https'
import { HEALTH_CALENDAR_DB_VERSION } from './dbVersion'

export interface DatabaseStats {
  dbName: string
  version: number
  objectStores: ObjectStoreStats[]
  totalRecords: number
  estimatedSize: number
}

export interface ObjectStoreStats {
  name: string
  recordCount: number
  keyPath: string | string[]
  autoIncrement: boolean
  indexes: IndexInfo[]
  sampleData: any[]
  lastModified?: string
}

export interface IndexInfo {
  name: string
  keyPath: string | string[]
  unique: boolean
}

export interface BackupData {
  metadata: {
    dbName: string
    version: number
    exportTime: string
    exportedBy: string
    recordCounts: Record<string, number>
  }
  data: Record<string, any[]>
}

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
  delFlag: boolean;
}


export class IndexedDBAdminService {
  private dbName = 'HealthCalendarDB'
  private dbVersion = 0
  private db: IDBDatabase | null = null
  private allUsers: User[] = []
  private defaultUser: User | null = null
  private activeUser: User | null = null
  private currentUser: User | null = null

  /**
   * 打开数据库连接
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName)

      request.onsuccess = () => { this.db = request.result; resolve(request.result) }
      request.onerror = () => reject(request.error)
      request.onupgradeneeded = () => {
        // 这里不处理升级，只是打开现有数据库
        resolve(request.result)
      }
    })
  }

  public async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      this.db = await this.openDatabase()
      this.dbVersion = this.db.version
    }
    return this.db
  }

  /**
   * 获取数据库统计信息
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    const db = await this.openDatabase()
    
    try {
      const objectStores: ObjectStoreStats[] = []
      let totalRecords = 0

      // 遍历所有对象存储
      for (const storeName of Array.from(db.objectStoreNames)) {
        const storeStats = await this.getObjectStoreStats(db, storeName)
        objectStores.push(storeStats)
        totalRecords += storeStats.recordCount
      }

      return {
        dbName: db.name,
        version: db.version,
        objectStores,
        totalRecords,
        estimatedSize: await this.estimateDatabaseSize(db)
      }
    } finally {
      // db.close()
    }
  }

  /**
   * 获取对象存储统计信息
   */
  private async getObjectStoreStats(db: IDBDatabase, storeName: string): Promise<ObjectStoreStats> {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)

    // 获取记录数量
    const recordCount = await new Promise<number>((resolve, reject) => {
      const countRequest = store.count()
      countRequest.onsuccess = () => resolve(countRequest.result)
      countRequest.onerror = () => reject(countRequest.error)
    })

    // 获取样本数据（前5条记录）
    const sampleData = await new Promise<any[]>((resolve, reject) => {
      const getAllRequest = store.getAll(undefined, 5)
      getAllRequest.onsuccess = () => resolve(getAllRequest.result)
      getAllRequest.onerror = () => reject(getAllRequest.error)
    })

    // 获取索引信息
    const indexes: IndexInfo[] = []
    for (const indexName of Array.from(store.indexNames)) {
      const index = store.index(indexName)
      indexes.push({
        name: indexName,
        keyPath: index.keyPath,
        unique: index.unique
      })
    }

    // 尝试获取最后修改时间（从 updatedAt 字段）
    let lastModified: string | undefined
    if (sampleData.length > 0) {
      const latestRecord = sampleData
        .filter(record => record.updatedAt)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
      
      if (latestRecord?.updatedAt) {
        lastModified = latestRecord.updatedAt
      }
    }

    return {
      name: storeName,
      recordCount,
      keyPath: store.keyPath,
      autoIncrement: store.autoIncrement,
      indexes,
      sampleData,
      lastModified
    }
  }

  /**
   * 估算数据库大小（近似值）
   */
  private async estimateDatabaseSize(db: IDBDatabase): Promise<number> {
    let totalSize = 0

    for (const storeName of Array.from(db.objectStoreNames)) {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      
      const allData = await new Promise<any[]>((resolve, reject) => {
        const getAllRequest = store.getAll()
        getAllRequest.onsuccess = () => resolve(getAllRequest.result)
        getAllRequest.onerror = () => reject(getAllRequest.error)
      })
      
      // 估算大小：转换为JSON字符串并计算字节数
      const jsonStr = JSON.stringify(allData)
      totalSize += new Blob([jsonStr]).size
    }

    return totalSize
  }

  /**
   * 获取指定存储的所有记录
   */
  async getStoreRecords(storeName: string, options?: {
    limit?: number
    offset?: number
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
  }): Promise<any[]> {
    const db = await this.openDatabase()
    
    try {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)

      let records = await new Promise<any[]>((resolve, reject) => {
        const getAllRequest = store.getAll()
        getAllRequest.onsuccess = () => resolve(getAllRequest.result)
        getAllRequest.onerror = () => reject(getAllRequest.error)
      })

      // 排序
      if (options?.orderBy) {
        records.sort((a, b) => {
          const aVal = a[options.orderBy!]
          const bVal = b[options.orderBy!]
          
          if (aVal < bVal) return options.orderDirection === 'desc' ? 1 : -1
          if (aVal > bVal) return options.orderDirection === 'desc' ? -1 : 1
          return 0
        })
      }

      // 分页
      if (options?.offset || options?.limit) {
        const offset = options.offset || 0
        const limit = options.limit || records.length
        records = records.slice(offset, offset + limit)
      }

      return records
    } finally {
      // db.close()
    }
  }

  /**
   * 搜索记录
   */
  async searchRecords(storeName: string, searchTerm: string, searchFields?: string[]): Promise<any[]> {
    const records = await this.getStoreRecords(storeName)
    
    if (!searchTerm) return records

    const searchLower = searchTerm.toLowerCase()
    
    return records.filter(record => {
      if (searchFields && searchFields.length > 0) {
        // 只在指定字段中搜索
        return searchFields.some(field => {
          const value = record[field]
          return value && String(value).toLowerCase().includes(searchLower)
        })
      } else {
        // 在所有字段中搜索
        const recordStr = JSON.stringify(record).toLowerCase()
        return recordStr.includes(searchLower)
      }
    })
  }

  /**
   * 添加记录
   */
  async addRecord(storeName: string, record: any): Promise<string> {
    const db = await this.openDatabase()
    
    try {
      return await new Promise<string>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        
        // 如果没有ID，生成一个
        if (!record.id) {
          record.id = `${storeName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
        
        // 添加时间戳
        const now = new Date().toISOString()
        if (!record.createdAt) record.createdAt = now
        record.updatedAt = now
        
        const addRequest = store.add(record)
        addRequest.onsuccess = () => resolve(record.id)
        addRequest.onerror = () => reject(addRequest.error)
      })
    } finally {
      // db.close()
    }
  }

  /**
   * 更新记录
   */
  async updateRecord(storeName: string, record: any): Promise<void> {
    const db = await this.openDatabase()
    
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        
        // 更新时间戳
        record.updatedAt = new Date().toISOString()
        
        const putRequest = store.put(record)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      })
    } finally {
      // db.close()
    }
  }

  /**
   * 删除记录
   */
  async deleteRecord(storeName: string, id: string): Promise<void> {
    const db = await this.openDatabase()
    
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        
        const deleteRequest = store.delete(id)
        deleteRequest.onsuccess = () => resolve()
        deleteRequest.onerror = () => reject(deleteRequest.error)
      })
    } finally {
      // db.close()
    }
  }

  /**
   * 软删除记录（设置 delFlag = true）
   */
  async softDeleteRecord(storeName: string, id: string): Promise<void> {
    const db = await this.openDatabase()
    
    try {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      
      // 先获取记录
      const record = await new Promise<any>((resolve, reject) => {
        const getRequest = store.get(id)
        getRequest.onsuccess = () => resolve(getRequest.result)
        getRequest.onerror = () => reject(getRequest.error)
      })
      
      if (record) {
        // 设置删除标志
        record.delFlag = true
        record.updatedAt = new Date().toISOString()
        
        await new Promise<void>((resolve, reject) => {
          const putRequest = store.put(record)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        })
      }
    } finally {
      db.close()
    }
  }

  /**
   * 清空对象存储
   */
  async clearObjectStore(storeName: string): Promise<void> {
    const db = await this.openDatabase()
    
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        
        const clearRequest = store.clear()
        clearRequest.onsuccess = () => resolve()
        clearRequest.onerror = () => reject(clearRequest.error)
      })
    } finally {
      // db.close()
    }
  }

  /**
   * 完整备份数据库
   */
  async exportFullBackup(): Promise<BackupData> {
    const db = await this.openDatabase()
    
    try {
      const data: Record<string, any[]> = {}
      const recordCounts: Record<string, number> = {}

      for (const storeName of Array.from(db.objectStoreNames)) {
        const records = await this.getStoreRecords(storeName)
        data[storeName] = records
        recordCounts[storeName] = records.length
      }

      return {
        metadata: {
          dbName: this.dbName,
          version: this.dbVersion,
          exportTime: new Date().toISOString(),
          exportedBy: 'AdminPanel',
          recordCounts
        },
        data
      }
    } finally {
      // db.close()
    }
  }

  /**
   * 导入备份数据
   */
  async importBackup(backupData: BackupData, options?: {
    clearExisting?: boolean
    skipErrors?: boolean
  }): Promise<{ success: boolean; importedCounts: Record<string, number>; errors: string[] }> {
    const db = await this.openDatabase()
    const importedCounts: Record<string, number> = {}
    const errors: string[] = []
    
    try {
      for (const [storeName, records] of Object.entries(backupData.data)) {
        try {
          // 检查对象存储是否存在
          if (!db.objectStoreNames.contains(storeName)) {
            errors.push(`对象存储 ${storeName} 不存在`)
            continue
          }

          // 清空现有数据（如果选择的话）
          if (options?.clearExisting) {
            await this.clearObjectStore(storeName)
          }

          // 导入数据
          let importCount = 0
          for (const record of records) {
            try {
              await this.addRecord(storeName, record)
              importCount++
            } catch (error) {
              if (!options?.skipErrors) {
                throw error
              }
              errors.push(`导入记录到 ${storeName} 失败: ${(error as Error).message}`)
            }
          }
          
          importedCounts[storeName] = importCount
        } catch (error) {
          errors.push(`导入 ${storeName} 失败: ${(error as Error).message}`)
          if (!options?.skipErrors) {
            throw error
          }
        }
      }

      return {
        success: errors.length === 0,
        importedCounts,
        errors
      }
    } finally {
      // db.close()
    }
  }

  /**
   * 数据库健康检查
   */
  async performHealthCheck(): Promise<{
    healthy: boolean
    issues: string[]
    suggestions: string[]
  }> {
    const issues: string[] = []
    const suggestions: string[] = []

    try {
      const stats = await this.getDatabaseStats()
      
      // 检查版本
      if (stats.version !== this.dbVersion) {
        issues.push(`数据库版本不匹配: 当前 ${stats.version}, 期望 ${this.dbVersion}`)
        suggestions.push('考虑升级数据库版本')
      }

      // 检查是否有空的对象存储
      for (const store of stats.objectStores) {
        if (store.recordCount === 0) {
          suggestions.push(`对象存储 ${store.name} 为空，可能需要初始化数据`)
        }

        // 检查是否有过多的记录
        if (store.recordCount > 10000) {
          suggestions.push(`对象存储 ${store.name} 记录数量较多 (${store.recordCount})，考虑清理旧数据`)
        }
      }

      // 检查数据库大小
      if (stats.estimatedSize > 50 * 1024 * 1024) { // 50MB
        suggestions.push(`数据库大小较大 (${(stats.estimatedSize / 1024 / 1024).toFixed(2)}MB)，考虑清理或导出旧数据`)
      }

      return {
        healthy: issues.length === 0,
        issues,
        suggestions
      }
    } catch (error) {
      return {
        healthy: false,
        issues: [`数据库健康检查失败: ${(error as Error).message}`],
        suggestions: ['检查数据库是否可以正常访问']
      }
    }
  }

  /**
   * 完全重置数据库
   */
  async resetDatabase(): Promise<void> {
    // 删除数据库
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(this.dbName)
      deleteRequest.onsuccess = () => resolve()
      deleteRequest.onerror = () => reject(deleteRequest.error)
      deleteRequest.onblocked = () => reject(new Error('数据库删除被阻止，请关闭其他标签页'))
    })
  }



  /**
   * 打开数据库连接
   */
//   private getDB(): Promise<IDBDatabase> {
//     return new Promise((resolve, reject) => {
//         this.ensureStores()
//         return this.db
//     })
//   }

  /**
   * 获取数据库中所有的对象存储名称
   */
  async getObjectStoreNames(): Promise<string[]> {
    const db = await this.openDatabase()
    try {
      return Array.from(db.objectStoreNames)
    } finally {
      // db.close()
    }
  }

  /**
   * 验证记录格式
   */
  validateRecord(storeName: string, record: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // 基本验证
    if (!record || typeof record !== 'object') {
      errors.push('记录必须是一个对象')
      return { valid: false, errors }
    }

    // 根据不同的存储进行特定验证
    switch (storeName) {
      case 'users':
        if (!record.name || typeof record.name !== 'string') {
          errors.push('用户名不能为空且必须是字符串')
        }
        if (record.avatarUrl && typeof record.avatarUrl !== 'string') {
          errors.push('头像URL必须是字符串')
        }
        if (typeof record.isActive !== 'boolean') {
          errors.push('isActive必须是布尔值')
        }
        break

      case 'stoolRecords':
      case 'mealRecords':
      case 'myRecords':
        if (!record.userId || typeof record.userId !== 'string') {
          errors.push('userId不能为空且必须是字符串')
        }
        if (!record.date && !record.dateTime) {
          errors.push('必须包含日期字段')
        }
        break
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  async initializeIDBObj(storeName: string, record: any): Promise<void> {
    const newVersion = this.dbVersion + 1
    
    try {
      const request = indexedDB.open(this.dbName, newVersion)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(storeName)) {
          console.log(`对象存储 ${storeName} 不存在`)
          const objectStore = db.createObjectStore(storeName, {
            keyPath: 'id',
            autoIncrement: true
          })
          // 可以在这里添加索引
          // objectStore.createIndex('name', 'name', { unique: false })

        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' })
          userStore.createIndex('name', 'name', { unique: false })
          userStore.createIndex('isActive', 'isActive', { unique: false })
          console.log('Created users object store')
        }
        
        if (!db.objectStoreNames.contains('stoolRecords')) {
          const store = db.createObjectStore('stoolRecords', { keyPath: 'id' })
          store.createIndex('userId', 'userId', { unique: false })
          store.createIndex('date', 'date', { unique: false })
          console.log('Created stoolRecords object store')
        }

        // 版本 5：添加 myRecords 表
        if (!db.objectStoreNames.contains('myRecords')) {
          const store = db.createObjectStore('myRecords', { keyPath: 'id' })
          store.createIndex('userId', 'userId', { unique: false })
          store.createIndex('dateTime', 'dateTime', { unique: false })
          console.log('Created myRecords object store')
        }
        }
      }
      request.onsuccess = async (event) => {
        
        console.log(`数据库 ${this.dbName} 已升级到版本 ${newVersion}`)
        console.log(`对象存储 ${storeName} 已初始化`)
      }   

      // 验证记录格式
    //   const validation = this.validateRecord(storeName, record)
    //   if (!validation.valid) {
    //     throw new Error(`记录格式错误: ${validation.errors.join(', ')}`)
    //   }

    //   // 添加时间戳
    //   const now = new Date().toISOString()
    //   if (!record.createdAt) record.createdAt = now
    //   record.updatedAt = now

    //   await new Promise<void>((resolve, reject) => {
    //     const transaction = db.transaction(storeName, 'readwrite')
    //     const store = transaction.objectStore(storeName)
        
    //     const addRequest = store.add(record)
    //     addRequest.onsuccess = () => resolve()
    //     addRequest.onerror = () => reject(addRequest.error)
    //   })
    } catch (error) {
        console.error('初始化对象存储失败:', error)
    } finally {
        // how to get db?
        // const db = request.result
        // db.close()
    }
  }

  async ensureIDBByJson(jsonData: any): Promise<void> {
    try {
      const storeName = jsonData.tableName
      const db = await this.getDB()
      const currentStores = Array.from(db.objectStoreNames)
      if (currentStores.includes(storeName)) {
          console.log(`All required object stores already exist: ${storeName}`)
          return
      }

      const newVersion = db.version + 1
      console.log(`Upgrading DB: ${db.version} → ${newVersion}`)
      const request = indexedDB.open(this.dbName, newVersion)
      request.onerror = (event) => {
          console.error('打开数据库失败:', (event.target as IDBOpenDBRequest).error)
      }
      request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result
          console.log(`数据库 ${this.dbName} 已升级到版本 ${newVersion}`)
          console.log('Initialized IDB, current stores:', Array.from(this.db!.objectStoreNames))
      }
      request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          const storeObj = db.createObjectStore(storeName, { keyPath: 'id' })
          console.log(`Created ${storeName} object store`)
      }

    } catch (error) {
      console.error('获取数据库失败:', error)
      throw new Error('无法获取数据库，可能未初始化或已关闭')
    } finally {
      // if (this.db) {
      //   this.db.close()
      // }
    }
  }

  async loadToIDBFromJson(jsonData: any): Promise<void> {
    try {
      await this.ensureIDBByJson(jsonData)
      const db = await this.getDB()
      const storeName = jsonData.tableName
      const records = jsonData.data || []

      for (const record of records) {
        // 验证记录格式
        const store = db.transaction(storeName, 'readwrite').objectStore(storeName) 
        const addRequest = store.put(record)
        console.log(`Adding record to ${storeName}:`, record)
      }

      console.log(`已将 ${records.length} 条记录添加到 ${storeName} 对象存储`)
    } catch (error) {
        console.error('初始化对象存储失败:', error)
    } finally {
        // this.db!.close()
    }
  }

    /**
   * 打开数据库连接
   */
  private openDatabaseOrigtemp(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
      request.onupgradeneeded = () => {
        // 这里不处理升级，只是打开现有数据库
        resolve(request.result)
      }
    })
  }

  async ensureIDB() {
      const db = await this.getDB()

      const currentStores = Array.from(db.objectStoreNames)
      if (!(currentStores.includes('users') && 
        currentStores.includes('stoolRecords') && currentStores.includes('myRecords') && 
        currentStores.includes('mealRecords') && currentStores.includes('periodRecords'))) {
        console.log('需要初始化对象存储')
        try {
            const newVersion = db.version + 1
            console.log(`Upgrading DB: ${db.version} → ${newVersion}`)
            db.close()

            const request = indexedDB.open(this.dbName, newVersion)

            request.onerror = (event) => {
                console.error('打开数据库失败:', (event.target as IDBOpenDBRequest).error)
            }
            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result
                console.log(`数据库 ${this.dbName} 已升级到版本 ${this.newVersion}`)
                console.log('Initialized IDB, current stores:', Array.from(this.db!.objectStoreNames))
            }
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result
                const transaction = (event.target as IDBOpenDBRequest).transaction!
                const oldVersion = event.oldVersion
                const newVersion = event.newVersion || this.dbVersion
                console.log('Initializing IDB, current stores:', Array.from(db.objectStoreNames))
                console.log(`当前数据库版本: ${oldVersion}, 新版本: ${this.newVersion}`)

                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id' })
                    userStore.createIndex('name', 'name', { unique: false })
                    // userStore.createIndex('isActive', 'isActive', { unique: false })
                    console.log('Created users object store')
                }
                
                if (!db.objectStoreNames.contains('stoolRecords')) {
                    const store = db.createObjectStore('stoolRecords', { keyPath: 'id' })
                    store.createIndex('userId', 'userId', { unique: false })
                    store.createIndex('dateTime', 'dateTime', { unique: false })
                    console.log('Created stoolRecords object store')
                }

                if (!db.objectStoreNames.contains('myRecords')) {
                    const store = db.createObjectStore('myRecords', { keyPath: 'id' })
                    store.createIndex('userId', 'userId', { unique: false })
                    store.createIndex('dateTime', 'dateTime', { unique: false })
                    console.log('Created myRecords object store')
                }

                if (!db.objectStoreNames.contains('mealRecords')) {
                    const store = db.createObjectStore('mealRecords', { keyPath: 'id' })
                    store.createIndex('userId', 'userId', { unique: false })
                    store.createIndex('dateTime', 'dateTime', { unique: false })
                    console.log('Created mealRecords object store')
                }

                if (!db.objectStoreNames.contains('periodRecords')) {
                    const store = db.createObjectStore('periodRecords', { keyPath: 'id' })
                    store.createIndex('userId', 'userId', { unique: false })
                    store.createIndex('dateTime', 'dateTime', { unique: false })
                    console.log('Created periodRecords object store')
                }
            }
        } finally {
            // db.close()
        }
      }
      const db2 = await this.getDB()
      const tx = db2.transaction('users', 'readwrite');
      const usersStore = tx.objectStore('users');
      const usersCount = usersStore.count();
      usersCount.onsuccess = () => {
        if (usersCount.result === 0) {
          console.log('Users store is empty, initializing default user')
          const defaultUsers: User[] = [
            {
              "id": "user_self",
              "name": "本人",
              "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
              "isActive": true,
              "createdAt": "2025-07-21T04:25:28.818Z",
              "createdBy": "user_self",
              "updatedAt": "2025-07-24T07:20:10.181Z",
              "updatedBy": "user_self",
              "delFlag": false
            },
            {
              "id": "user_test",
              "name": "测试用户",
              "avatarUrl": "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=80&h=80&fit=crop&crop=face",
              "isActive": false,
              "createdAt": "2025-07-20T12:04:06.036Z",
              "createdBy": "user_self",
              "updatedAt": "2025-07-24T07:20:10.181Z",
              "updatedBy": "user_self",
              "delFlag": false
            }
          ]
          for (const user of defaultUsers) {
            usersStore.add(user);
          }
        }
      };
      usersCount.onerror = () => {
        console.error('Failed to count users:', usersCount.error);
      };

  }

  // 获取所有用户
  async getAllUsers(): Promise<User[]> {
    await this.ensureIDB();
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.getAll();

      request.onsuccess = () => {
        // this.allUsers = request.result as User[];
        this.allUsers = request.result.filter(user => !user.delFlag) as User[];
        this.defaultUser = this.allUsers.find(user => user.id === 'user_self') || null;
        this.activeUser = this.allUsers.find(user => user.isActive) || null;
        console.log('获取所有用户:', this.allUsers);
        resolve(this.allUsers || []);
      };

      request.onerror = () => {
        reject(new Error('Failed to get users'));
      };

      // transaction.oncomplete = () => {
      //   db.close();
      // };
    });
  }

  // 获取所有用户
  async getAllUsersRecord(): Promise<User[]> {
    await this.ensureIDB();
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.getAll();

      request.onsuccess = () => {
        // this.allUsers = request.result as User[];
        // this.allUsers = request.result.filter(user => !user.delFlag) as User[];
        // this.defaultUser = this.allUsers.find(user => user.id === 'user_self') || null;
        // this.activeUser = this.allUsers.find(user => user.isActive) || null;
        // console.log('获取所有用户:', this.allUsers);
        resolve(request.result|| []);
      };

      request.onerror = () => {
        reject(new Error('Failed to get users'));
      };

      // transaction.oncomplete = () => {
      //   db.close();
      // };
    });
  }

  public getDefaultUser(): User | null {
    return this.defaultUser;
  }

  public getActiveUser(): User | null {
    return this.activeUser;
  }

  public async getCurrentUser(): Promise<User | null> {
    const currentUserId  = localStorage.getItem('currentUserId')? localStorage.getItem('currentUserId') : 'user_self';
    console.log('当前用户ID:', currentUserId);
    if (!this.allUsers) {
      this.allUsers = await this.getAllUsers();
    }
    return this.allUsers.find(user => user.id === currentUserId) || null;
  }

  public async setCurrentUser(userId: string): Promise<void> {
    // const user = this.allUsers.find(u => u.id === userId);
    // if (!user) {
    //   throw new Error(`User with ID ${userId} does not exist`);
    // }
    // this.currentUser = user;
    localStorage.setItem('currentUserId', userId);
    console.log('设置当前用户:', userId);
  }

  public async getUserRecords(storeName: string, userId: string): Promise<any[]> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const records = request.result.filter(record => !record.delFlag); // 过滤掉已删除的记录
        resolve(records || []);
      };
      request.onerror = () => reject(new Error(`Failed to get records for user ${userId}`));
    });
  }

  public async getUserRecord(storeName: string, userId: string, recordId: string): Promise<any> {
    const records = await this.getUserRecords(storeName, userId);
    return records.find(record => record.id === recordId) || null;
  }

  public async saveUser(record: any): Promise<string> {
    const db = await this.getDB();
    
    return new Promise<string>((resolve, reject) => {
      const transaction = db.transaction('users', 'readwrite');
      const store = transaction.objectStore('users');
      
      // 如果没有ID，生成一个
      if (!record.id) {
        record.id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // 添加时间戳
      const now = new Date().toISOString();
      if (!record.createdAt) record.createdAt = now;
      record.updatedAt = now;
      
      const addRequest = store.add(record);
      addRequest.onsuccess = () => resolve(record.id);
      addRequest.onerror = () => reject(addRequest.error);
    });
  }

  public async updateUser(editId: string, record: any): Promise<void> {
    const db = await this.getDB();
    
    return new Promise<void>((resolve, reject) => {
      try {
      const transaction = db.transaction('users', 'readwrite');
      const store = transaction.objectStore('users');
      console.log('Updating user with ID:', editId);
      const getRequest = store.get(editId);
      getRequest.onsuccess = () => {
        const existingRecord = getRequest.result;
        if (!existingRecord) {
          return reject(new Error(`Record with ID ${editId} not found`));
        }
        
        // 合并现有记录和新记录
        Object.assign(existingRecord, record);
        
        // 验证记录格式
        // const validation = this.validateRecord('myRecords', existingRecord);
        // if (!validation.valid) {
        //   return reject(new Error(`记录格式错误: ${validation.errors.join(', ')}`));
        // }
        
        // 更新时间戳
        existingRecord.updatedAt = new Date().toISOString();
        
        // this.updateMyRecordInStore(store, existingRecord, resolve, reject);
        const putRequest = store.put(existingRecord);
        putRequest.onsuccess = () => resolve(); 
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      console.log('Updating my record:', record);
      // // 更新时间戳
      // record.updatedAt = new Date().toISOString();
      
      // const putRequest = store.put(record);
      // putRequest.onsuccess = () => resolve();
      // putRequest.onerror = () => reject(putRequest.error);
      } catch (error) {
          console.error('更新我的记录失败:', error);
          reject(error);
      }
    });
  }

  public async saveMyRecord(record: any): Promise<string> {
    const db = await this.getDB();
    
    return new Promise<string>((resolve, reject) => {
      const transaction = db.transaction('myRecords', 'readwrite');
      const store = transaction.objectStore('myRecords');
      
      // 如果没有ID，生成一个
      if (!record.id) {
        record.id = `myRecord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // 添加时间戳
      const now = new Date().toISOString();
      if (!record.createdAt) record.createdAt = now;
      record.updatedAt = now;
      
      const addRequest = store.add(record);
      addRequest.onsuccess = () => resolve(record.id);
      addRequest.onerror = () => reject(addRequest.error);
    });
  }

  public async updateMyRecord(editId: string, record: any): Promise<void> {
    const db = await this.getDB();
    
    return new Promise<void>((resolve, reject) => {
      try {
      const transaction = db.transaction('myRecords', 'readwrite');
      const store = transaction.objectStore('myRecords');
      console.log('Updating my record with ID:', editId);
      const getRequest = store.get(editId);
      getRequest.onsuccess = () => {
        const existingRecord = getRequest.result;
        if (!existingRecord) {
          return reject(new Error(`Record with ID ${editId} not found`));
        }
        
        // 合并现有记录和新记录
        Object.assign(existingRecord, record);
        
        // 验证记录格式
        const validation = this.validateRecord('myRecords', existingRecord);
        if (!validation.valid) {
          return reject(new Error(`记录格式错误: ${validation.errors.join(', ')}`));
        }
        
        // 更新时间戳
        existingRecord.updatedAt = new Date().toISOString();
        
        // this.updateMyRecordInStore(store, existingRecord, resolve, reject);
        const putRequest = store.put(existingRecord);
        putRequest.onsuccess = () => resolve(); 
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      console.log('Updating my record:', record);
      // // 更新时间戳
      // record.updatedAt = new Date().toISOString();
      
      // const putRequest = store.put(record);
      // putRequest.onsuccess = () => resolve();
      // putRequest.onerror = () => reject(putRequest.error);
      } catch (error) {
          console.error('更新我的记录失败:', error);
          reject(error);
      }
    });
  }

  public async softDeleteMyRecord(editId: string): Promise<void> {
    const db = await this.getDB();
    
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('myRecords', 'readwrite');
      const store = transaction.objectStore('myRecords');
      
      const getRequest = store.get(editId);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (!record) {
          return reject(new Error(`Record with ID ${editId} not found`));
        }
        
        // 设置删除标志
        record.delFlag = true;
        record.updatedAt = new Date().toISOString();
        
        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  public async saveStoolRecord(record: any): Promise<string> {
    const db = await this.getDB();
    
    return new Promise<string>((resolve, reject) => {
      const transaction = db.transaction('stoolRecords', 'readwrite');
      const store = transaction.objectStore('stoolRecords');
      
      // 如果没有ID，生成一个
      if (!record.id) {
        record.id = `stoolRecord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // 添加时间戳
      const now = new Date().toISOString();
      if (!record.createdAt) record.createdAt = now;
      record.updatedAt = now;
      
      const addRequest = store.add(record);
      addRequest.onsuccess = () => resolve(record.id);
      addRequest.onerror = () => reject(addRequest.error);
    });
  }

  public async updateStoolRecord(editId: string, record: any): Promise<void> {
    const db = await this.getDB();
    
    return new Promise<void>((resolve, reject) => {
      try {
      const transaction = db.transaction('stoolRecords', 'readwrite');
      const store = transaction.objectStore('stoolRecords');
      console.log('Updating stool record with ID:', editId);
      const getRequest = store.get(editId);
      getRequest.onsuccess = () => {
        const existingRecord = getRequest.result;
        if (!existingRecord) {
          return reject(new Error(`Record with ID ${editId} not found`));
        }
        
        // 合并现有记录和新记录
        Object.assign(existingRecord, record);
        
        // 验证记录格式
        // const validation = this.validateRecord('stoolRecords', existingRecord);
        // if (!validation.valid) {
        //   return reject(new Error(`记录格式错误: ${validation.errors.join(', ')}`));
        // }
        
        // 更新时间戳
        existingRecord.updatedAt = new Date().toISOString();
        
        // this.updateMyRecordInStore(store, existingRecord, resolve, reject);
        const putRequest = store.put(existingRecord);
        putRequest.onsuccess = () => resolve(); 
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      console.log('Updating stool record:', record);
      // // 更新时间戳
      // record.updatedAt = new Date().toISOString();
      
      // const putRequest = store.put(record);
      // putRequest.onsuccess = () => resolve();
      // putRequest.onerror = () => reject(putRequest.error);
      } catch (error) {
          console.error('更新我的记录失败:', error);
          reject(error);
      }
    });
  }

  public async softDeleteStoolRecord(editId: string): Promise<void> {
    const db = await this.getDB();
    
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('stoolRecords', 'readwrite');
      const store = transaction.objectStore('stoolRecords');
      
      const getRequest = store.get(editId);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (!record) {
          return reject(new Error(`Record with ID ${editId} not found`));
        }
        
        // 设置删除标志
        record.delFlag = true;
        record.updatedAt = new Date().toISOString();
        
        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  public async saveMealRecord(record: any): Promise<string> {
    const db = await this.getDB();
    
    return new Promise<string>((resolve, reject) => {
      const transaction = db.transaction('mealRecords', 'readwrite');
      const store = transaction.objectStore('mealRecords');
      
      // 如果没有ID，生成一个
      if (!record.id) {
        record.id = `mealRecord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // 添加时间戳
      const now = new Date().toISOString();
      if (!record.createdAt) record.createdAt = now;
      record.updatedAt = now;
      
      const addRequest = store.add(record);
      addRequest.onsuccess = () => resolve(record.id);
      addRequest.onerror = () => reject(addRequest.error);
    });
  }


  public async updateMealRecord(editId: string, record: any): Promise<void> {
    const db = await this.getDB();
    
    return new Promise<void>((resolve, reject) => {
      try {
      const transaction = db.transaction('mealRecords', 'readwrite');
      const store = transaction.objectStore('mealRecords');
      console.log('Updating meal record with ID:', editId);
      const getRequest = store.get(editId);
      getRequest.onsuccess = () => {
        const existingRecord = getRequest.result;
        if (!existingRecord) {
          return reject(new Error(`Record with ID ${editId} not found`));
        }
        
        // 合并现有记录和新记录
        Object.assign(existingRecord, record);
        
        // 验证记录格式
        const validation = this.validateRecord('mealRecords', existingRecord);
        if (!validation.valid) {
          return reject(new Error(`记录格式错误: ${validation.errors.join(', ')}`));
        }
        
        // 更新时间戳
        existingRecord.updatedAt = new Date().toISOString();
        
        // this.updateMyRecordInStore(store, existingRecord, resolve, reject);
        const putRequest = store.put(existingRecord);
        putRequest.onsuccess = () => resolve(); 
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      console.log('Updating meal record:', record);
      // // 更新时间戳
      // record.updatedAt = new Date().toISOString();
      
      // const putRequest = store.put(record);
      // putRequest.onsuccess = () => resolve();
      // putRequest.onerror = () => reject(putRequest.error);
      } catch (error) {
          console.error('更新我的记录失败:', error);
          reject(error);
      }
    });
  }

  public async softDeleteMealRecord(editId: string): Promise<void> {
    const db = await this.getDB();
    
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('mealRecords', 'readwrite');
      const store = transaction.objectStore('mealRecords');
      
      const getRequest = store.get(editId);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (!record) {
          return reject(new Error(`Record with ID ${editId} not found`));
        }
        
        // 设置删除标志
        record.delFlag = true;
        record.updatedAt = new Date().toISOString();
        
        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  public async getAllRecordsIDB(storeName: string): Promise<any[]> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(new Error(`Failed to get records from ${storeName}`));
    });
  }

  public getDBName(): string {
    return this.dbName;
  }
}

// 导出单例实例
export const adminService = new IndexedDBAdminService();
