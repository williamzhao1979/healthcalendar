"use client"

import type React from "react"

import { useState } from "react"
import { ArrowLeft, Calendar, Upload, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useDatabase } from "@/context/DatabaseContext"
import { useHealthRecords } from "@/hooks/useHealthRecords"

export default function StoolRecordPage() {
  const router = useRouter()
  const { currentUser, users } = useDatabase()
  const { addRecord } = useHealthRecords(null)

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
  const [stoolType, setStoolType] = useState("")
  const [stoolColor, setStoolColor] = useState("棕色")
  const [notes, setNotes] = useState("")
  const [imageCompression, setImageCompression] = useState(true)
  const [attachments, setAttachments] = useState<File[]>([])

  // 大便类型选项（布里斯托大便分类法）
  const stoolTypes = [
    { value: "type1", label: "类型1", description: "分离的硬块，像坚果" },
    { value: "type2", label: "类型2", description: "香肠状但有块状" },
    { value: "type3", label: "类型3", description: "香肠状但表面有裂纹" },
    { value: "type4", label: "类型4", description: "香肠状或蛇状，光滑柔软" },
    { value: "type5", label: "类型5", description: "柔软的块状，边缘清晰" },
    { value: "type6", label: "类型6", description: "蓬松的块状，边缘不规则" },
    { value: "type7", label: "类型7", description: "水样，无固体块状" },
  ]

  // 大便颜色选项
  const stoolColors = [
    { value: "棕色", label: "棕色", description: "正常颜色，胆汁代谢正常" },
    { value: "黄色", label: "黄色", description: "可能消化过快或脂肪含量高" },
    { value: "绿色", label: "绿色", description: "可能食物通过过快或胆汁过多" },
    { value: "黑色", label: "黑色", description: "可能有上消化道出血，需注意" },
    { value: "红色", label: "红色", description: "可能有下消化道出血，需注意" },
    { value: "白色", label: "白色", description: "可能胆汁分泌异常，需就医" },
  ]

  // 获取选中类型的描述
  const getSelectedTypeDescription = () => {
    const selected = stoolTypes.find((type) => type.value === stoolType)
    return selected ? `${selected.label}, ${selected.description}` : ""
  }

  // 获取选中颜色的描述
  const getSelectedColorDescription = () => {
    const selected = stoolColors.find((color) => color.value === stoolColor)
    return selected ? selected.description : ""
  }

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      setAttachments(Array.from(files))
    }
  }

  // 保存记录
  const handleSave = async () => {
    if (!selectedUser) {
      alert("请选择用户")
      return
    }

    if (!stoolType) {
      alert("请选择大便类型")
      return
    }

    try {
      const recordData = {
        userId: selectedUser,
        type: "stool",
        timestamp: new Date(dateTime).getTime(),
        details: {
          stoolType,
          stoolColor,
          typeDescription: getSelectedTypeDescription(),
          colorDescription: getSelectedColorDescription(),
        },
        note: notes,
      }

      await addRecord(recordData)
      alert("大便记录保存成功！")
      router.back()
    } catch (error) {
      console.error("保存记录失败:", error)
      alert("保存失败，请重试")
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 头部 */}
      <div className="bg-white px-4 py-4 flex items-center gap-4 border-b">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded"></div>
            </div>
          </div>
          <div>
            <h1 className="text-lg font-semibold">大便记录</h1>
            <p className="text-sm text-gray-500">记录今天的大便状况</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 当前用户选择 */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              </div>
              <span className="font-medium">当前用户:</span>
            </div>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 主要记录信息卡片 */}
        <div className="bg-white rounded-xl p-4 space-y-6">
          {/* 日期时间 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">日期时间</h3>
            <div className="relative">
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* 大便类型 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">大便类型（布里斯托分类法）</h3>
            <select
              value={stoolType}
              onChange={(e) => setStoolType(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-3"
            >
              <option value="">选择大便类型</option>
              {stoolTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>

            {stoolType && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-green-800 font-medium">当前选择：{getSelectedTypeDescription()}</div>
              </div>
            )}
          </div>

          {/* 大便颜色 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">大便颜色</h3>
            <select
              value={stoolColor}
              onChange={(e) => setStoolColor(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {stoolColors.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.label} - {color.description}
                </option>
              ))}
            </select>
          </div>

          {/* 备注 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">备注</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="记录其他感受或注意事项..."
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              rows={4}
            />
          </div>

          {/* 附件上传 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">附件上传</h3>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={imageCompression}
                  onChange={(e) => setImageCompression(e.target.checked)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm">图片压缩</span>
              </label>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-400 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <div className="text-gray-600 mb-2">点击上传图片或文档</div>
                <div className="text-sm text-gray-500">图片格式动态压缩合适合上传的大小</div>
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="mt-3">
                <div className="text-sm text-gray-600 mb-2">已选择文件:</div>
                {attachments.map((file, index) => (
                  <div key={index} className="text-sm text-gray-800 bg-gray-50 px-3 py-2 rounded">
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => router.back()}
            className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            保存记录
          </button>
        </div>
      </div>
    </div>
  )
}
