"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Calendar, Droplets, Heart, TrendingUp } from "lucide-react"
import { useState } from "react"

export default function PeriodPage() {
  const [selectedFlow, setSelectedFlow] = useState("")
  const [selectedMood, setSelectedMood] = useState("")

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6 pt-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-800">生理期记录</h1>
        </div>

        {/* Date Card */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="text-center">
              <Calendar className="w-8 h-8 text-pink-500 mx-auto mb-2" />
              <p className="text-lg font-semibold">{new Date().toLocaleDateString("zh-CN")}</p>
              <p className="text-sm text-gray-500">今日记录</p>
            </div>
          </CardContent>
        </Card>

        {/* Flow Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Droplets className="w-5 h-5 text-pink-500 mr-2" />
              经血流量
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "light", label: "轻量", color: "bg-pink-200" },
                { value: "normal", label: "正常", color: "bg-pink-400" },
                { value: "heavy", label: "量多", color: "bg-pink-600" },
                { value: "spotting", label: "点滴", color: "bg-pink-100" },
              ].map((flow) => (
                <Button
                  key={flow.value}
                  variant={selectedFlow === flow.value ? "default" : "outline"}
                  className={`h-12 ${selectedFlow === flow.value ? "bg-pink-500 hover:bg-pink-600" : ""}`}
                  onClick={() => setSelectedFlow(flow.value)}
                >
                  <div className={`w-4 h-4 rounded-full ${flow.color} mr-2`}></div>
                  {flow.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mood Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Heart className="w-5 h-5 text-pink-500 mr-2" />
              心情状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "happy", label: "😊", desc: "开心" },
                { value: "normal", label: "😐", desc: "一般" },
                { value: "sad", label: "😢", desc: "难过" },
                { value: "angry", label: "😠", desc: "烦躁" },
                { value: "tired", label: "😴", desc: "疲惫" },
                { value: "pain", label: "😣", desc: "疼痛" },
              ].map((mood) => (
                <Button
                  key={mood.value}
                  variant={selectedMood === mood.value ? "default" : "outline"}
                  className={`h-16 flex flex-col ${selectedMood === mood.value ? "bg-pink-500 hover:bg-pink-600" : ""}`}
                  onClick={() => setSelectedMood(mood.value)}
                >
                  <span className="text-2xl mb-1">{mood.label}</span>
                  <span className="text-xs">{mood.desc}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Symptoms */}
        <Card className="mb-20">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <TrendingUp className="w-5 h-5 text-pink-500 mr-2" />
              症状记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {["腹痛", "头痛", "乳房胀痛", "腰痛", "恶心", "疲劳", "情绪波动", "失眠"].map((symptom) => (
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
            <Button className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3">保存记录</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
