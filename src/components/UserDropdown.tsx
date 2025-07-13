"use client"

import { useState, useEffect, useRef } from "react"
import { useDatabase } from "@/context/DatabaseContext"

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { currentUser, users, setCurrentUser } = useDatabase()

  // 调试当前用户状态
  useEffect(() => {
    console.log("UserDropdown - 当前用户:", currentUser?.name || "无")
    console.log(
      "UserDropdown - 用户列表:",
      users.map((u) => u.name),
    )
  }, [currentUser, users])

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // 处理用户切换
  const handleUserChange = async (userId: string) => {
    if (userId === currentUser?.id) {
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    try {
      await setCurrentUser(userId)
      setIsOpen(false)
    } catch (error) {
      console.error("切换用户失败:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // 获取用户显示名称
  const getUserDisplayName = (user: any) => {
    if (user.relationship && user.relationship !== "本人") {
      return `${user.name} (${user.relationship})`
    }
    return user.name
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="calendar-filter flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm">
          {isLoading ? "切换中..." : currentUser ? getUserDisplayName(currentUser) : "我"}
        </span>
        <span className={`dropdown-icon text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-1">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserChange(user.id)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors flex items-center justify-between ${
                  user.id === currentUser?.id ? "bg-blue-50 text-blue-600" : "text-gray-700"
                }`}
              >
                <span>{getUserDisplayName(user)}</span>
                {user.id === currentUser?.id && <span className="text-blue-600">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
