"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Activity, Clock, Droplets } from "lucide-react"
import { useState } from "react"

export default function StoolPage() {
  const [selectedType, setSelectedType] = useState("")
  const [selectedColor, setSelectedColor] = useState("")
  const [selectedTime, setSelectedTime] = useState("")

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6 pt-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-800">排便记录</h1>
        </div>

        {/* Date Card */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="text-center">
              <Activity className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <p className="text-lg font-semibold">{new Date().toLocaleDateString("zh-CN")}</p>
              <p className="text-sm text-gray-500">今日记录</p>
            </div>
          </CardContent>
        </Card>

        {/* Time Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Clock className="w-5 h-5 text-amber-600 mr-2" />
              时间
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {["早上", "中午", "晚上"].map((time) => (
                <Button
                  key={time}
                  variant={selectedTime === time ? "default" : "outline"}
                  className={selectedTime === time ? "bg-amber-600 hover:bg-amber-700" : ""}
                  onClick={() => setSelectedTime(time)}
                >
                  {time}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bristol Stool Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Activity className="w-5 h-5 text-amber-600 mr-2" />
              大便形状 (布里斯托大便分类法)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { type: "1", desc: "硬球状，分离", severity: "严重便秘" },
                { type: "2", desc: "香肠状但有硬块", severity: "轻度便秘" },
                { type: "3", desc: "香肠状但表面有裂纹", severity: "正常" },
                { type: "4", desc: "光滑柔软的香肠状", severity: "正常" },
                { type: "5", desc: "柔软的块状", severity: "缺乏纤维" },
                { type: "6", desc: "糊状，边缘不规则", severity: "轻度腹泻" },
                { type: "7", desc: "水状，无固体", severity: "腹泻" },
              ].map((stool) => (
                <Button
                  key={stool.type}
                  variant={selectedType === stool.type ? "default" : "outline"}
                  className={`w-full h-auto p-3 justify-start ${selectedType === stool.type ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                  onClick={() => setSelectedType(stool.type)}
                >
                  <div className="text-left">
                    <div className="font-semibold">
                      类型 {stool.type}: {stool.desc}
                    </div>
                    <div className="text-sm opacity-75">{stool.severity}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Color Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Droplets className="w-5 h-5 text-amber-600 mr-2" />
              颜色
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { color: "brown", label: "棕色", bg: "bg-amber-700", status: "正常" },
                { color: "yellow", label: "黄色", bg: "bg-yellow-400", status: "可能消化不良" },
                { color: "green", label: "绿色", bg: "bg-green-500", status: "需要注意" },
                { color: "black", label: "黑色", bg: "bg-gray-800", status: "需要就医" },
                { color: "red", label: "带血", bg: "bg-red-500", status: "需要就医" },
                { color: "white", label: "白色", bg: "bg-gray-200", status: "需要就医" },
              ].map((colorOption) => (
                <Button
                  key={colorOption.color}
                  variant={selectedColor === colorOption.color ? "default" : "outline"}
                  className={`h-16 flex flex-col ${selectedColor === colorOption.color ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                  onClick={() => setSelectedColor(colorOption.color)}
                >
                  <div className={`w-6 h-6 rounded-full ${colorOption.bg} mb-1`}></div>
                  <span className="text-sm">{colorOption.label}</span>
                  <span className="text-xs opacity-75">{colorOption.status}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Additional Symptoms */}
        <Card className="mb-20">
          <CardHeader>
            <CardTitle className="text-lg">其他症状</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {["腹痛", "腹胀", "恶心", "发热", "血便", "粘液", "排便困难", "排便急迫"].map((symptom) => (
                <Button key={symptom} variant="outline" size="sm" className="h-10 bg-transparent">
                  {symptom}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="fixed bottom-20 left-4 right-4">
          <div className="max-w-md mx-auto">
            <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3">保存记录</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
