"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Save,
  Calendar,
  Clock,
  Tag,
  Upload,
  X,
  Plus,
  Heart,
  Droplets,
  Palette,
  Smile,
  User,
  ChevronDown,
  Check,
  AlertCircle,
  FileText,
} from "lucide-react"
import { adminService } from "@/lib/adminService"

// 生理记录类型定义
type PeriodStatus = "start" | "ongoing" | "end"
type PeriodFlow = "minimal" | "light" | "normal" | "heavy"
type PeriodColor = "bright_red" | "dark_red" | "deep_red" | "orange_red" | "pink"
type PeriodMood = "very_sad" | "sad" | "neutral" | "happy" | "very_happy"

type PeriodRecord = {
  id: string
  userId: string
  dateTime: string
  status: PeriodStatus
  flow: PeriodFlow
  color: PeriodColor
  mood: PeriodMood
  notes: string
  tags: string[]
  attachments: string[]
  createdAt: string
  updatedAt: string
  delFlag: boolean
}

// 预设标签
const presetTags = ["规律", "正常", "疼痛", "异常", "头痛", "腹痛", "疲劳", "失眠", "情绪低落", "胸胀", "腰痛", "其他"]

// 状态选项
const statusOptions = [
  { value: "start", label: "开始", color: "bg-pink-100 text-pink-600", icon: "🔴" },
  { value: "ongoing", label: "进行中", color: "bg-rose-100 text-rose-600", icon: "🟡" },
  { value: "end", label: "结束", color: "bg-purple-100 text-purple-600", icon: "🟢" },
]

// 流量选项
const flowOptions = [
  { value: "minimal", label: "极少", color: "bg-pink-50 text-pink-500", icon: "💧" },
  { value: "light", label: "较少", color: "bg-pink-100 text-pink-600", icon: "💧💧" },
  { value: "normal", label: "正常", color: "bg-pink-200 text-pink-700", icon: "💧💧💧" },
  { value: "heavy", label: "较多", color: "bg-pink-300 text-pink-800", icon: "💧💧💧💧" },
]

// 颜色选项
const colorOptions = [
  { value: "bright_red", label: "鲜红色", color: "bg-red-500", textColor: "text-red-600" },
  { value: "dark_red", label: "暗红色", color: "bg-red-700", textColor: "text-red-700" },
  { value: "deep_red", label: "深红色", color: "bg-red-900", textColor: "text-red-900" },
  { value: "orange_red", label: "橙红色", color: "bg-orange-600", textColor: "text-orange-600" },
  { value: "pink", label: "粉红色", color: "bg-pink-400", textColor: "text-pink-600" },
]

// 情绪选项
const moodOptions = [
  { value: "very_sad", label: "很难过", color: "bg-gray-100 text-gray-600", icon: "😢" },
  { value: "sad", label: "难过", color: "bg-blue-100 text-blue-600", icon: "😔" },
  { value: "neutral", label: "一般", color: "bg-yellow-100 text-yellow-600", icon: "😐" },
  { value: "happy", label: "开心", color: "bg-green-100 text-green-600", icon: "😊" },
  { value: "very_happy", label: "很开心", color: "bg-emerald-100 text-emerald-600", icon: "😄" },
]

// 通用头像组件
const SafeAvatar: React.FC<{
  src: string
  alt: string
  className?: string
  fallbackClassName?: string
}> = ({ src, alt, className = "", fallbackClassName = "" }) => {
  const [hasError, setHasError] = useState(false)

  const DefaultAvatar = () => (
    <div
      className={`bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center rounded-full ${fallbackClassName}`}
    >
      <User className="text-white w-1/2 h-1/2" />
    </div>
  )

  if (hasError || !src) {
    return <DefaultAvatar />
  }

  return <img src={src || "/placeholder.svg"} alt={alt} className={className} onError={() => setHasError(true)} />
}

