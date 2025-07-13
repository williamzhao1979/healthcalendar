"use client"

import { useState, useEffect } from "react"
import dbService, { type User } from "../services/db"

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const allUsers = await dbService.getAllUsers()
      setUsers(allUsers)
    } catch (error) {
      console.error("Failed to load users:", error)
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  const addUser = async (userData: Omit<User, "id" | "createdAt">) => {
    try {
      const newUser = await dbService.addUser(userData)
      setUsers((prev) => [...prev, newUser])
      return newUser
    } catch (error) {
      console.error("Failed to add user:", error)
      throw error
    }
  }

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      await dbService.updateUser(id, updates)
      await loadUsers() // Reload users after update
    } catch (error) {
      console.error("Failed to update user:", error)
      throw error
    }
  }

  const deleteUser = async (id: string) => {
    try {
      await dbService.deleteUser(id)
      setUsers((prev) => prev.filter((user) => user.id !== id))
    } catch (error) {
      console.error("Failed to delete user:", error)
      throw error
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  return {
    users,
    isLoading,
    addUser,
    updateUser,
    deleteUser,
    refreshUsers: loadUsers,
  }
}
