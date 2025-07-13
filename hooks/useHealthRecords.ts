"use client"

import { useState, useEffect } from "react"
import dbService, { type HealthRecord } from "../services/db"

export function useHealthRecords(userId: string | null) {
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadRecords = async () => {
    if (!userId) {
      setRecords([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const healthRecords = await dbService.getHealthRecords(userId)
      setRecords(healthRecords)
    } catch (error) {
      console.error("Failed to load health records:", error)
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }

  const addRecord = async (recordData: Omit<HealthRecord, "id" | "createdAt">) => {
    try {
      const newRecord = await dbService.addHealthRecord(recordData)
      setRecords((prev) => [newRecord, ...prev])
      return newRecord
    } catch (error) {
      console.error("Failed to add health record:", error)
      throw error
    }
  }

  const updateRecord = async (id: string, updates: Partial<HealthRecord>) => {
    try {
      await dbService.updateHealthRecord(id, updates)
      await loadRecords() // Reload records after update
    } catch (error) {
      console.error("Failed to update health record:", error)
      throw error
    }
  }

  const deleteRecord = async (id: string) => {
    try {
      await dbService.deleteHealthRecord(id)
      setRecords((prev) => prev.filter((record) => record.id !== id))
    } catch (error) {
      console.error("Failed to delete health record:", error)
      throw error
    }
  }

  useEffect(() => {
    loadRecords()
  }, [userId])

  return {
    records,
    isLoading,
    addRecord,
    updateRecord,
    deleteRecord,
    refreshRecords: loadRecords,
  }
}