// 用户切换组件
const UserSwitcher: React.FC<{
  users: any[]
  currentUser: any | null
  onUserChange: (userId: string) => void
}> = ({ users, currentUser, onUserChange }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white/30 backdrop-blur-sm rounded-xl hover:bg-white/40 transition-all border border-white/20"
      >
        {currentUser && (
          <>
            <SafeAvatar
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-6 h-6 rounded-full ring-1 ring-white/50 object-cover"
              fallbackClassName="w-6 h-6"
            />
            <span className="text-sm font-medium text-gray-800">{currentUser.name}</span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl border border-white/30 z-50 p-2">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => {
                onUserChange(user.id)
                setIsOpen(false)
              }}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-left ${
                user.id === currentUser?.id ? "bg-pink-100 text-pink-700" : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <SafeAvatar
                src={user.avatarUrl}
                alt={user.name}
                className="w-6 h-6 rounded-full ring-1 ring-gray-200 object-cover"
                fallbackClassName="w-6 h-6"
              />
              <span className="text-sm font-medium">{user.name}</span>
              {user.id === currentUser?.id && <Check className="w-4 h-4 text-pink-600 ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// 选择器组件
const Selector: React.FC<{
  label: string
  icon: React.ReactNode
  options: any[]
  value: string
  onChange: (value: string) => void
  className?: string
}> = ({ label, icon, options, value, onChange, className = "" }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="flex items-center text-sm font-semibold text-gray-700">
        {icon}
        <span className="ml-2">{label}</span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`p-3 rounded-xl border-2 transition-all text-left ${
              value === option.value
                ? "border-pink-300 bg-pink-50"
                : "border-gray-200 bg-white hover:border-pink-200 hover:bg-pink-25"
            }`}
          >
            <div className="flex items-center space-x-2">
              {option.icon && <span className="text-lg">{option.icon}</span>}
              {option.color && !option.icon && <div className={`w-4 h-4 rounded-full ${option.color}`}></div>}
              <span className={`text-sm font-medium ${value === option.value ? "text-pink-700" : "text-gray-700"}`}>
                {option.label}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// 标签管理组件
const TagManager: React.FC<{
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
}> = ({ selectedTags, onTagsChange }) => {
  const [customTag, setCustomTag] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      onTagsChange([...selectedTags, customTag.trim()])
      setCustomTag("")
      setShowCustomInput(false)
    }
  }

  const removeTag = (tag: string) => {
    onTagsChange(selectedTags.filter((t) => t !== tag))
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center text-sm font-semibold text-gray-700">
        <Tag className="w-4 h-4" />
        <span className="ml-2">标签</span>
      </label>

      {/* 已选标签 */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-700"
            >
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-pink-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 预设标签 */}
      <div className="grid grid-cols-3 gap-2">
        {presetTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              selectedTags.includes(tag)
                ? "bg-pink-100 text-pink-700 border border-pink-300"
                : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-pink-50 hover:text-pink-600"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* 自定义标签 */}
      <div className="space-y-2">
        {!showCustomInput ? (
          <button
            type="button"
            onClick={() => setShowCustomInput(true)}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>添加自定义标签</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="输入自定义标签"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              onKeyPress={(e) => e.key === "Enter" && addCustomTag()}
            />
            <button
              type="button"
              onClick={addCustomTag}
              className="px-3 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustomInput(false)
                setCustomTag("")
              }}
              className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// 文件上传组件
const FileUpload: React.FC<{
  attachments: string[]
  onAttachmentsChange: (attachments: string[]) => void
}> = ({ attachments, onAttachmentsChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          onAttachmentsChange([...attachments, result])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeAttachment = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center text-sm font-semibold text-gray-700">
        <Upload className="w-4 h-4" />
        <span className="ml-2">附件</span>
      </label>

      {/* 上传按钮 */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-pink-400 hover:bg-pink-50 transition-all text-center"
      >
        <div className="flex flex-col items-center space-y-2">
          <Upload className="w-6 h-6 text-gray-400" />
          <span className="text-sm text-gray-600">点击上传图片</span>
        </div>
      </button>

      <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />

      {/* 已上传文件 */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {attachments.map((attachment, index) => (
            <div key={index} className="relative group">
              <img
                src={attachment || "/placeholder.svg"}
                alt={`附件 ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// 主页面组件
const PeriodPageContent: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit")
  const isEditMode = !!editId

  // 状态管理
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [activeUser, setActiveUser] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 表单数据
  const [formData, setFormData] = useState<{
    dateTime: string
    status: PeriodStatus
    flow: PeriodFlow
    color: PeriodColor
    mood: PeriodMood
    notes: string
    tags: string[]
    attachments: string[]
  }>({
    dateTime: new Date().toISOString().slice(0, 16),
    status: "start",
    flow: "normal",
    color: "bright_red",
    mood: "neutral",
    notes: "",
    tags: [],
    attachments: [],
  })

  // 初始化数据
  useEffect(() => {
    initializeData()
  }, [])

  // 编辑模式数据加载
  useEffect(() => {
    if (isEditMode && editId && activeUser) {
      loadEditData()
    }
  }, [isEditMode, editId, activeUser])

  const initializeData = async () => {
    try {
      setIsLoading(true)
      const users = await adminService.getAllUsers()
      const user = await adminService.getCurrentUser()

      setAllUsers(users)
      setActiveUser(user)
    } catch (error) {
      console.error("初始化数据失败:", error)
      setError("初始化数据失败")
    } finally {
      setIsLoading(false)
    }
  }

  const loadEditData = async () => {
    if (!activeUser || !editId) return

    try {
      const record = await adminService.getUserRecord("periodRecords", activeUser.id, editId)
      if (record) {
        setFormData({
          dateTime: record.dateTime.slice(0, 16),
          status: record.status,
          flow: record.flow,
          color: record.color,
          mood: record.mood,
          notes: record.notes || "",
          tags: record.tags || [],
          attachments: record.attachments || [],
        })
      }
    } catch (error) {
      console.error("加载编辑数据失败:", error)
      setError("加载记录失败")
    }
  }

  const handleUserChange = async (userId: string) => {
    try {
      await adminService.setCurrentUser(userId)
      const newUser = allUsers.find((u) => u.id === userId)
      setActiveUser(newUser || null)
    } catch (error) {
      console.error("切换用户失败:", error)
      setError("切换用户失败")
    }
  }

  const handleSave = async () => {
    if (!activeUser) {
      setError("请先选择用户")
      return
    }

    if (!formData.notes.trim()) {
      setError("请填写备注信息")
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const recordData = {
        userId: activeUser.id,
        dateTime: new Date(formData.dateTime).toISOString(),
        status: formData.status,
        flow: formData.flow,
        color: formData.color,
        mood: formData.mood,
        notes: formData.notes.trim(),
        tags: formData.tags,
        attachments: formData.attachments,
        delFlag: false,
      }

      if (isEditMode && editId) {
        await adminService.updatePeriodRecord(editId, recordData)
        setSuccess("记录已更新")
      } else {
        await adminService.savePeriodRecord(recordData)
        setSuccess("记录已保存")
      }

      // 延迟跳转
      setTimeout(() => {
        router.push("/health-calendar")
      }, 1500)
    } catch (error) {
      console.error("保存失败:", error)
      setError("保存失败，请重试")
    } finally {
      setIsSaving(false)
    }
  }

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-rose-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-pink-100 rounded-xl transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">{isEditMode ? "编辑生理记录" : "生理记录"}</h1>
                    <p className="text-sm text-gray-600">记录生理期状态和感受</p>
                  </div>
                </div>
              </div>

              {allUsers.length > 0 && (
                <UserSwitcher users={allUsers} currentUser={activeUser} onUserChange={handleUserChange} />
              )}
            </div>
          </div>
        </header>

        {/* 主要内容 */}
        <main className="max-w-4xl mx-auto px-4 py-6">
          {/* 消息提示 */}
          {(error || success) && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-center justify-between ${
                error ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"
              }`}
            >
              <div className="flex items-center space-x-2">
                {error ? (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <Check className="w-5 h-5 text-green-500" />
                )}
                <span className={`text-sm font-medium ${error ? "text-red-700" : "text-green-700"}`}>
                  {error || success}
                </span>
              </div>
              <button
                onClick={clearMessages}
                className={`p-1 rounded-lg hover:bg-opacity-20 ${error ? "hover:bg-red-200" : "hover:bg-green-200"}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 表单卡片 */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="space-y-6">
              {/* 日期时间 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-gray-700">
                    <Calendar className="w-4 h-4" />
                    <span className="ml-2">日期</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dateTime.split("T")[0]}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dateTime: e.target.value + "T" + prev.dateTime.split("T")[1],
                      }))
                    }
                    className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-gray-700">
                    <Clock className="w-4 h-4" />
                    <span className="ml-2">时间</span>
                  </label>
                  <input
                    type="time"
                    value={formData.dateTime.split("T")[1]}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dateTime: prev.dateTime.split("T")[0] + "T" + e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* 状态选择 */}
              <Selector
                label="状态"
                icon={<Heart className="w-4 h-4" />}
                options={statusOptions}
                value={formData.status}
                onChange={(value) => setFormData((prev) => ({ ...prev, status: value as PeriodStatus }))}
              />

              {/* 流量选择 */}
              <Selector
                label="流量"
                icon={<Droplets className="w-4 h-4" />}
                options={flowOptions}
                value={formData.flow}
                onChange={(value) => setFormData((prev) => ({ ...prev, flow: value as PeriodFlow }))}
              />

              {/* 颜色选择 */}
              <Selector
                label="颜色"
                icon={<Palette className="w-4 h-4" />}
                options={colorOptions}
                value={formData.color}
                onChange={(value) => setFormData((prev) => ({ ...prev, color: value as PeriodColor }))}
              />

              {/* 情绪选择 */}
              <Selector
                label="情绪"
                icon={<Smile className="w-4 h-4" />}
                options={moodOptions}
                value={formData.mood}
                onChange={(value) => setFormData((prev) => ({ ...prev, mood: value as PeriodMood }))}
              />

              {/* 备注 */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <FileText className="w-4 h-4" />
                  <span className="ml-2">备注</span>
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="记录今天的感受、症状或其他想要记录的内容..."
                  rows={4}
                  className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                />
              </div>

              {/* 标签管理 */}
              <TagManager
                selectedTags={formData.tags}
                onTagsChange={(tags) => setFormData((prev) => ({ ...prev, tags }))}
              />

              {/* 文件上传 */}
              <FileUpload
                attachments={formData.attachments}
                onAttachmentsChange={(attachments) => setFormData((prev) => ({ ...prev, attachments }))}
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="mt-6 flex space-x-4">
            <button
              onClick={() => router.back()}
              className="flex-1 py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !formData.notes.trim()}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditMode ? "更新记录" : "保存记录"}</span>
                </>
              )}
            </button>
          </div>
        </main>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}

// 主页面导出
export default function PeriodPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      }
    >
      <PeriodPageContent />
    </React.Suspense>
  )
}
