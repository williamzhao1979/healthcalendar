import { User } from "./db"

// 简单的用户管理工具
class SimpleUserManager {
  private storageKey = "healthcalendar_users"
  private currentUserKey = "healthcalendar_current_user"

  // 获取所有用户
  getUsers(): User[] {
    try {
      const stored = localStorage.getItem(this.storageKey)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error("读取用户数据失败:", error)
      return []
    }
  }

  // 添加用户
  addUser(userData: Omit<User, "id" | "createdAt" | "updatedAt">): User {
    const timestamp = Date.now()
    const newUser: User = {
      id: `user_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      ...userData,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    const users = this.getUsers()
    users.push(newUser)
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(users))
      console.log("用户添加成功:", newUser)
      return newUser
    } catch (error) {
      console.error("保存用户失败:", error)
      throw error
    }
  }

  // 更新用户
  updateUser(id: string, userData: Partial<Omit<User, "id" | "createdAt" | "updatedAt">>): User {
    const users = this.getUsers()
    const userIndex = users.findIndex(u => u.id === id)
    
    if (userIndex === -1) {
      throw new Error(`找不到ID为${id}的用户`)
    }

    const updatedUser = {
      ...users[userIndex],
      ...userData,
      updatedAt: Date.now()
    }

    users[userIndex] = updatedUser
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(users))
      console.log("用户更新成功:", updatedUser)
      return updatedUser
    } catch (error) {
      console.error("更新用户失败:", error)
      throw error
    }
  }

  // 删除用户
  deleteUser(id: string): void {
    const users = this.getUsers()
    const filteredUsers = users.filter(u => u.id !== id)
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(filteredUsers))
      console.log("用户删除成功:", id)
    } catch (error) {
      console.error("删除用户失败:", error)
      throw error
    }
  }

  // 获取当前用户
  getCurrentUser(): User | null {
    try {
      const currentUserId = localStorage.getItem(this.currentUserKey)
      if (!currentUserId) return null
      
      const users = this.getUsers()
      return users.find(u => u.id === currentUserId) || null
    } catch (error) {
      console.error("获取当前用户失败:", error)
      return null
    }
  }

  // 设置当前用户
  setCurrentUser(userId: string): void {
    try {
      localStorage.setItem(this.currentUserKey, userId)
      console.log("当前用户设置成功:", userId)
    } catch (error) {
      console.error("设置当前用户失败:", error)
      throw error
    }
  }

  // 初始化默认用户
  initializeDefaultUsers(): void {
    const users = this.getUsers()
    
    // 如果没有用户，创建默认用户
    if (users.length === 0) {
      console.log("创建默认用户...")
      
      const defaultUser = this.addUser({
        name: "我",
        relationship: "本人"
      })
      
      // 设置为当前用户
      this.setCurrentUser(defaultUser.id)
      
      console.log("默认用户创建并设置成功")
    } else {
      // 确保有当前用户设置
      const currentUser = this.getCurrentUser()
      if (!currentUser) {
        const meUser = users.find(u => u.name === "我") || users[0]
        this.setCurrentUser(meUser.id)
        console.log("设置默认当前用户:", meUser.name)
      }
    }
  }
}

export const simpleUserManager = new SimpleUserManager()
