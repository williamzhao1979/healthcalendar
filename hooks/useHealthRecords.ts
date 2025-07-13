"use client"

import { useState, useEffect } from "react"
import dbService, { type HealthRecord } from "@/services/db"
import { useDatabase } from "@/context/DatabaseContext"

export function useHealthRecords(type?: string) {
  const { currentUser } = useDatabase()
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecords = async () => {
    if (!currentUser) {
      setRecords([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const data = await dbService.getHealthRecords(currentUser.id, type)
      setRecords(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch records")
      console.error("Error fetching health records:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const addRecord = async (recordData: Omit<HealthRecord, "id" | "userId" | "createdAt" | "updatedAt">) => {
    if (!currentUser) {
      throw new Error("No current user")
    }

    try {
      const newRecord = await dbService.addHealthRecord({
        ...recordData,
        userId: currentUser.id,
      })
      await fetchRecords() // Refresh the list
      return newRecord
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add record")
      throw err
    }
  }

  const updateRecord = async (id: string, updates: Partial<HealthRecord>) => {
    try {
      await dbService.updateHealthRecord(id, updates)
      await fetchRecords() // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update record")
      throw err
    }
  }

  const deleteRecord = async (id: string) => {
    try {
      await dbService.deleteHealthRecord(id)
      await fetchRecords() // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete record")
      throw err
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [currentUser, type])

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
