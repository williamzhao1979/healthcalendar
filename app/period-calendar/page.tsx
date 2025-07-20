"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

export default function PeriodCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())

  // 模拟数据
  const periodDays = [10, 11, 12, 13, 14] // 生理期日期
  const ovulationDays = [24, 25] // 排卵期
  const fertileWindow = [20, 21, 22, 23, 24, 25, 26] // 易孕期

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    // 空白天数
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-12"></div>)
    }

    // 月份天数
    for (let day = 1; day <= daysInMonth; day++) {
      const dayClass = "h-12 w-12 rounded-full flex items-center justify-center text-sm font-medium relative"
      let bgColor = ""
      let textColor = "text-gray-700"

      if (periodDays.includes(day)) {
        bgColor = "bg-red-500"
        textColor = "text-white"
      } else if (ovulationDays.includes(day)) {
        bgColor = "bg-purple-500"
        textColor = "text-white"
      } else if (fertileWindow.includes(day)) {
        bgColor = "bg-pink-200"
        textColor = "text-pink-800"
      }

      days.push(
        <div key={day} className="flex justify-center">
          <div className={`${dayClass} ${bgColor} ${textColor}`}>
            {day}
            {periodDays.includes(day) && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-600 rounded-full"></div>
            )}
          </div>
        </div>,
      )
    }

    return days
  }

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
          <h1 className="text-xl font-bold text-gray-800">生理期日历</h1>
        </div>

        {/* Calendar Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-lg">
                {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigateMonth("next")}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Week Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">图例说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-red-500 rounded-full"></div>
              <span className="text-sm">生理期</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-pink-200 rounded-full"></div>
              <span className="text-sm">易孕期</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-purple-500 rounded-full"></div>
              <span className="text-sm">排卵期</span>
            </div>
          </CardContent>
        </Card>

        {/* Predictions */}
        <Card className="mb-20">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Calendar className="w-5 h-5 text-pink-500 mr-2" />
              预测信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="font-medium text-red-800 mb-1">下次生理期</div>
              <div className="text-sm text-red-600">预计 2024年2月12日 开始</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="font-medium text-purple-800 mb-1">排卵期</div>
              <div className="text-sm text-purple-600">预计 2024年1月28日 - 1月29日</div>
            </div>
            <div className="bg-pink-50 p-3 rounded-lg">
              <div className="font-medium text-pink-800 mb-1">易孕期</div>
              <div className="text-sm text-pink-600">预计 2024年1月24日 - 1月30日</div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="fixed bottom-20 left-4 right-4">
          <div className="max-w-md mx-auto space-y-2">
            <Link href="/period">
              <Button className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3">记录今日生理期</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
