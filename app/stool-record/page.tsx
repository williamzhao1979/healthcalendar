"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calendar, Upload, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useDatabase } from "@/context/DatabaseContext"
import { useHealthRecords } from "@/hooks/useHealthRecords"

// 布里斯托大便分类法
const stoolTypes = [
  {
    id: "type1",
    name: "类型1",
    description: "分离的硬块，像坚果",
    detail: "严重便秘",
    color: "text-red-600",
  },
  {
    id: "type2",
    name: "类型2",
    description: "香肠状但有块状",
    detail: "轻度便秘",
    color: "text-orange-600",
  },
  {
    id: "type3",
    name: "类型3",
    description: "香肠状但表面有裂纹",
    detail: "正常",
    color: "text-green-600",
  },
  {
    id: "type4",
    name: "类型4",
    description: "香肠状或蛇状，光滑柔软",
    detail: "正常",
    color: "text-green-600",
  },
  {
    id: "type5",
    name: "类型5",
    description: "柔软的块状，边缘清晰",
    detail: "缺乏纤维",
    color: "text-yellow-600",
  },
  {
    id: "type6",
    name: "类型6",
    description: "蓬松的块状，边缘不规则",
    detail: "轻度腹泻",
    color: "text-orange-600",
  },
  {
    id: "type7",
    name: "类型7",
    description: "水样，无固体块状",
    detail: "腹泻",
    color: "text-red-600",
  },
]

// 大便颜色选项
const stoolColors = [
  {
    id: "brown",
    name: "棕色",
    description: "正常颜色，胆汁代谢正常",
    color: "bg-amber-700",
  },
  {
    id: "yellow",
    name: "黄色",
    description: "可能脂肪消化不良",
    color: "bg-yellow-500",
  },
  {
    id: "green",
    name: "绿色",
    description: "胆汁过多或食物通过过快",
    color: "bg-green-600",
  },
  {
    id: "black",
    name: "黑色",
    description: "可能上消化道出血，需就医",
    color: "bg-gray-900",
  },
  {
    id: "red",
    name: "红色",
    description: "可能下消化道出血，需就医",
    color: "bg-red-600",
  },
  {
    id: "white",
    name: "白色/灰色",
    description: "胆汁分泌异常，需就医",
    color: "bg-gray-300",
  },
]

export default function StoolRecordPage() {
  const router = useRouter()
  const { currentUser, users } = useDatabase()
  const { addRecord } = useHealthRecords(currentUser?.id || null)

  // 表单状态
  const [selectedUser, setSelectedUser] = useState(currentUser?.id || "")
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    const hours = String(now.getHours()).padStart(2, "0")
    const minutes = String(now.getMinutes()).padStart(2, "0")
    return `${year}-${month}-${day}T${hours}:${minutes}`
  })
  const [stoolType, setStoolType] = useState("type4") // 默认类型4
  const [stoolColor, setStoolColor] = useState("brown")
  const [note, setNote] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [compressImages, setCompressImages] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 获取选中的大便类型信息
  const selectedStoolType = stoolTypes.find((type) => type.id === stoolType)

  // 获取选中的大便颜色信息
  const selectedStoolColor = stoolColors.find((color) => color.id === stoolColor)

  // 获取用户显示名称
  const getUserDisplayName = (user: any) => {
    if (user.relationship && user.relationship !== "本人") {
      return `${user.name} (${user.relationship})`
    }
    return user.name
  }

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      setAttachments((prev) => [...prev, ...Array.from(files)])
    }
  }

  // 移除附件
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 保存记录
  const handleSave = async () => {
    if (!selectedUser) {
      alert("请选择用户")
      return
    }

    setIsSubmitting(true)
    try {
      const timestamp = new Date(dateTime).getTime()

      // 准备附件信息
      const attachmentInfo = attachments.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        compressed: compressImages && file.type.startsWith("image/"),
      }))

      // 创建健康记录
      const recordData = {
        userId: selectedUser,
        type: "stool",
        category: "大便记录",
        timestamp,
        note,
        details: {
          stoolType,
          stoolTypeName: selectedStoolType?.name,
          stoolTypeDescription: selectedStoolType?.description,
          stoolColor,
          stoolColorName: selectedStoolColor?.name,
          stoolColorDescription: selectedStoolColor?.description,
          attachments: attachmentInfo,
        },
      }

      await addRecord(recordData)

      // 保存成功，返回健康日历页面
      router.push("/health-calendar")
    } catch (error) {
      console.error("保存大便记录失败:", error)
      alert("保存失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* 头部 */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <div className="w-5 h-5 bg-green-600 rounded"></div>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">大便记录</h1>
            <p className="text-sm text-gray-600">记录今天的大便状况</p>
          </div>
        </div>
      </div>

      {/* 当前用户选择 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            </div>
            <Label className="text-sm font-medium text-gray-700">当前用户:</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="选择用户" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {getUserDisplayName(user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 主要记录信息 */}
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* 日期时间 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">日期时间</h3>
            <div className="relative">
              <Input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="pl-10"
              />
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* 大便类型 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              大便类型 <span className="text-sm font-normal text-gray-600">(布里斯托分类法)</span>
            </h3>
            <Select value={stoolType} onValueChange={setStoolType}>
              <SelectTrigger>
                <SelectValue placeholder="选择大便类型" />
              </SelectTrigger>
              <SelectContent>
                {stoolTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{type.name}</span>
                      <span className="text-sm text-gray-600">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedStoolType && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-800">当前选择：</span>
                  <span className="text-sm font-medium text-green-800">{selectedStoolType.name}</span>
                </div>
                <div className="text-sm text-green-700 mt-1">
                  {selectedStoolType.description}，{selectedStoolType.detail}
                </div>
              </div>
            )}
          </div>

          {/* 大便颜色 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">大便颜色</h3>
            <Select value={stoolColor} onValueChange={setStoolColor}>
              <SelectTrigger>
                <SelectValue placeholder="选择大便颜色" />
              </SelectTrigger>
              <SelectContent>
                {stoolColors.map((color) => (
                  <SelectItem key={color.id} value={color.id}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${color.color}`}></div>
                      <div className="flex flex-col">
                        <span className="font-medium">{color.name}</span>
                        <span className="text-sm text-gray-600">{color.description}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 备注 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">备注</h3>
            <Textarea
              placeholder="记录其他感受或注意事项..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* 附件上传 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">附件上传</h3>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="compress"
                  checked={compressImages}
                  onCheckedChange={(checked) => setCompressImages(checked as boolean)}
                />
                <Label htmlFor="compress" className="text-sm text-gray-600">
                  图片压缩
                </Label>
              </div>
            </div>

            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 mb-1">点击上传图片或文档</p>
              <p className="text-sm text-gray-500">图片格式动态压缩适合上传的大小</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* 已上传文件列表 */}
            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <Upload className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      删除
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex gap-4 mt-6">
        <Button
          variant="outline"
          className="flex-1 bg-transparent"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          取消
        </Button>
        <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              保存中...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              保存记录
            </div>
          )}
        </Button>
      </div>
    </div>
  )
}
