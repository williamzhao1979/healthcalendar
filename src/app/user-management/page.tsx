"use client"

import { useState } from "react"
import { ArrowLeft, RefreshCw, UserPlus, Edit, Trash2, MoreHorizontal, Users } from "lucide-react"
import { useDatabase } from "@/context/DatabaseContext"
import { useRouter } from "next/navigation"

export default function UserManagementPage() {
  const router = useRouter()
  const { users, currentUser, addUser, updateUser, deleteUser, setCurrentUser } = useDatabase()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [newUserName, setNewUserName] = useState("")
  const [newUserRelationship, setNewUserRelationship] = useState("")

  // 格式化日期
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`
  }

  // 获取用户头像文字
  const getUserAvatar = (name: string) => {
    return name.charAt(0)
  }

  // 获取关系显示文本
  const getRelationshipText = (relationship?: string) => {
    if (!relationship || relationship === "本人") return "家庭成员"
    return relationship
  }

  // 处理添加用户
  const handleAddUser = async () => {
    if (!newUserName.trim()) return

    try {
      await addUser({
        name: newUserName.trim(),
        relationship: newUserRelationship.trim() || "家庭成员",
      })

      setNewUserName("")
      setNewUserRelationship("")
      setShowAddForm(false)
    } catch (error) {
      console.error("添加用户失败:", error)
    }
  }

  // 处理编辑用户
  const handleEditUser = async () => {
    if (!editingUser || !newUserName.trim()) return

    try {
      await updateUser(editingUser.id, {
        name: newUserName.trim(),
        relationship: newUserRelationship.trim() || "家庭成员",
      })

      setEditingUser(null)
      setNewUserName("")
      setNewUserRelationship("")
    } catch (error) {
      console.error("更新用户失败:", error)
    }
  }

  // 开始编辑用户
  const startEditUser = (user: any) => {
    setEditingUser(user)
    setNewUserName(user.name)
    setNewUserRelationship(user.relationship || "")
    setShowAddForm(true)
  }

  // 处理删除用户
  const handleDeleteUser = async (userId: string) => {
    if (users.length <= 1) {
      alert("至少需要保留一个用户")
      return
    }

    if (confirm("确定要删除这个用户吗？")) {
      try {
        await deleteUser(userId)

        // 如果删除的是当前用户，切换到第一个用户
        if (currentUser?.id === userId && users.length > 1) {
          const remainingUser = users.find((u) => u.id !== userId)
          if (remainingUser) {
            await setCurrentUser(remainingUser.id)
          }
        }
      } catch (error) {
        console.error("删除用户失败:", error)
      }
    }
  }

  // 取消编辑
  const cancelEdit = () => {
    setShowAddForm(false)
    setEditingUser(null)
    setNewUserName("")
    setNewUserRelationship("")
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 头部 */}
      <div className="bg-white px-4 py-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">用户管理</h1>
              <p className="text-sm text-gray-500">管理家庭成员和权限设置</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
          >
            <UserPlus className="w-4 h-4" />
            添加用户
          </button>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="p-4 space-y-3">
        {users.map((user) => (
          <div key={user.id} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-4">
              {/* 头像 */}
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white font-semibold text-lg">
                {getUserAvatar(user.name)}
              </div>

              {/* 用户信息 */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">{user.name}</h3>
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                    {getRelationshipText(user.relationship)}
                  </span>
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">活跃</span>
                </div>
                <div className="text-sm text-gray-500">
                  <span>ID: {user.id}</span>
                  <span className="ml-4">更新: {formatDate(user.updatedAt)}</span>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2">
                <button onClick={() => startEditUser(user)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  disabled={users.length <= 1}
                >
                  <Trash2 className={`w-4 h-4 ${users.length <= 1 ? "text-gray-300" : "text-red-500"}`} />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <MoreHorizontal className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 退出按钮 */}
      <div className="p-4">
        <button
          onClick={() => router.push("/health-calendar")}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-medium"
        >
          退出
        </button>
      </div>

      {/* 添加/编辑用户弹窗 */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{editingUser ? "编辑用户" : "添加用户"}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入姓名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">关系</label>
                <select
                  value={newUserRelationship}
                  onChange={(e) => setNewUserRelationship(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择关系</option>
                  <option value="本人">本人</option>
                  <option value="父亲">父亲</option>
                  <option value="母亲">母亲</option>
                  <option value="儿子">儿子</option>
                  <option value="女儿">女儿</option>
                  <option value="爷爷">爷爷</option>
                  <option value="奶奶">奶奶</option>
                  <option value="外公">外公</option>
                  <option value="外婆">外婆</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelEdit}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={editingUser ? handleEditUser : handleAddUser}
                disabled={!newUserName.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
              >
                {editingUser ? "保存" : "添加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
