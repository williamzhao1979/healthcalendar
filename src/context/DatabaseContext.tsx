"use client"

import { createContext, useState, useContext, useEffect, type ReactNode } from "react"
import { useUsers } from "@/hooks/useUsers"
import { useSettings } from "@/hooks/useSettings"
import dbService, { type User } from "@/services/db"

interface DatabaseContextType {
  currentUser: User | null
  users: User[]
  isLoading: boolean
  setCurrentUser: (userId: string) => Promise<void>
  addUser: (userData: Omit<User, "id" | "createdAt" | "updatedAt">) => Promise<User>
  updateUser: (id: string, userData: Partial<Omit<User, "id" | "createdAt" | "updatedAt">>) => Promise<User>
  deleteUser: (id: string) => Promise<void>
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined)

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(null)
  const { users, isLoading: usersLoading, addUser, updateUser, deleteUser } = useUsers()
  const { settings, isLoading: settingsLoading, setCurrentUser: updateCurrentUserId } = useSettings()

  // 更新当前用户
  const setCurrentUser = async (userId: string) => {
    try {
      if (!userId) {
        console.error("尝试设置空的用户ID")
        return
      }

      console.log(`尝试将当前用户设置为: ${userId}`)
      await updateCurrentUserId(userId)
      const user = users.find((u) => u.id === userId) || null

      if (!user) {
        console.warn(`找不到ID为 ${userId} 的用户，但仍设置其为当前用户ID`)
      } else {
        console.log(`找到并设置当前用户: ${user.name}`)
      }

      setCurrentUserState(user)
    } catch (error) {
      console.error("设置当前用户时出错:", error)
    }
  }

  // 当用户数据或设置加载完成后，设置当前用户
  useEffect(() => {
    const updateCurrentUser = async () => {
      if (users.length > 0 && settings) {
        console.log(
          "开始更新当前用户，用户列表:",
          users.map((u) => u.name),
        )
        console.log("当前设置:", settings)

        if (settings.lastUserId) {
          // 查找当前选定的用户
          const user = users.find((u) => u.id === settings.lastUserId)
          if (user) {
            console.log(`找到已保存的用户: ${user.name}`)
            setCurrentUserState(user)
          } else if (users.length > 0) {
            // 如果找不到保存的用户，优先选择"我"
            const defaultUser = users.find((u) => u.name === "我") || users[0]
            console.log(`未找到已保存用户，选择默认用户: ${defaultUser.name}`)
            await setCurrentUser(defaultUser.id)
          }
        } else if (users.length > 0) {
          // 如果没有保存的用户ID，优先选择"我"作为默认用户
          const defaultUser = users.find((u) => u.name === "我") || users[0]
          console.log(`没有保存的用户ID，选择默认用户: ${defaultUser.name}`)
          await setCurrentUser(defaultUser.id)
        }
      } else {
        console.log("用户数据或设置未准备好:", {
          usersLength: users.length,
          hasSettings: !!settings,
        })
      }
    }

    updateCurrentUser()
  }, [users, settings])

  // 如果没有用户，创建一个默认用户
  // 这个状态用于跟踪数据库是否已初始化
  const [dbInitialized, setDbInitialized] = useState(false)

  // 首先初始化数据库
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        console.log("开始初始化数据库...")
        // 先尝试初始化数据库
        const db = await dbService.initDB()
        console.log("数据库初始化成功:", db)
        setDbInitialized(true)
      } catch (error) {
        console.error("数据库初始化失败:", error)
        // 可以在这里添加重试逻辑或提示用户刷新页面
        // 重试一次
        setTimeout(async () => {
          try {
            console.log("重试数据库初始化...")
            const db = await dbService.initDB()
            console.log("数据库重试初始化成功:", db)
            setDbInitialized(true)
          } catch (retryError) {
            console.error("数据库重试初始化仍然失败:", retryError)
          }
        }, 2000)
      }
    }

    initializeDatabase()
  }, [])

  // 最大重试次数
  const [createUserAttempts, setCreateUserAttempts] = useState(0)
  const MAX_CREATE_USER_ATTEMPTS = 3

  // 在数据库初始化后，创建默认用户（如果需要）
  useEffect(() => {
    const createDefaultUsers = async () => {
      console.log("检查是否需要创建默认用户...", {
        dbInitialized,
        usersLoading,
        usersCount: users.length,
        createUserAttempts,
      })

      if (dbInitialized && !usersLoading && users.length === 0 && createUserAttempts < MAX_CREATE_USER_ATTEMPTS) {
        try {
          console.log(`尝试创建默认用户 (尝试 ${createUserAttempts + 1}/${MAX_CREATE_USER_ATTEMPTS})`)

          // 首先确保默认用户"我"存在
          const defaultUser = await dbService.ensureDefaultUserExists()
          console.log("默认用户'我'确保存在:", defaultUser)

          // 然后初始化其他默认用户
          await dbService.initializeDefaultUsers()
          console.log("所有默认用户创建成功")

          // 停止重试
          setCreateUserAttempts(MAX_CREATE_USER_ATTEMPTS)

          // 强制重新加载用户列表
          console.log("1秒后刷新页面以加载新用户...")
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        } catch (error) {
          console.error("创建默认用户失败:", error)

          // 增加重试次数
          setCreateUserAttempts((prev) => {
            const newAttempts = prev + 1
            console.log(`重试次数更新: ${prev} -> ${newAttempts}`)
            return newAttempts
          })

          // 如果还可以重试，延迟后再试
          if (createUserAttempts < MAX_CREATE_USER_ATTEMPTS - 1) {
            console.log(`将在2秒后重试创建用户...`)
            setTimeout(() => {
              createDefaultUsers()
            }, 2000)
          } else {
            console.error("已达到最大重试次数，停止尝试创建用户")
          }
        }
      }
    }

    createDefaultUsers()
  }, [dbInitialized, users, usersLoading, createUserAttempts])

  return (
    <DatabaseContext.Provider
      value={{
        currentUser,
        users,
        isLoading: usersLoading || settingsLoading,
        setCurrentUser,
        addUser,
        updateUser,
        deleteUser,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  )
}

export function useDatabase() {
  const context = useContext(DatabaseContext)
  if (context === undefined) {
    throw new Error("useDatabase must be used within a DatabaseProvider")
  }
  return context
}
