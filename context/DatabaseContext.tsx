"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import dbService, { type User } from "@/services/db"

interface DatabaseContextType {
  currentUser: User | null
  users: User[]
  isLoading: boolean
  switchUser: (userId: string) => Promise<void>
  addUser: (user: Omit<User, "id" | "createdAt">) => Promise<void>
  updateUser: (id: string, updates: Partial<User>) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  refreshUsers: () => Promise<void>
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined)

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refreshUsers = async () => {
    try {
      const allUsers = await dbService.getAllUsers()
      setUsers(allUsers)
    } catch (error) {
      console.error("Failed to refresh users:", error)
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
      if (currentUser?.id === id) {
        const remainingUsers = await dbService.getAllUsers()
        if (remainingUsers.length > 0) {
          await switchUser(remainingUsers[0].id)
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

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        setIsLoading(true)
        await dbService.initialize()
        await refreshUsers()

        const savedUserId = localStorage.getItem("currentUserId")
        if (savedUserId) {
          const user = await dbService.getUser(savedUserId)
          if (user) {
            setCurrentUser(user)
          } else {
            localStorage.removeItem("currentUserId")
          }
        }

        if (!currentUser) {
          const allUsers = await dbService.getAllUsers()
          if (allUsers.length > 0) {
            setCurrentUser(allUsers[0])
            localStorage.setItem("currentUserId", allUsers[0].id)
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
    currentUser,
    users,
    isLoading,
    switchUser,
    addUser,
    updateUser,
    deleteUser,
    refreshUsers,
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
