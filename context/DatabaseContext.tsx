"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import dbService, { type User } from "@/services/db"

interface DatabaseContextType {
  currentUser: User | null
  users: User[]
  isLoading: boolean
  setCurrentUser: (user: User | null) => void
  addUser: (user: Omit<User, "id" | "createdAt">) => Promise<User>
  updateUser: (id: string, updates: Partial<User>) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  refreshUsers: () => Promise<void>
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined)

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 初始化数据库和用户数据
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        setIsLoading(true)

        // 初始化数据库
        await dbService.initialize()

        // 获取所有用户
        const allUsers = await dbService.getUsers()
        setUsers(allUsers)

        // 获取当前用户
        const savedCurrentUserId = localStorage.getItem("currentUserId")
        if (savedCurrentUserId) {
          const user = allUsers.find((u) => u.id === savedCurrentUserId)
          if (user) {
            setCurrentUser(user)
          } else {
            // 如果保存的用户ID不存在，清除并设置第一个用户为当前用户
            localStorage.removeItem("currentUserId")
            if (allUsers.length > 0) {
              setCurrentUser(allUsers[0])
              localStorage.setItem("currentUserId", allUsers[0].id)
            }
          }
        } else if (allUsers.length > 0) {
          // 如果没有保存的当前用户，设置第一个用户为当前用户
          setCurrentUser(allUsers[0])
          localStorage.setItem("currentUserId", allUsers[0].id)
        }
      } catch (error) {
        console.error("初始化数据库失败:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeDatabase()
  }, [])

  // 设置当前用户
  const handleSetCurrentUser = (user: User | null) => {
    setCurrentUser(user)
    if (user) {
      localStorage.setItem("currentUserId", user.id)
    } else {
      localStorage.removeItem("currentUserId")
    }
  }

  // 添加用户
  const addUser = async (userData: Omit<User, "id" | "createdAt">) => {
    const newUser = await dbService.addUser(userData)
    setUsers((prev) => [...prev, newUser])

    // 如果这是第一个用户，设置为当前用户
    if (users.length === 0) {
      handleSetCurrentUser(newUser)
    }

    return newUser
  }

  // 更新用户
  const updateUser = async (id: string, updates: Partial<User>) => {
    await dbService.updateUser(id, updates)
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, ...updates } : user)))

    // 如果更新的是当前用户，也更新当前用户状态
    if (currentUser?.id === id) {
      setCurrentUser((prev) => (prev ? { ...prev, ...updates } : null))
    }
  }

  // 删除用户
  const deleteUser = async (id: string) => {
    await dbService.deleteUser(id)
    setUsers((prev) => prev.filter((user) => user.id !== id))

    // 如果删除的是当前用户，切换到其他用户
    if (currentUser?.id === id) {
      const remainingUsers = users.filter((user) => user.id !== id)
      if (remainingUsers.length > 0) {
        handleSetCurrentUser(remainingUsers[0])
      } else {
        handleSetCurrentUser(null)
      }
    }
  }

  // 刷新用户列表
  const refreshUsers = async () => {
    try {
      const allUsers = await dbService.getUsers()
      setUsers(allUsers)

      // 检查当前用户是否还存在
      if (currentUser) {
        const userStillExists = allUsers.find((u) => u.id === currentUser.id)
        if (!userStillExists) {
          if (allUsers.length > 0) {
            handleSetCurrentUser(allUsers[0])
          } else {
            handleSetCurrentUser(null)
          }
        }
      }
    } catch (error) {
      console.error("刷新用户列表失败:", error)
    }
  }

  const value: DatabaseContextType = {
    currentUser,
    users,
    isLoading,
    setCurrentUser: handleSetCurrentUser,
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
