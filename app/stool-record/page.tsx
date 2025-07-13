"use client"

import type React from "react"

import { useState } from "react"
import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useDatabase } from "@/context/DatabaseContext"
import { useHealthRecords } from "@/hooks/useHealthRecords"
import { getDateString } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const BRISTOL_TYPES = [
  { type: 1, name: "硬球状", description: "分离的硬块，像坚果" },
  { type: 2, name: "块状", description: "香肠状但有块状" },
  { type: 3, name: "裂纹状", description: "香肠状但表面有裂纹" },
  { type: 4, name: "光滑状", description: "香肠状，光滑柔软" },
  { type: 5, name: "软块状", description: "柔软的块状，边缘清晰" },
  { type: 6, name: "糊状", description: "蓬松的块状，边缘不规则" },
  { type: 7, name: "水状", description: "完全液体状" },
]

const STOOL_COLORS = [
  { color: "brown", name: "棕色", hex: "#8B4513" },
  { color: "yellow", name: "黄色", hex: "#FFD700" },
  { color: "green", name: "绿色", hex: "#228B22" },
  { color: "black", name: "黑色", hex: "#000000" },
  { color: "red", name: "红色", hex: "#DC143C" },
  { color: "white", name: "白色", hex: "#F5F5F5" },
]

export default function StoolRecordPage() {
  const { currentUser } = useDatabase()
  const { addRecord } = useHealthRecords()
  const router = useRouter()

  const [formData, setFormData] = useState({
    date: getDateString(new Date()),
    time: new Date().toTimeString().slice(0, 5),
    bristolType: "",
    color: "",
    notes: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser) {
      toast.error("请先选择用户")
      return
    }

    if (!formData.bristolType || !formData.color) {
      toast.error("请选择布里斯托尔分型和颜色")
      return
    }

    setIsSubmitting(true)

    try {
      await addRecord({
        date: formData.date,
        type: "stool",
        data: {
          time: formData.time,
          bristolType: Number.parseInt(formData.bristolType),
          color: formData.color,
          notes: formData.notes,
        },
      })

      toast.success("记录已保存")
      router.push("/health-calendar")
    } catch (error) {
      console.error("Failed to save record:", error)
      toast.error("保存失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    router.push("/health-calendar")
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">请先选择用户</p>
          <Button onClick={handleBack}>返回</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">大便记录</h1>
          </div>
          <div className="text-sm text-muted-foreground">用户: {currentUser.name}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">日期</Label>
                  <input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">时间</Label>
                  <input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 布里斯托尔分型 */}
          <Card>
            <CardHeader>
              <CardTitle>布里斯托尔大便分型</CardTitle>
              <CardDescription>请选择最符合的分型</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.bristolType}
                onValueChange={(value) => setFormData({ ...formData, bristolType: value })}
                className="space-y-3"
              >
                {BRISTOL_TYPES.map((type) => (
                  <div key={type.type} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value={type.type.toString()} id={`bristol-${type.type}`} />
                    <Label htmlFor={`bristol-${type.type}`} className="flex-1 cursor-pointer">
                      <div className="font-medium">
                        类型 {type.type}: {type.name}
                      </div>
                      <div className="text-sm text-muted-foreground">{type.description}</div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* 颜色选择 */}
          <Card>
            <CardHeader>
              <CardTitle>颜色</CardTitle>
              <CardDescription>请选择大便的颜色</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.color}
                onValueChange={(value) => setFormData({ ...formData, color: value })}
                className="grid grid-cols-2 gap-3"
              >
                {STOOL_COLORS.map((colorOption) => (
                  <div key={colorOption.color} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value={colorOption.color} id={`color-${colorOption.color}`} />
                    <Label
                      htmlFor={`color-${colorOption.color}`}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded-full border-2" style={{ backgroundColor: colorOption.hex }} />
                      <span>{colorOption.name}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* 备注 */}
          <Card>
            <CardHeader>
              <CardTitle>备注</CardTitle>
              <CardDescription>记录其他相关信息（可选）</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="输入备注信息..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* 提交按钮 */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  保存记录
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
