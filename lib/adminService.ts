import type { IDatabaseService } from "./IDatabaseService"
import type { IAdminService } from "./IAdminService"
import { v4 as generateId } from "uuid"

export class AdminService implements IAdminService {
  private dbService: IDatabaseService

  constructor(dbService: IDatabaseService) {
    this.dbService = dbService
  }

  async initializeDatabase(): Promise<void> {
    const db = await this.dbService.getDatabase()
    if (!db.objectStoreNames.contains("periodRecords")) {
      const periodStore = db.createObjectStore("periodRecords", { keyPath: "id" })
      periodStore.createIndex("userId", "userId", { unique: false })
      periodStore.createIndex("dateTime", "dateTime", { unique: false })
      periodStore.createIndex("status", "status", { unique: false })
      console.log("Created periodRecords object store")
    }
    // /** rest of code here **/
  }

  async getDatabase(): Promise<IDBDatabase> {
    return await this.dbService.getDatabase()
  }

  // Period Records Management
  async savePeriodRecord(recordData: any): Promise<string> {
    try {
      const db = await this.getDatabase()
      const id = generateId()
      const now = new Date().toISOString()

      const record = {
        id,
        ...recordData,
        createdAt: now,
        updatedAt: now,
        delFlag: false,
      }

      const transaction = db.transaction(["periodRecords"], "readwrite")
      const store = transaction.objectStore("periodRecords")
      await store.add(record)

      console.log("Period record saved:", record)
      return id
    } catch (error) {
      console.error("Error saving period record:", error)
      throw error
    }
  }

  async updatePeriodRecord(id: string, recordData: any): Promise<void> {
    try {
      const db = await this.getDatabase()
      const transaction = db.transaction(["periodRecords"], "readwrite")
      const store = transaction.objectStore("periodRecords")

      const existingRecord = await store.get(id)
      if (!existingRecord) {
        throw new Error("Period record not found")
      }

      const updatedRecord = {
        ...existingRecord,
        ...recordData,
        updatedAt: new Date().toISOString(),
      }

      await store.put(updatedRecord)
      console.log("Period record updated:", updatedRecord)
    } catch (error) {
      console.error("Error updating period record:", error)
      throw error
    }
  }

  async getPeriodRecords(userId: string): Promise<any[]> {
    try {
      const db = await this.getDatabase()
      const transaction = db.transaction(["periodRecords"], "readonly")
      const store = transaction.objectStore("periodRecords")
      const index = store.index("userId")

      const records = await index.getAll(userId)
      return records
        .filter((record) => !record.delFlag)
        .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
    } catch (error) {
      console.error("Error getting period records:", error)
      return []
    }
  }

  async deletePeriodRecord(id: string): Promise<void> {
    try {
      const db = await this.getDatabase()
      const transaction = db.transaction(["periodRecords"], "readwrite")
      const store = transaction.objectStore("periodRecords")

      const record = await store.get(id)
      if (record) {
        record.delFlag = true
        record.updatedAt = new Date().toISOString()
        await store.put(record)
        console.log("Period record deleted (soft):", id)
      }
    } catch (error) {
      console.error("Error deleting period record:", error)
      throw error
    }
  }

  // Period Records Management
  public async savePeriodRecord(record: any): Promise<string> {
    const db = await this.getDatabase()

    return new Promise<string>((resolve, reject) => {
      const transaction = db.transaction("periodRecords", "readwrite")
      const store = transaction.objectStore("periodRecords")

      // 如果没有ID，生成一个
      if (!record.id) {
        record.id = `periodRecord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      // 添加时间戳
      const now = new Date().toISOString()
      if (!record.createdAt) record.createdAt = now
      record.updatedAt = now

      const addRequest = store.add(record)
      addRequest.onsuccess = () => resolve(record.id)
      addRequest.onerror = () => reject(addRequest.error)
    })
  }

  public async updatePeriodRecord(editId: string, record: any): Promise<void> {
    const db = await this.getDatabase()

    return new Promise<void>((resolve, reject) => {
      try {
        const transaction = db.transaction("periodRecords", "readwrite")
        const store = transaction.objectStore("periodRecords")
        console.log("Updating period record with ID:", editId)
        const getRequest = store.get(editId)
        getRequest.onsuccess = () => {
          const existingRecord = getRequest.result
          if (!existingRecord) {
            return reject(new Error(`Record with ID ${editId} not found`))
          }

          // 合并现有记录和新记录
          Object.assign(existingRecord, record)

          // 验证记录格式
          const validation = this.validateRecord("periodRecords", existingRecord)
          if (!validation.valid) {
            return reject(new Error(`记录格式错误: ${validation.errors.join(", ")}`))
          }

          // 更新时间戳
          existingRecord.updatedAt = new Date().toISOString()

          const putRequest = store.put(existingRecord)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        }

        console.log("Updating period record:", record)
      } catch (error) {
        console.error("更新生理记录失败:", error)
        reject(error)
      }
    })
  }

  public async softDeletePeriodRecord(editId: string): Promise<void> {
    const db = await this.getDatabase()

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("periodRecords", "readwrite")
      const store = transaction.objectStore("periodRecords")

      const getRequest = store.get(editId)
      getRequest.onsuccess = () => {
        const record = getRequest.result
        if (!record) {
          return reject(new Error(`Record with ID ${editId} not found`))
        }

        // 设置删除标志
        record.delFlag = true
        record.updatedAt = new Date().toISOString()

        const putRequest = store.put(record)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  private validateRecord(storeName: string, record: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    // 这里可以添加具体的验证逻辑
    return { valid: errors.length === 0, errors }
  }

  private async getDB(): Promise<IDBDatabase> {
    return await this.dbService.getDatabase()
  }

  // /** rest of code here **/
}
