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

  // /** rest of code here **/
}
