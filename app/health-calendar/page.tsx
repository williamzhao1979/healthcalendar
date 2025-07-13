"use client"

import { useState } from "react"
import { Calendar, Plus, BarChart3, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import UserDropdown from "@/components/UserDropdown"
import { useDatabase } from "@/context/DatabaseContext"
import { useHealthRecords } from "@/hooks/useHealthRecords"
import { formatDate, getDateString, isToday } from "@/lib/utils"
import { useRouter } from "next/navigation"

export default function HealthCalendarPage() {
  const { currentUser, isLoading: userLoading } = useDatabase()
  const { records, isLoading: recordsLoading } = useHealthRecords()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isSystemManagementOpen, setIsSystemManagementOpen] = useState(false)
  const router = useRouter()

  // 获取当前月份的记录统计
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const monthlyRecords = records.filter((record) => {
    const recordDate = new Date(record.date)
    return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear
  })

  // 获取大便记录统计
  const stoolRecords = records.filter((record) => record.type === "stool")
  const monthlyStoolRecords = stoolRecords.filter((record) => {
    const recordDate = new Date(record.date)
    return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear
  })

  // 生成日历网格
  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const current = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      const dateString = getDateString(current)
      const dayRecords = records.filter((record) => record.date === dateString)
      const hasRecords = dayRecords.length > 0

      days.push({
        date: new Date(current),
        dateString,
        isCurrentMonth: current.getMonth() === month,
        isToday: isToday(current),
        hasRecords,
        recordCount: dayRecords.length,
      })

      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const calendarDays = generateCalendarDays()

  const handleAddRecord = () => {
    router.push("/stool-record")
  }

  const handleUserManagement = () => {
    router.push("/user-management")
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">请先添加用户</p>
          <Button onClick={handleUserManagement}>添加用户</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="health-calendar">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-red-500">
              <Calendar className="h-6 w-6" />
              <h1 className="text-2xl font-bold">健康日历</h1>
            </div>
            <p className="text-muted-foreground">记录健康，管理生活</p>
          </div>
          <div className="flex items-center space-x-4">
            <UserDropdown />
            <Button onClick={handleAddRecord} className="bg-red-500 hover:bg-red-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              添加记录
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">本月记录</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyRecords.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">大便次数</CardTitle>
              <BarChart3 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyStoolRecords.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* 日历 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedDate.toLocaleDateString("zh-CN", {
                  year: "numeric",
                  month: "long",
                })}
              </CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(selectedDate)
                    newDate.setMonth(newDate.getMonth() - 1)
                    setSelectedDate(newDate)
                  }}
                >
                  上月
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                  今天
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(selectedDate)
                    newDate.setMonth(newDate.getMonth() + 1)
                    setSelectedDate(newDate)
                  }}
                >
                  下月
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>

            {/* 日历网格 */}
            <div className="calendar-grid">
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`calendar-day ${
                    day.isCurrentMonth ? "" : "text-muted-foreground opacity-50"
                  } ${day.isToday ? "today" : ""} ${day.hasRecords ? "has-record" : ""}`}
                  onClick={() => setSelectedDate(day.date)}
                >
                  <div className="text-center">
                    <div className="text-sm">{day.date.getDate()}</div>
                    {day.hasRecords && (
                      <div className="flex justify-center mt-1">
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          {day.recordCount}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 系统管理 */}
        <Card className="mb-6">
          <Collapsible open={isSystemManagementOpen} onOpenChange={setIsSystemManagementOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <CardTitle className="text-lg">系统管理</CardTitle>
                  </div>
                  <div className="text-sm text-muted-foreground">{isSystemManagementOpen ? "收起" : "展开"}</div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={handleUserManagement}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    用户管理
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* 最近记录 */}
        <Card>
          <CardHeader>
            <CardTitle>最近记录</CardTitle>
            <CardDescription>显示最近的健康记录</CardDescription>
          </CardHeader>
          <CardContent>
            {recordsLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">加载记录中...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">暂无记录</p>
                <Button onClick={handleAddRecord} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  添加第一条记录
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {records.slice(0, 5).map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">{record.type === "stool" ? "大便" : record.type}</Badge>
                      <div>
                        <p className="text-sm font-medium">{formatDate(record.date)}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.data?.bristolType && `布里斯托尔分型: ${record.data.bristolType}`}
                          {record.data?.color && ` | 颜色: ${record.data.color}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(record.createdAt)}</div>
                  </div>
                ))}
                {records.length > 5 && (
                  <div className="text-center pt-2">
                    <Button variant="ghost" size="sm">
                      查看更多记录
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
