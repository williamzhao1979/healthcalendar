"use client"

import { useState } from "react"
import { useDatabase } from "../context/DatabaseContext"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

export default function UserDropdown() {
  const { users, currentUser, switchUser, isLoading } = useDatabase()
  const [isOpen, setIsOpen] = useState(false)

  const handleUserChange = async (userId: string) => {
    try {
      await switchUser(userId)
      setIsOpen(false)
    } catch (error) {
      console.error("Failed to switch user:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-500">加载中...</span>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        <span className="text-sm text-gray-500">无用户</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <img
        src={currentUser.avatar || "/placeholder-user.jpg"}
        alt={currentUser.name}
        className="w-8 h-8 rounded-full object-cover"
      />
      <Select value={currentUser.id} onValueChange={handleUserChange}>
        <SelectTrigger className="w-auto border-none shadow-none p-0 h-auto">
          <SelectValue>
            <span className="font-medium">{currentUser.name}</span>
            <span className="text-sm text-gray-500 ml-1">({currentUser.relationship})</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              <div className="flex items-center gap-2">
                <img
                  src={user.avatar || "/placeholder-user.jpg"}
                  alt={user.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.relationship}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
