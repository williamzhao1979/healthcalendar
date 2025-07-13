"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import dbService, { type User } from "../services/db"

interface DatabaseContextType {
  users: User[]
  currentUser: User | null
  addUser: (user: Omit<User, "id" | "createdAt">) => Promise<User>
  updateUser: (id: string, updates: Partial<User>) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  switchUser: (userId: string) => Promise<void>
  refreshUsers: () => Promise<void>
  isLoading: boolean
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined)

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUsers = async () => {
    try {
      const allUsers = await dbService.getAllUsers()
      setUsers(allUsers)

      // 如果没有当前用户，设置第一个用户为当前用户
      if (!currentUser && allUsers.length > 0) {
        setCurrentUser(allUsers[0])
        localStorage.setItem("currentUserId", allUsers[0].id)
      }
    } catch (error) {
      console.error("Failed to refresh users:", error)
    }
  }

  const addUser = async (userData: Omit<User, "id" | "createdAt">) => {
    try {
      const newUser = await dbService.addUser(userData)
      await refreshUsers()
      return newUser
    } catch (error) {
      console.error("Failed to add user:", error)
      throw error
    }
  }

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      await dbService.updateUser(id, updates)
      await refreshUsers()

      // 如果更新的是当前用户，更新当前用户状态
      if (currentUser?.id === id) {
        const updatedUser = await dbService.getUser(id)
        if (updatedUser) {
          setCurrentUser(updatedUser)
        }
      }
    } catch (error) {
      console.error("Failed to update user:", error)
      throw error
    }
  }

  const deleteUser = async (id: string) => {
    try {
      await dbService.deleteUser(id)
      await refreshUsers()

      // 如果删除的是当前用户，切换到第一个可用用户
      if (currentUser?.id === id) {
        const remainingUsers = users.filter((u) => u.id !== id)
        if (remainingUsers.length > 0) {
          setCurrentUser(remainingUsers[0])
          localStorage.setItem("currentUserId", remainingUsers[0].id)
        } else {
          setCurrentUser(null)
          localStorage.removeItem("currentUserId")
        }
      }
    } catch (error) {
      console.error("Failed to delete user:", error)
      throw error
    }
  }

  const switchUser = async (userId: string) => {
    try {
      const user = await dbService.getUser(userId)
      if (user) {
        setCurrentUser(user)
        localStorage.setItem("currentUserId", userId)
      }
    } catch (error) {
      console.error("Failed to switch user:", error)
      throw error
    }
  }

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        setIsLoading(true)
        await dbService.initDB()
        await refreshUsers()

        // 尝试从 localStorage 恢复当前用户
        const savedUserId = localStorage.getItem("currentUserId")
        if (savedUserId) {
          const user = await dbService.getUser(savedUserId)
          if (user) {
            setCurrentUser(user)
          }
        }
      } catch (error) {
        console.error("Failed to initialize database:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeDatabase()
  }, [])

  const value: DatabaseContextType = {
    users,
    currentUser,
    addUser,
    updateUser,
    deleteUser,
    switchUser,
    refreshUsers,
    isLoading,
  }

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>
}

export function useDatabase() {
  const context = useContext(DatabaseContext)
  if (context === undefined) {
    throw new Error("useDatabase must be used within a DatabaseProvider")
  }
  return context
}
