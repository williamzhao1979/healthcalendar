"use client"

import { useState, useEffect } from "react"
import dbService, { type HealthRecord } from "@/services/db"

export function useHealthRecords(userId: string | null) {
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取健康记录
  const fetchRecords = async () => {
    if (!userId) {
      setRecords([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const userRecords = await dbService.getHealthRecords(userId)
      setRecords(userRecords)
    } catch (err) {
      console.error("获取健康记录失败:", err)
      setError("获取健康记录失败")
    } finally {
      setIsLoading(false)
    }
  }

  // 添加健康记录
  const addRecord = async (recordData: Omit<HealthRecord, "id" | "createdAt">) => {
    try {
      const newRecord = await dbService.addHealthRecord(recordData)
      setRecords((prev) => [newRecord, ...prev])
      return newRecord
    } catch (err) {
      console.error("添加健康记录失败:", err)
      throw err
    }
  }

  // 更新健康记录
  const updateRecord = async (id: string, updates: Partial<HealthRecord>) => {
    try {
      await dbService.updateHealthRecord(id, updates)
      setRecords((prev) => prev.map((record) => (record.id === id ? { ...record, ...updates } : record)))
    } catch (err) {
      console.error("更新健康记录失败:", err)
      throw err
    }
  }

  // 删除健康记录
  const deleteRecord = async (id: string) => {
    try {
      await dbService.deleteHealthRecord(id)
      setRecords((prev) => prev.filter((record) => record.id !== id))
    } catch (err) {
      console.error("删除健康记录失败:", err)
      throw err
    }
  }

  // 当用户ID变化时重新获取记录
  useEffect(() => {
    fetchRecords()
  }, [userId])

  return {
    records,
    isLoading,
    error,
    addRecord,
    updateRecord,
    deleteRecord,
    refreshRecords: fetchRecords,
  }
}
