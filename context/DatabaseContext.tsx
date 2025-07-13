"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import dbService, { type User } from "@/services/db"

interface DatabaseContextType {
  users: User[]
  currentUser: User | null
  isLoading: boolean
  error: string | null
  setCurrentUser: (user: User) => void
  addUser: (user: Omit<User, "id" | "createdAt">) => Promise<User>
  updateUser: (id: string, updates: Partial<User>) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  refreshUsers: () => Promise<void>
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined)

interface DatabaseProviderProps {
  children: ReactNode
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 初始化数据库和用户
  useEffect(() => {
    initializeDatabase()
  }, [])

  const initializeDatabase = async () => {
    try {
      setIsLoading(true)
      setError(null)

      await dbService.initDB()
      await refreshUsers()

      // 设置默认当前用户
      const savedUserId = localStorage.getItem("currentUserId")
      if (savedUserId) {
        const user = await dbService.getUserById(savedUserId)
        if (user) {
          setCurrentUser(user)
        }
      }
    } catch (err) {
      console.error("数据库初始化失败:", err)
      setError("数据库初始化失败")
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUsers = async () => {
    try {
      const userList = await dbService.getUsers()
      setUsers(userList)

      // 如果没有当前用户，设置第一个用户为当前用户
      if (!currentUser && userList.length > 0) {
        const defaultUser = userList.find((u) => u.isDefault) || userList[0]
        setCurrentUser(defaultUser)
        localStorage.setItem("currentUserId", defaultUser.id)
      }
    } catch (err) {
      console.error("获取用户列表失败:", err)
      setError("获取用户列表失败")
    }
  }

  const handleSetCurrentUser = (user: User) => {
    setCurrentUser(user)
    localStorage.setItem("currentUserId", user.id)
  }

  const handleAddUser = async (userData: Omit<User, "id" | "createdAt">): Promise<User> => {
    try {
      const newUser = await dbService.addUser(userData)
      await refreshUsers()
      return newUser
    } catch (err) {
      console.error("添加用户失败:", err)
      throw err
    }
  }

  const handleUpdateUser = async (id: string, updates: Partial<User>): Promise<void> => {
    try {
      await dbService.updateUser(id, updates)
      await refreshUsers()

      // 如果更新的是当前用户，更新当前用户状态
      if (currentUser?.id === id) {
        const updatedUser = await dbService.getUserById(id)
        if (updatedUser) {
          setCurrentUser(updatedUser)
        }
      }
    } catch (err) {
      console.error("更新用户失败:", err)
      throw err
    }
  }

  const handleDeleteUser = async (id: string): Promise<void> => {
    try {
      await dbService.deleteUser(id)
      await refreshUsers()

      // 如果删除的是当前用户，重新设置当前用户
      if (currentUser?.id === id) {
        const remainingUsers = await dbService.getUsers()
        if (remainingUsers.length > 0) {
          const newCurrentUser = remainingUsers[0]
          setCurrentUser(newCurrentUser)
          localStorage.setItem("currentUserId", newCurrentUser.id)
        } else {
          setCurrentUser(null)
          localStorage.removeItem("currentUserId")
        }
      }
    } catch (err) {
      console.error("删除用户失败:", err)
      throw err
    }
  }

  const contextValue: DatabaseContextType = {
    users,
    currentUser,
    isLoading,
    error,
    setCurrentUser: handleSetCurrentUser,
    addUser: handleAddUser,
    updateUser: handleUpdateUser,
    deleteUser: handleDeleteUser,
    refreshUsers,
  }

  return <DatabaseContext.Provider value={contextValue}>{children}</DatabaseContext.Provider>
}

export function useDatabase(): DatabaseContextType {
  const context = useContext(DatabaseContext)
  if (context === undefined) {
    throw new Error("useDatabase must be used within a DatabaseProvider")
  }
  return context
}
