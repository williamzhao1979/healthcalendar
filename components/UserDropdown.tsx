"use client"

import { useState } from "react"
import { ChevronDown, User, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useDatabase } from "@/context/DatabaseContext"
import { useRouter } from "next/navigation"

export default function UserDropdown() {
  const { currentUser, users, setCurrentUser } = useDatabase()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  // 获取用户显示名称
  const getUserDisplayName = (user: any) => {
    if (user.relationship && user.relationship !== "本人") {
      return `${user.name} (${user.relationship})`
    }
    return user.name
  }

  // 获取用户头像
  const getUserAvatar = (user: any) => {
    return user.avatar || "/placeholder-user.jpg"
  }

  // 获取用户姓名首字母
  const getUserInitials = (user: any) => {
    return user.name ? user.name.charAt(0).toUpperCase() : "U"
  }

  // 切换用户
  const handleUserSwitch = (user: any) => {
    setCurrentUser(user)
    setIsOpen(false)
  }

  // 前往用户管理页面
  const handleUserManagement = () => {
    router.push("/user-management")
    setIsOpen(false)
  }

  if (!currentUser) {
    return (
      <Button variant="outline" onClick={handleUserManagement} className="flex items-center gap-2 bg-transparent">
        <User className="h-4 w-4" />
        添加用户
      </Button>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 h-10 px-3 bg-transparent">
          <Avatar className="h-6 w-6">
            <AvatarImage src={getUserAvatar(currentUser) || "/placeholder.svg"} alt={currentUser.name} />
            <AvatarFallback className="text-xs">{getUserInitials(currentUser)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{getUserDisplayName(currentUser)}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* 当前用户信息 */}
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">当前用户</p>
          <p className="text-xs text-muted-foreground">{getUserDisplayName(currentUser)}</p>
        </div>

        <DropdownMenuSeparator />

        {/* 用户切换列表 */}
        {users.map((user) => (
          <DropdownMenuItem
            key={user.id}
            onClick={() => handleUserSwitch(user)}
            className={`flex items-center gap-2 ${currentUser.id === user.id ? "bg-accent" : ""}`}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={getUserAvatar(user) || "/placeholder.svg"} alt={user.name} />
              <AvatarFallback className="text-xs">{getUserInitials(user)}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{getUserDisplayName(user)}</span>
            {currentUser.id === user.id && <div className="ml-auto h-2 w-2 bg-green-500 rounded-full" />}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* 用户管理 */}
        <DropdownMenuItem onClick={handleUserManagement}>
          <Settings className="mr-2 h-4 w-4" />
          <span>用户管理</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
