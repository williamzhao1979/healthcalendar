import { Settings } from "./db"

// 简单的设置管理器
class SimpleSettingsManager {
  private currentUserKey = "healthcalendar_current_user"
  private settingsKey = "healthcalendar_settings"

  // 获取设置
  getSettings(): Settings | null {
    try {
      const stored = localStorage.getItem(this.settingsKey)
      if (stored) {
        return JSON.parse(stored)
      }
      
      // 如果没有设置，创建默认设置
      const currentUserId = localStorage.getItem(this.currentUserKey)
      if (currentUserId) {
        const defaultSettings: Settings = {
          id: "default",
          lastUserId: currentUserId,
          theme: "light",
          language: "zh",
          notifications: true,
          updatedAt: Date.now()
        }
        this.saveSettings(defaultSettings)
        return defaultSettings
      }
      
      return null
    } catch (error) {
      console.error("读取设置失败:", error)
      return null
    }
  }

  // 保存设置
  saveSettings(settings: Settings): void {
    try {
      localStorage.setItem(this.settingsKey, JSON.stringify(settings))
      console.log("设置保存成功:", settings)
    } catch (error) {
      console.error("保存设置失败:", error)
      throw error
    }
  }

  // 设置当前用户
  setCurrentUser(userId: string): void {
    try {
      localStorage.setItem(this.currentUserKey, userId)
      
      // 更新设置中的lastUserId
      const settings = this.getSettings()
      if (settings) {
        settings.lastUserId = userId
        settings.updatedAt = Date.now()
        this.saveSettings(settings)
      } else {
        // 创建新设置
        const newSettings: Settings = {
          id: "default",
          lastUserId: userId,
          theme: "light",
          language: "zh",
          notifications: true,
          updatedAt: Date.now()
        }
        this.saveSettings(newSettings)
      }
      
      console.log("当前用户设置成功:", userId)
    } catch (error) {
      console.error("设置当前用户失败:", error)
      throw error
    }
  }

  // 获取当前用户ID
  getCurrentUserId(): string | null {
    try {
      return localStorage.getItem(this.currentUserKey)
    } catch (error) {
      console.error("获取当前用户ID失败:", error)
      return null
    }
  }
}

export const simpleSettingsManager = new SimpleSettingsManager()
