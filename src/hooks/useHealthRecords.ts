"use client"

import { useState, useEffect } from "react"
import dbService, { type HealthRecord } from "@/services/db"

export function useHealthRecords(userId: string | null) {
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 加载健康记录（所有用户共享）
  const loadRecords = async (options?: {
    type?: string
    startDate?: number
    endDate?: number
    limit?: number
  }) => {
    try {
      setIsLoading(true)
      // 移除userId参数，获取所有记录
      const loadedRecords = await dbService.getHealthRecords("", options)
      setRecords(loadedRecords)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }

  // 添加新记录
  const addRecord = async (recordData: Omit<HealthRecord, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newRecord = await dbService.addHealthRecord(recordData)
      setRecords((prevRecords) => [newRecord, ...prevRecords])
      return newRecord
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }

  // 更新记录
  const updateRecord = async (
    id: string,
    recordData: Partial<Omit<HealthRecord, "id" | "userId" | "createdAt" | "updatedAt">>,
  ) => {
    try {
      const updatedRecord = await dbService.updateHealthRecord(id, recordData)
      setRecords((prevRecords) => prevRecords.map((record) => (record.id === id ? updatedRecord : record)))
      return updatedRecord
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }

  // 删除记录
  const deleteRecord = async (id: string) => {
    try {
      await dbService.deleteHealthRecord(id)
      setRecords((prevRecords) => prevRecords.filter((record) => record.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }

  // 当组件挂载时加载记录，不依赖userId
  useEffect(() => {
    loadRecords()
  }, []) // 移除userId依赖

  return {
    records,
    isLoading,
    error,
    loadRecords,
    addRecord,
    updateRecord,
    deleteRecord,
  }
}
