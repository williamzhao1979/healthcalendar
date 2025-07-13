"use client"

import { useState } from "react"
import { ArrowLeft, Plus, Edit, Trash2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useDatabase } from "@/context/DatabaseContext"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function UserManagementPage() {
  const { users, currentUser, addUser, updateUser, deleteUser, switchUser } = useDatabase()
  const router = useRouter()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    avatar: "",
  })

  const handleBack = () => {
    router.push("/health-calendar")
  }

  const handleAddUser = async () => {
    if (!formData.name.trim()) {
      toast.error("请输入用户名")
      return
    }

    try {
      await addUser({
        name: formData.name.trim(),
        avatar: formData.avatar || "/placeholder-user.jpg",
      })
      toast.success("用户添加成功")
      setIsAddDialogOpen(false)
      setFormData({ name: "", avatar: "" })
    } catch (error) {
      console.error("Failed to add user:", error)
      toast.error("添加用户失败")
    }
  }

  const handleEditUser = async () => {
    if (!editingUser || !formData.name.trim()) {
      toast.error("请输入用户名")
      return
    }

    try {
      await updateUser(editingUser.id, {
        name: formData.name.trim(),
        avatar: formData.avatar || editingUser.avatar,
      })
      toast.success("用户更新成功")
      setIsEditDialogOpen(false)
      setEditingUser(null)
      setFormData({ name: "", avatar: "" })
    } catch (error) {
      console.error("Failed to update user:", error)
      toast.error("更新用户失败")
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId)
      toast.success("用户删除成功")
    } catch (error) {
      console.error("Failed to delete user:", error)
      toast.error("删除用户失败")
    }
  }

  const handleSwitchUser = async (userId: string) => {
    try {
      await switchUser(userId)
      toast.success("用户切换成功")
    } catch (error) {
      console.error("Failed to switch user:", error)
      toast.error("切换用户失败")
    }
  }

  const openEditDialog = (user: any) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      avatar: user.avatar || "",
    })
    setIsEditDialogOpen(true)
  }

  const openAddDialog = () => {
    setFormData({ name: "", avatar: "" })
    setIsAddDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">用户管理</h1>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            添加用户
          </Button>
        </div>

        {/* 用户列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <Card key={user.id} className={`relative ${currentUser?.id === user.id ? "ring-2 ring-primary" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{user.name}</CardTitle>
                    <CardDescription>
                      {currentUser?.id === user.id && <span className="text-primary font-medium">当前用户</span>}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    {currentUser?.id !== user.id && (
                      <Button variant="outline" size="sm" onClick={() => handleSwitchUser(user.id)}>
                        切换
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  {users.length > 1 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>
                            确定要删除用户 "{user.name}" 吗？此操作将同时删除该用户的所有健康记录，且无法恢复。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteUser(user.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {users.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无用户</h3>
              <p className="text-muted-foreground mb-4">请添加第一个用户开始使用</p>
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                添加用户
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 添加用户对话框 */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加用户</DialogTitle>
              <DialogDescription>创建一个新的用户账户</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">用户名</Label>
                <Input
                  id="add-name"
                  placeholder="输入用户名"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-avatar">头像URL（可选）</Label>
                <Input
                  id="add-avatar"
                  placeholder="输入头像URL"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddUser}>添加</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 编辑用户对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑用户</DialogTitle>
              <DialogDescription>修改用户信息</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">用户名</Label>
                <Input
                  id="edit-name"
                  placeholder="输入用户名"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-avatar">头像URL（可选）</Label>
                <Input
                  id="edit-avatar"
                  placeholder="输入头像URL"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleEditUser}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
