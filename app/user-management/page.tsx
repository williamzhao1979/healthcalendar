"use client"

import { useState } from "react"
import { ArrowLeft, RefreshCw, UserPlus, Edit, Trash2, MoreHorizontal, Users, AlertTriangle } from "lucide-react"
import { useDatabase } from "@/context/DatabaseContext"
import { useRouter } from "next/navigation"

export default function UserManagementPage() {
  const router = useRouter()
  const { users, currentUser, addUser, updateUser, deleteUser, setCurrentUser, isLoading } = useDatabase()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [newUserName, setNewUserName] = useState("")
  const [newUserRelationship, setNewUserRelationship] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState<any>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 格式化日期
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`
  }

  // 显示成功消息
  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
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
    if (!newUserName.trim()) {
      setError("请输入用户姓名")
      return
    }

    // 检查用户名是否已存在
    if (users.some(user => user.name === newUserName.trim())) {
      setError("该用户名已存在")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await addUser({
        name: newUserName.trim(),
        relationship: newUserRelationship.trim() || "家庭成员",
      })

      setNewUserName("")
      setNewUserRelationship("")
      setShowAddForm(false)
      setError(null)
      showSuccess("用户添加成功！")
    } catch (error) {
      console.error("添加用户失败:", error)
      setError("添加用户失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  // 处理编辑用户
  const handleEditUser = async () => {
    if (!editingUser || !newUserName.trim()) {
      setError("请输入用户姓名")
      return
    }

    // 检查用户名是否已存在（除了当前编辑的用户）
    if (users.some(user => user.name === newUserName.trim() && user.id !== editingUser.id)) {
      setError("该用户名已存在")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await updateUser(editingUser.id, {
        name: newUserName.trim(),
        relationship: newUserRelationship.trim() || "家庭成员",
      })

      setEditingUser(null)
      setNewUserName("")
      setNewUserRelationship("")
      setShowAddForm(false)
      setError(null)
      showSuccess("用户信息更新成功！")
    } catch (error) {
      console.error("更新用户失败:", error)
      setError("更新用户失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  // 开始编辑用户
  const startEditUser = (user: any) => {
    setEditingUser(user)
    setNewUserName(user.name)
    setNewUserRelationship(user.relationship || "")
    setShowAddForm(true)
    setError(null)
  }

  // 处理删除用户确认
  const handleDeleteUser = async () => {
    if (!userToDelete) return

    setIsSubmitting(true)
    setError(null)

    try {
      await deleteUser(userToDelete.id)

      // 如果删除的是当前用户，切换到第一个可用用户
      if (currentUser?.id === userToDelete.id && users.length > 1) {
        const remainingUser = users.find((u) => u.id !== userToDelete.id)
        if (remainingUser) {
          await setCurrentUser(remainingUser.id)
        }
      }

      setShowDeleteConfirm(false)
      setUserToDelete(null)
      showSuccess("用户删除成功！")
    } catch (error) {
      console.error("删除用户失败:", error)
      setError("删除用户失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  // 显示删除确认弹窗
  const showDeleteConfirmation = (userId: string) => {
    if (users.length <= 1) {
      setError("至少需要保留一个用户")
      return
    }

    const user = users.find(u => u.id === userId)
    if (!user) {
      setError("用户不存在")
      return
    }
    setUserToDelete(user)
    setShowDeleteConfirm(true)
  }

  // 取消编辑
  const cancelEdit = () => {
    setShowAddForm(false)
    setEditingUser(null)
    setNewUserName("")
    setNewUserRelationship("")
    setError(null)
  }

  // 切换当前用户
  const handleSwitchUser = async (userId: string) => {
    if (userId === currentUser?.id) return

    setIsSubmitting(true)
    setError(null)

    try {
      await setCurrentUser(userId)
      showSuccess("用户切换成功！")
    } catch (error) {
      console.error("切换用户失败:", error)
      setError("切换用户失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
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
              <p className="text-sm text-gray-500">管理家庭成员</p>
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

      {/* 调试信息 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
        <h3 className="font-semibold mb-2">调试信息</h3>
        <div className="space-y-1 text-sm text-gray-600">
          <div>用户总数: {users.length}</div>
          <div>当前用户: {currentUser ? `${currentUser.name} (${currentUser.id})` : "无"}</div>
          <div>加载状态: {isLoading ? "加载中..." : "已加载"}</div>
          <div>用户列表: {users.map(u => u.name).join(", ")}</div>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="p-4 space-y-3">
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0"></div>
              <span className="text-red-700 text-sm">{error}</span>
              <button 
                onClick={() => setError(null)} 
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* 成功提示 */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></div>
              <span className="text-green-700 text-sm">{successMessage}</span>
              <button 
                onClick={() => setSuccessMessage(null)} 
                className="ml-auto text-green-500 hover:text-green-700"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* 加载状态 */}
        {isLoading ? (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p className="text-gray-500">加载用户数据中...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">暂无用户数据</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              添加第一个用户
            </button>
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-4">
                {/* 头像 */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold text-lg ${
                  currentUser?.id === user.id ? 'bg-green-500' : 'bg-blue-500'
                }`}>
                  {getUserAvatar(user.name)}
                </div>

                {/* 用户信息 */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{user.name}</h3>
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                      {getRelationshipText(user.relationship)}
                    </span>
                    {currentUser?.id === user.id && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">当前用户</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    <span>ID: {user.id.slice(0, 8)}...</span>
                    <span className="ml-4">更新: {formatDate(user.updatedAt)}</span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2">
                  {currentUser?.id !== user.id && (
                    <button 
                      onClick={() => handleSwitchUser(user.id)}
                      disabled={isSubmitting}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-200 disabled:opacity-50"
                    >
                      切换
                    </button>
                  )}
                  <button 
                    onClick={() => startEditUser(user)} 
                    disabled={isSubmitting}
                    className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => showDeleteConfirmation(user.id)}
                    disabled={users.length <= 1 || isSubmitting}
                    className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <Trash2 className={`w-4 h-4 ${users.length <= 1 ? "text-gray-300" : "text-red-500"}`} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 添加/编辑用户弹窗 */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{editingUser ? "编辑用户" : "添加用户"}</h2>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入姓名"
                  disabled={isSubmitting}
                  maxLength={20}
                />
                <div className="text-xs text-gray-500 mt-1">{newUserName.length}/20</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">关系</label>
                <select
                  value={newUserRelationship}
                  onChange={(e) => setNewUserRelationship(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                >
                  <option value="">选择关系</option>
                  <option value="本人">本人</option>
                  <option value="父亲">父亲</option>
                  <option value="母亲">母亲</option>
                  <option value="配偶">配偶</option>
                  <option value="儿子">儿子</option>
                  <option value="女儿">女儿</option>
                  <option value="爷爷">爷爷</option>
                  <option value="奶奶">奶奶</option>
                  <option value="外公">外公</option>
                  <option value="外婆">外婆</option>
                  <option value="其他">其他</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelEdit}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={editingUser ? handleEditUser : handleAddUser}
                disabled={!newUserName.trim() || isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                {editingUser ? "保存" : "添加"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">确认删除</h2>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                确定要删除用户 <span className="font-semibold">"{userToDelete.name}"</span> 吗？
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">
                  <strong>警告：</strong>删除用户将同时删除该用户的所有健康记录，此操作无法撤销！
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setUserToDelete(null)
                }}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
