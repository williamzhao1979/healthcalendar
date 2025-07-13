"use client"
import { useDatabase } from "@/context/DatabaseContext"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function UserDropdown() {
  const { users, currentUser, setCurrentUser, isLoading } = useDatabase()

  if (isLoading) {
    return <div className="w-24 h-8 bg-gray-200 animate-pulse rounded"></div>
  }

  if (!currentUser) {
    return <div className="text-sm text-gray-500">无用户</div>
  }

  return (
    <Select
      value={currentUser.id}
      onValueChange={(userId) => {
        const user = users.find((u) => u.id === userId)
        if (user) {
          setCurrentUser(user)
        }
      }}
    >
      <SelectTrigger className="w-auto min-w-[80px] h-8 text-sm border-none shadow-none bg-transparent">
        <SelectValue placeholder="选择用户" />
      </SelectTrigger>
      <SelectContent>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
