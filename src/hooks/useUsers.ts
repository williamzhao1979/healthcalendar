"use client"

import { useState, useEffect } from "react"
import dbService, { type User } from "@/services/db"

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 加载用户列表
  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const loadedUsers = await dbService.getUsers()
      setUsers(loadedUsers)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }

  // 添加新用户
  const addUser = async (userData: Omit<User, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newUser = await dbService.addUser(userData)
      setUsers((prevUsers) => [...prevUsers, newUser])
      return newUser
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }

  // 更新用户
  const updateUser = async (id: string, userData: Partial<Omit<User, "id" | "createdAt" | "updatedAt">>) => {
    try {
      const updatedUser = await dbService.updateUser(id, userData)
      setUsers((prevUsers) => prevUsers.map((user) => (user.id === id ? updatedUser : user)))
      return updatedUser
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }

  // 删除用户
  const deleteUser = async (id: string) => {
    try {
      await dbService.deleteUser(id)
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }

  // 组件挂载时加载用户
  useEffect(() => {
    loadUsers()
  }, [])

  return {
    users,
    isLoading,
    error,
    loadUsers,
    addUser,
    updateUser,
    deleteUser,
  }
}
