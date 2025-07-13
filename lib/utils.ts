import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 日期格式化工具
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// 获取今天的日期字符串 (YYYY-MM-DD)
export function getTodayString(): string {
  const today = new Date()
  return today.toISOString().split("T")[0]
}

// 获取当前时间字符串 (HH:MM)
export function getCurrentTimeString(): string {
  const now = new Date()
  return now.toTimeString().slice(0, 5)
}

// 生成唯一ID
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 健康记录类型映射
export const RECORD_TYPE_MAP = {
  food: { name: "饮食", icon: "🍽️", color: "#28a745" },
  stool: { name: "大便", icon: "💩", color: "#ffc107" },
  health: { name: "健康", icon: "🏥", color: "#dc3545" },
  note: { name: "备注", icon: "📝", color: "#6c757d" },
  medicine: { name: "用药", icon: "💊", color: "#2196f3" },
  sleep: { name: "睡眠", icon: "😴", color: "#9c27b0" },
  mental: { name: "心理", icon: "🧠", color: "#ffeb3b" },
  pharmacy: { name: "药房", icon: "🏪", color: "#00bcd4" },
  love: { name: "情感", icon: "❤️", color: "#ff5722" },
  body: { name: "身体", icon: "🏃", color: "#795548" },
  toilet: { name: "如厕", icon: "🚽", color: "#607d8b" },
  sport: { name: "运动", icon: "⚽", color: "#8bc34a" },
  life: { name: "生活", icon: "🏠", color: "#e91e63" },
}

// 获取记录类型信息
export function getRecordTypeInfo(type: string) {
  return (
    RECORD_TYPE_MAP[type as keyof typeof RECORD_TYPE_MAP] || {
      name: type,
      icon: "📋",
      color: "#6c757d",
    }
  )
}

// 大便分类 (Bristol Stool Scale)
export const BRISTOL_STOOL_TYPES = [
  { type: 1, name: "硬球状", description: "分离的硬块，像坚果" },
  { type: 2, name: "块状", description: "香肠状但有块状" },
  { type: 3, name: "裂纹状", description: "香肠状但表面有裂纹" },
  { type: 4, name: "光滑状", description: "香肠状，光滑柔软" },
  { type: 5, name: "软块状", description: "柔软的块状，边缘清晰" },
  { type: 6, name: "糊状", description: "蓬松的块状，边缘不规则" },
  { type: 7, name: "水状", description: "完全液体状" },
]

// 大便颜色分类
export const STOOL_COLORS = [
  { color: "brown", name: "棕色", hex: "#8B4513" },
  { color: "yellow", name: "黄色", hex: "#FFD700" },
  { color: "green", name: "绿色", hex: "#228B22" },
  { color: "black", name: "黑色", hex: "#000000" },
  { color: "red", name: "红色", hex: "#DC143C" },
  { color: "white", name: "白色", hex: "#F5F5F5" },
]

// 验证工具
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

// 本地存储工具
export function setLocalStorage(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error("设置本地存储失败:", error)
  }
}

export function getLocalStorage(key: string): any {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch (error) {
    console.error("获取本地存储失败:", error)
    return null
  }
}

export function removeLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error("删除本地存储失败:", error)
  }
}
