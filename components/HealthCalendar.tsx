"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import Heart from "components/icons/Heart"
import adminService from "services/adminService"

const HealthCalendar = () => {
  const router = useRouter()
  const [userId, setUserId] = useState("")
  const [periodRecords, setPeriodRecords] = useState<any[]>([])

  useEffect(() => {
    const loadUserData = async () => {
      const userId = await adminService.getCurrentUserId()
      setUserId(userId)

      const periods = await adminService.getPeriodRecords(userId)
      setPeriodRecords(periods)
    }

    loadUserData()
  }, [])

  const handleUserChange = async (newUserId: string) => {
    setUserId(newUserId)

    const periods = await adminService.getPeriodRecords(newUserId)
    setPeriodRecords(periods)
  }

  const renderDayContent = (date: Date) => {
    // 查找当天的 period 记录
    const dayPeriodRecords = periodRecords.filter((record) => {
      const recordDate = new Date(record.dateTime)
      return recordDate.toDateString() === date.toDateString()
    })

    return (
      <div>
        {dayPeriodRecords.map((record, index) => (
          <div
            key={`period-${record.id}`}
            className="text-xs p-1 mb-1 bg-pink-100 text-pink-700 rounded cursor-pointer hover:bg-pink-200 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/period?edit=${record.id}`)
            }}
          >
            <div className="flex items-center space-x-1">
              <Heart className="w-3 h-3" />
              <span className="truncate">
                {record.status === "start" ? "开始" : record.status === "ongoing" ? "进行中" : "结束"}
              </span>
            </div>
          </div>
        ))}
        {/* 其他日历内容 */}
      </div>
    )
  }

  return (
    <div>
      {/* 用户选择部分 */}
      <button
        onClick={() => router.push("/period")}
        className="flex items-center space-x-2 px-3 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors text-sm"
      >
        <Heart className="w-4 h-4" />
        <span>生理记录</span>
      </button>
      {/* 日历渲染部分 */}
    </div>
  )
}

export default HealthCalendar
