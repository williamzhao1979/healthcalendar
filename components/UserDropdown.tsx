"use client"
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
  const { currentUser, users, switchUser } = useDatabase()
  const router = useRouter()

  if (!currentUser) {
    return (
      <div className="flex items-center space-x-2 p-2 border rounded-lg">
        <User className="h-8 w-8 text-gray-400" />
        <span className="text-sm text-gray-500">加载中...</span>
      </div>
    )
  }

  const handleUserSwitch = async (userId: string) => {
    if (userId !== currentUser.id) {
      await switchUser(userId)
    }
  }

  const handleManageUsers = () => {
    router.push("/user-management")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2 h-auto p-2 bg-transparent">
          <Avatar className="h-8 w-8">
            <AvatarImage src={currentUser.avatar || "/placeholder.svg"} alt={currentUser.name} />
            <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{currentUser.name}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-semibold">切换用户</div>
        <DropdownMenuSeparator />
        {users.map((user) => (
          <DropdownMenuItem
            key={user.id}
            onClick={() => handleUserSwitch(user.id)}
            className={`flex items-center space-x-2 ${user.id === currentUser.id ? "bg-accent" : ""}`}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
              <AvatarFallback className="text-xs">{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span>{user.name}</span>
            {user.id === currentUser.id && <span className="ml-auto text-xs text-muted-foreground">当前</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleManageUsers}>
          <Settings className="h-4 w-4 mr-2" />
          管理用户
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
