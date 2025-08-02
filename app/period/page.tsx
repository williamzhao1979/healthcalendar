"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
const presetTags = ["规律", "正常", "疼痛", "异常", "头痛", "腹痛", "疲劳", "失眠", "情绪低落"]

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
    tags: ["正常"],
    attachments: [],
  })

  // 标签和文件上传状态
  const [showCustomTagInput, setShowCustomTagInput] = useState(false)
  const [customTag, setCustomTag] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // 标签管理
  const toggleTag = (tag: string) => {
    if (formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
    } else {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }))
    }
  }

  const addCustomTag = () => {
    if (customTag.trim() && !formData.tags.includes(customTag.trim())) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, customTag.trim()] }))
      setCustomTag("")
      setShowCustomTagInput(false)
    }
  }

  const removeSelectedTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
  }

  // 文件上传
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          setFormData((prev) => ({ ...prev, attachments: [...prev.attachments, result] }))
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
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
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        :root {
            --health-primary: #10B981;
            --health-secondary: #059669;
            --health-accent: #34D399;
            --health-warm: #F59E0B;
            --health-cool: #3B82F6;
            --health-soft: #8B5CF6;
            --health-pink: #EC4899;
            --health-rose: #F43F5E;
        }
        
        * {
            font-family: 'Inter', sans-serif;
        }
        
        .glass-morphism {
            background: rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.18);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        }
        
        .hero-gradient {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #667eea 50%, #f093fb 75%, #f5576c 100%);
            background-size: 300% 300%;
            animation: gradient 15s ease infinite;
        }
        
        @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        
        .form-card {
            background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
            border: 1px solid rgba(226, 232, 240, 0.8);
            transition: all 0.3s ease;
        }
        
        .form-card:hover {
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            border-color: rgba(236, 72, 153, 0.2);
        }
        
        .status-option, .flow-option, .color-option {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
        }
        
        .status-option:hover, .flow-option:hover, .color-option:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }
        
        .status-option.selected {
            background: linear-gradient(135deg, #EC4899 0%, #F43F5E 100%);
            color: white;
            transform: scale(1.02);
            box-shadow: 0 8px 25px rgba(236, 72, 153, 0.3);
        }
        
        .flow-option.selected {
            background: linear-gradient(135deg, #EC4899 0%, #F43F5E 100%);
            color: white;
            border-color: #EC4899;
        }
        
        .color-option.selected {
            transform: scale(1.1);
            box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.3);
        }
        
        .upload-area {
            transition: all 0.3s ease;
            border: 2px dashed #cbd5e1;
            background: #f8fafc;
        }
        
        .upload-area:hover {
            border-color: #EC4899;
            background: rgba(236, 72, 153, 0.05);
        }
        
        .upload-area.dragover {
            border-color: #EC4899;
            background: rgba(236, 72, 153, 0.1);
            transform: scale(1.02);
        }
        
        .file-preview {
            transition: all 0.3s ease;
        }
        
        .file-preview:hover {
            transform: scale(1.05);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }
        
        .animate-fade-in {
            animation: fadeIn 0.5s ease-in-out;
        }
        
        @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        
        .text-health-primary {
            color: #10B981;
        }
        
        .text-health-pink {
            color: #EC4899;
        }
        
        .bg-health-pink {
            background-color: #EC4899;
        }
        
        .border-health-pink {
            border-color: #EC4899;
        }
        
        .focus\\:border-health-pink:focus {
            border-color: #EC4899;
        }
        
        .focus\\:ring-health-pink:focus {
            --tw-ring-color: rgba(236, 72, 153, 0.5);
        }
        
        .tag-option {
            transition: all 0.3s ease;
        }
        
        .tag-option:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .tag-option.selected {
            background: linear-gradient(135deg, #EC4899 0%, #F43F5E 100%);
            color: white;
            border-color: #EC4899;
            box-shadow: 0 2px 10px rgba(236, 72, 153, 0.3);
        }
        
        .add-tag-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(236, 72, 153, 0.2);
        }
        
        .selected-tag {
            animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
            0% { opacity: 0; transform: translateX(-10px); }
            100% { opacity: 1; transform: translateX(0); }
        }
        
        .mood-option {
            transition: all 0.3s ease;
        }
        
        .mood-option:hover {
            transform: scale(1.05);
        }
      `}</style>

      <div className="overflow-x-hidden">
        {/* Background */}
        <div className="fixed inset-0 hero-gradient"></div>
        <div className="fixed inset-0 bg-white/10"></div>

        <div className="relative min-h-screen">
          {/* Header */}
          <header className="glass-morphism sticky top-0 z-50 px-3 py-2 animate-fade-in">
            <div className="flex items-center justify-between">
              {/* Back Button and Title */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => router.back()}
                  className="w-8 h-8 bg-white/30 backdrop-blur-sm rounded-xl hover:bg-white/40 transition-all border border-white/20 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-base font-bold text-gray-800">生理记录</h1>
                  <p className="text-xs text-gray-600">记录您的月经周期</p>
                </div>
              </div>

              {/* User Switch */}
              {allUsers.length > 0 && activeUser && (
                <div className="relative">
                  <button className="flex items-center space-x-1.5 px-2 py-1 bg-white/30 backdrop-blur-sm rounded-xl hover:bg-white/40 transition-all border border-white/20">
                    <img
                      src={activeUser.avatarUrl || "/placeholder.svg"}
                      alt="用户头像"
                      className="w-5 h-5 rounded-full ring-1 ring-white/50"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg"
                      }}
                    />
                    <span className="text-xs font-semibold text-gray-800">{activeUser.name}</span>
                    <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="px-3 py-2 pb-16">
            {/* Main Form Card */}
            <div className="form-card rounded-2xl p-3 mb-3 animate-fade-in relative">
              {/* Close Button */}
              <button
                onClick={() => router.push("/health-calendar")}
                className="absolute top-3 right-3 w-6 h-6 bg-gray-100 hover:bg-red-100 rounded-full flex items-center justify-center transition-all z-10"
              >
                <svg
                  className="w-3 h-3 text-gray-400 hover:text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Date and Time Section */}
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                  <svg
                    className="w-4 h-4 text-health-pink mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  日期时间
                </h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">选择日期和时间</label>
                  <input
                    type="datetime-local"
                    value={formData.dateTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dateTime: e.target.value }))}
                    className="w-full px-2.5 py-2 border border-gray-200 rounded-lg focus:border-health-pink focus:ring-2 focus:ring-health-pink/20 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Divider */}
              <hr className="border-gray-200 mb-3" />

              {/* Period Status Selection */}
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                  <svg className="w-4 h-4 text-health-pink mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                      clipRule="evenodd"
                    />
                  </svg>
                  月经状态
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <div
                    className={`status-option p-2 bg-gray-50 rounded-lg border border-gray-200 text-center cursor-pointer ${formData.status === "start" ? "selected" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, status: "start" }))}
                  >
                    <div className="w-7 h-7 bg-red-100 rounded-lg mx-auto mb-1.5 flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 5v10l7-5-7-5z" />
                      </svg>
                    </div>
                    <div className="text-xs font-semibold">开始</div>
                    <div className="text-xs text-gray-500 mt-0.5">月经开始</div>
                  </div>
                  <div
                    className={`status-option p-2 bg-gray-50 rounded-lg border border-gray-200 text-center cursor-pointer ${formData.status === "ongoing" ? "selected" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, status: "ongoing" }))}
                  >
                    <div className="w-7 h-7 bg-pink-100 rounded-lg mx-auto mb-1.5 flex items-center justify-center">
                      <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                        <circle cx="10" cy="10" r="6" />
                      </svg>
                    </div>
                    <div className="text-xs font-semibold">进行中</div>
                    <div className="text-xs text-gray-500 mt-0.5">月经期间</div>
                  </div>
                  <div
                    className={`status-option p-2 bg-gray-50 rounded-lg border border-gray-200 text-center cursor-pointer ${formData.status === "end" ? "selected" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, status: "end" }))}
                  >
                    <div className="w-7 h-7 bg-gray-100 rounded-lg mx-auto mb-1.5 flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <rect x="6" y="6" width="8" height="8" />
                      </svg>
                    </div>
                    <div className="text-xs font-semibold">结束</div>
                    <div className="text-xs text-gray-500 mt-0.5">月经结束</div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <hr className="border-gray-200 mb-3" />

              {/* Flow Amount Selection */}
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                  <svg className="w-4 h-4 text-health-pink mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  流量大小
                </h3>
                <div className="grid grid-cols-4 gap-1.5">
                  <div
                    className={`flow-option p-2 bg-gray-50 rounded-lg border border-gray-200 text-center cursor-pointer ${formData.flow === "minimal" ? "selected" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, flow: "minimal" }))}
                  >
                    <div className="text-xs font-semibold text-gray-700">极少</div>
                    <div className="text-xs text-gray-500 mt-0.5">点滴状</div>
                  </div>
                  <div
                    className={`flow-option p-2 bg-gray-50 rounded-lg border border-gray-200 text-center cursor-pointer ${formData.flow === "light" ? "selected" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, flow: "light" }))}
                  >
                    <div className="text-xs font-semibold text-gray-700">较少</div>
                    <div className="text-xs text-gray-500 mt-0.5">轻量</div>
                  </div>
                  <div
                    className={`flow-option p-2 bg-gray-50 rounded-lg border border-gray-200 text-center cursor-pointer ${formData.flow === "normal" ? "selected" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, flow: "normal" }))}
                  >
                    <div className="text-xs font-semibold">正常</div>
                    <div className="text-xs mt-0.5">中等量</div>
                  </div>
                  <div
                    className={`flow-option p-2 bg-gray-50 rounded-lg border border-gray-200 text-center cursor-pointer ${formData.flow === "heavy" ? "selected" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, flow: "heavy" }))}
                  >
                    <div className="text-xs font-semibold text-gray-700">较多</div>
                    <div className="text-xs text-gray-500 mt-0.5">大量</div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <hr className="border-gray-200 mb-3" />

              {/* Color Selection */}
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                  <svg
                    className="w-4 h-4 text-health-pink mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
                    />
                  </svg>
                  颜色记录
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  <div
                    className={`color-option p-1.5 rounded-lg text-center cursor-pointer ${formData.color === "bright_red" ? "selected" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, color: "bright_red" }))}
                  >
                    <div className="w-6 h-6 bg-red-600 rounded-full mx-auto mb-1 border-2 border-gray-200"></div>
                    <div className="text-xs font-medium text-gray-700">鲜红</div>
                  </div>
                  <div
                    className={`color-option p-1.5 rounded-lg text-center cursor-pointer ${formData.color === "dark_red" ? "selected" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, color: "dark_red" }))}
                  >
                    <div className="w-6 h-6 bg-red-800 rounded-full mx-auto mb-1 border-2 border-gray-200"></div>
                    <div className="text-xs font-medium text-gray-700">暗红</div>
                  </div>
                  <div
                    className={`color-option p-1.5 rounded-lg text-center cursor-pointer ${formData.color === "deep_red" ? "selected" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, color: "deep_red" }))}
                  >
                    <div className="w-6 h-6 bg-red-900 rounded-full mx-auto mb-1 border-2 border-gray-200"></div>
                    <div className="text-xs font-medium text-gray-700">深红</div>
                  </div>
                  <div
                    className={`color-option p-1.5 rounded-lg text-center cursor-pointer ${formData.color === "orange_red" ? "selected" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, color: "orange_red" }))}
                  >
                    <div className="w-6 h-6 bg-orange-600 rounded-full mx-auto mb-1 border-2 border-gray-200"></div>
                    <div className="text-xs font-medium text-gray-700">橙红</div>
                  </div>
                  <div
                    className={`color-option p-1.5 rounded-lg text-center cursor-pointer ${formData.color === "pink" ? "selected" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, color: "pink" }))}
                  >
                    <div className="w-6 h-6 bg-pink-400 rounded-full mx-auto mb-1 border-2 border-gray-200"></div>
                    <div className="text-xs font-medium text-gray-700">粉红</div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <hr className="border-gray-200 mb-3" />

              {/* Notes Section */}
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                  <svg
                    className="w-4 h-4 text-health-pink mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  备注信息
                </h3>
                <textarea
                  placeholder="请记录详细信息，如疼痛程度、情绪变化、特殊情况等..."
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-2.5 py-2 border border-gray-200 rounded-lg focus:border-health-pink focus:ring-2 focus:ring-health-pink/20 transition-all resize-none text-sm"
                />
              </div>

              {/* Divider */}
              <hr className="border-gray-200 mb-3" />

              {/* Mood Tracking */}
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                  <svg
                    className="w-4 h-4 text-health-pink mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  情绪记录
                </h3>
                <div className="flex justify-between">
                  <div
                    className={`mood-option p-1.5 rounded-lg text-center cursor-pointer ${formData.mood === "very_sad" ? "bg-pink-50 border border-pink-200" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, mood: "very_sad" }))}
                  >
                    <div className="text-xl mb-1">😭</div>
                    <div
                      className={`text-xs ${formData.mood === "very_sad" ? "text-pink-600 font-medium" : "text-gray-600"}`}
                    >
                      很难过
                    </div>
                  </div>
                  <div
                    className={`mood-option p-1.5 rounded-lg text-center cursor-pointer ${formData.mood === "sad" ? "bg-pink-50 border border-pink-200" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, mood: "sad" }))}
                  >
                    <div className="text-xl mb-1">😟</div>
                    <div
                      className={`text-xs ${formData.mood === "sad" ? "text-pink-600 font-medium" : "text-gray-600"}`}
                    >
                      不开心
                    </div>
                  </div>
                  <div
                    className={`mood-option p-1.5 rounded-lg text-center cursor-pointer ${formData.mood === "neutral" ? "bg-pink-50 border border-pink-200" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, mood: "neutral" }))}
                  >
                    <div className="text-xl mb-1">😐</div>
                    <div
                      className={`text-xs ${formData.mood === "neutral" ? "text-pink-600 font-medium" : "text-gray-600"}`}
                    >
                      一般
                    </div>
                  </div>
                  <div
                    className={`mood-option p-1.5 rounded-lg text-center cursor-pointer ${formData.mood === "happy" ? "bg-pink-50 border border-pink-200" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, mood: "happy" }))}
                  >
                    <div className="text-xl mb-1">😊</div>
                    <div
                      className={`text-xs ${formData.mood === "happy" ? "text-pink-600 font-medium" : "text-gray-600"}`}
                    >
                      开心
                    </div>
                  </div>
                  <div
                    className={`mood-option p-1.5 rounded-lg text-center cursor-pointer ${formData.mood === "very_happy" ? "bg-pink-50 border border-pink-200" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, mood: "very_happy" }))}
                  >
                    <div className="text-xl mb-1">😄</div>
                    <div
                      className={`text-xs ${formData.mood === "very_happy" ? "text-pink-600 font-medium" : "text-gray-600"}`}
                    >
                      很开心
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <hr className="border-gray-200 mb-3" />

              {/* Tags Selection */}
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                  <svg
                    className="w-4 h-4 text-health-pink mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  标签选择
                </h3>

                {/* Tag Container */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {/* Preset Tags */}
                  {presetTags.map((tag) => (
                    <div
                      key={tag}
                      className={`tag-option px-2 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs font-medium text-gray-700 cursor-pointer transition-all hover:bg-gray-200 ${formData.tags.includes(tag) ? "selected" : ""}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </div>
                  ))}

                  {/* Add Custom Tag Button */}
                  <div
                    className="add-tag-btn px-2 py-1 bg-health-pink/10 border border-health-pink/30 rounded-full text-xs font-medium text-health-pink cursor-pointer transition-all hover:bg-health-pink/20 flex items-center space-x-1"
                    onClick={() => setShowCustomTagInput(true)}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>自定义</span>
                  </div>
                </div>

                {/* Custom Tag Input */}
                {showCustomTagInput && (
                  <div className="mb-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="输入自定义标签..."
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addCustomTag()}
                        className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg focus:border-health-pink focus:ring-2 focus:ring-health-pink/20 transition-all text-xs"
                        maxLength={10}
                      />
                      <button
                        onClick={addCustomTag}
                        className="px-2.5 py-1.5 bg-health-pink text-white text-xs rounded-lg hover:bg-pink-600 transition-colors"
                      >
                        添加
                      </button>
                      <button
                        onClick={() => {
                          setShowCustomTagInput(false)
                          setCustomTag("")
                        }}
                        className="px-2.5 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}

                {/* Selected Tags Display */}
                {formData.tags.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">已选择的标签：</div>
                    <div className="flex flex-wrap gap-1">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="selected-tag px-1.5 py-0.5 bg-health-pink/10 text-health-pink text-xs rounded-md border border-health-pink/20"
                        >
                          {tag}
                          <button
                            onClick={() => removeSelectedTag(tag)}
                            className="ml-1 text-health-pink/60 hover:text-health-pink"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <hr className="border-gray-200 mb-3" />

              {/* File Upload Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                  <svg
                    className="w-4 h-4 text-health-pink mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                  附件上传
                </h3>

                {/* Upload Area */}
                <div className="upload-area rounded-lg p-3 text-center mb-2">
                  <div className="w-6 h-6 bg-gray-100 rounded-lg mx-auto mb-1.5 flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <div className="text-xs font-medium text-gray-700 mb-1">点击上传或拖拽文件</div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-health-pink text-white text-xs rounded-md hover:bg-pink-600 transition-colors"
                  >
                    选择文件
                  </button>
                </div>

                {/* File Preview Area */}
                {formData.attachments.length > 0 && (
                  <div className="space-y-1">
                    {formData.attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="file-preview bg-white p-1.5 rounded-lg border border-gray-200 flex items-center space-x-2"
                      >
                        <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate">附件 {index + 1}</div>
                          <div className="text-xs text-gray-500">图片文件</div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="w-5 h-5 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center transition-colors"
                        >
                          <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => router.back()}
                className="py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors text-sm flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="py-2.5 bg-health-pink text-white font-semibold rounded-xl hover:bg-pink-600 transition-colors text-sm disabled:opacity-50 flex items-center justify-center"
              >
                {isSaving ? (
                  <>
                    <div className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5"></div>
                    保存中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    保存记录
                  </>
                )}
              </button>
            </div>

            {/* Success/Error Messages */}
            {success && (
              <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {success}
              </div>
            )}
            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
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
