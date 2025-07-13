"use client"

import { useState, useEffect } from "react"
import dbService, { type HealthRecord } from "@/services/db"
import { useDatabase } from "@/context/DatabaseContext"

interface UseHealthRecordsOptions {
  userId?: string
  type?: string
  limit?: number
  autoRefresh?: boolean
}

interface UseHealthRecordsReturn {
  records: HealthRecord[]
  isLoading: boolean
  error: string | null
  addRecord: (record: Omit<HealthRecord, "id" | "createdAt" | "updatedAt">) => Promise<HealthRecord>
  updateRecord: (id: string, updates: Partial<HealthRecord>) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  refreshRecords: () => Promise<void>
  getRecordsByDateRange: (startDate: string, endDate: string) => Promise<HealthRecord[]>
  getRecordCountByType: (type: string) => Promise<number>
}

export function useHealthRecords(options: UseHealthRecordsOptions = {}): UseHealthRecordsReturn {
  const { currentUser } = useDatabase()
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { userId = currentUser?.id, type, limit, autoRefresh = true } = options

  // 获取健康记录
  const refreshRecords = async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      setError(null)
      const recordList = await dbService.getHealthRecords(userId, type, limit)
      setRecords(recordList)
    } catch (err) {
      console.error("获取健康记录失败:", err)
      setError("获取健康记录失败")
    } finally {
      setIsLoading(false)
    }
  }

  // 添加健康记录
  const addRecord = async (recordData: Omit<HealthRecord, "id" | "createdAt" | "updatedAt">): Promise<HealthRecord> => {
    try {
      const newRecord = await dbService.addHealthRecord(recordData)
      if (autoRefresh) {
        await refreshRecords()
      }
      return newRecord
    } catch (err) {
      console.error("添加健康记录失败:", err)
      throw err
    }
  }

  // 更新健康记录
  const updateRecord = async (id: string, updates: Partial<HealthRecord>): Promise<void> => {
    try {
      await dbService.updateHealthRecord(id, updates)
      if (autoRefresh) {
        await refreshRecords()
      }
    } catch (err) {
      console.error("更新健康记录失败:", err)
      throw err
    }
  }

  // 删除健康记录
  const deleteRecord = async (id: string): Promise<void> => {
    try {
      await dbService.deleteHealthRecord(id)
      if (autoRefresh) {
        await refreshRecords()
      }
    } catch (err) {
      console.error("删除健康记录失败:", err)
      throw err
    }
  }

  // 按日期范围获取记录
  const getRecordsByDateRange = async (startDate: string, endDate: string): Promise<HealthRecord[]> => {
    if (!userId) return []

    try {
      return await dbService.getRecordsByDateRange(userId, startDate, endDate)
    } catch (err) {
      console.error("获取日期范围记录失败:", err)
      return []
    }
  }

  // 按类型获取记录数量
  const getRecordCountByType = async (recordType: string): Promise<number> => {
    if (!userId) return 0

    try {
      return await dbService.getRecordCountByType(userId, recordType)
    } catch (err) {
      console.error("获取记录统计失败:", err)
      return 0
    }
  }

  // 自动刷新记录
  useEffect(() => {
    if (autoRefresh && userId) {
      refreshRecords()
    }
  }, [userId, type, limit, autoRefresh])

  return {
    records,
    isLoading,
    error,
    addRecord,
    updateRecord,
    deleteRecord,
    refreshRecords,
    getRecordsByDateRange,
    getRecordCountByType,
  }
}
