"use client"

import { useState, useEffect } from "react"
import "../../components/ui/health-calendar/calendar.css"
import { useDatabase } from "@/context/DatabaseContext"
import { useHealthRecords } from "@/hooks/useHealthRecords"
import dbService from "@/services/db"
import UserDropdown from "@/components/UserDropdown"
import { useRouter } from "next/navigation"

export default function HealthCalendarPage() {
  // State to control the modal visibility
  const [showModal, setShowModal] = useState(false)
  const [systemManagementExpanded, setSystemManagementExpanded] = useState(false)

  // 获取当前日期信息
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1 // 月份从0开始，需要+1
  const currentDay = today.getDate()

  // 计算当月天数
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()

  // 使用数据库上下文
  const { currentUser, users, isLoading: userLoading } = useDatabase()
  // 使用健康记录钩子
  const { records, isLoading, addRecord } = useHealthRecords(null)

  // 调试当前用户状态
  useEffect(() => {
    console.log("HealthCalendarPage - 当前用户:", currentUser?.name || "无")
    console.log("HealthCalendarPage - 用户加载状态:", userLoading)
    console.log("HealthCalendarPage - 用户列表:", users?.map(u => `${u.name}(${u.relationship})`))
  }, [currentUser, userLoading, users])

  // 手动创建默认用户的函数
  const handleCreateDefaultUser = async () => {
    try {
      console.log("手动创建默认用户...")
      await dbService.ensureDefaultUserExists()
      await dbService.initializeDefaultUsers()
      console.log("默认用户创建完成")
      // 刷新页面以重新加载用户
      window.location.reload()
    } catch (error) {
      console.error("手动创建默认用户失败:", error)
      alert("创建默认用户失败，请检查控制台")
    }
  }

  // 初始化数据库
  useEffect(() => {
    const initDatabase = async () => {
      try {
        await dbService.initDB()
        console.log("HealthCalendarPage: 数据库已初始化")
        
        // 确保默认用户"我"存在
        await dbService.ensureDefaultUserExists()
        console.log("HealthCalendarPage: 默认用户'我'检查完成")
        
        // 初始化其他默认用户
        await dbService.initializeDefaultUsers()
        console.log("HealthCalendarPage: 所有默认用户检查完成")
      } catch (error) {
        console.error("HealthCalendarPage: 数据库初始化失败", error)
      }
    }

    initDatabase()
  }, [])

  // 计算本月记录和大便次数
  const monthlyRecords = records?.length || 0
  const bigRecords = records?.filter((record) => record.type === "stool").length || 0

  // Generate calendar days
  const generateCalendarDays = () => {
    const days = []
    const previousMonthDays = 2 // Days showing from previous month (29, 30)

    // Previous month days
    days.push(
      <td key="prev-29" className="text-gray-400">
        29
      </td>,
    )
    days.push(
      <td key="prev-30" className="text-gray-400">
        30
      </td>,
    )

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      // Check if day has events (orange dot)
      const hasEvent = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(i)
      // Check if day has badge number
      const hasBadge = [3, 7, 10, 11].includes(i)
      const badgeNumber = hasBadge ? 2 : i === 11 ? 3 : null

      // Check if current day
      const isCurrentDay = i === currentDay

      days.push(
        <td key={`day-${i}`} className={`day-cell ${isCurrentDay ? "current-day" : ""}`}>
          {i}
          {hasEvent && <div className="event-dot"></div>}
          {hasBadge && <div className="badge">{badgeNumber}</div>}
        </td>,
      )
    }

    // Next month days (1, 2)
    days.push(
      <td key="next-1" className="text-gray-400">
        1
      </td>,
    )
    days.push(
      <td key="next-2" className="text-gray-400">
        2
      </td>,
    )

    return days
  }

  // Generate rows for calendar
  const generateCalendarRows = () => {
    const days = generateCalendarDays()
    const rows = []
    const daysPerRow = 7

    for (let i = 0; i < days.length; i += daysPerRow) {
      rows.push(<tr key={`row-${i}`}>{days.slice(i, i + daysPerRow)}</tr>)
    }

    return rows
  }

  // 处理记录数据，转换为UI显示格式
  const formatRecords = () => {
    if (isLoading || !records) {
      return []
    }

    return records.slice(0, 5).map((record) => {
      // 计算时间差
      const now = new Date()
      const recordTime = new Date(record.timestamp)
      const diffMs = now.getTime() - recordTime.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      let timeDisplay = ""
      if (diffMins < 60) {
        timeDisplay = `${diffMins}分钟前`
      } else if (diffHours < 24) {
        timeDisplay = `${diffHours}小时前`
      } else {
        timeDisplay = `${diffDays}天前`
      }

      return {
        id: record.id,
        type: record.type,
        time: timeDisplay,
        meal: record.meal,
        category: record.category,
        color: record.color,
        note: record.note || "",
      }
    })
  }

  const recentRecords = formatRecords()

  // 添加记录的处理函数
  const handleAddRecord = async (typeId: string) => {
    // 如果用户数据还在加载中，不执行操作
    if (userLoading) {
      console.log("用户数据加载中，请稍候...")
      return
    }

    if (!currentUser) {
      console.warn("当前没有选中的用户")
      alert("系统正在初始化用户，请稍候再试")
      return
    }

    try {
      // 创建记录时仍然记录是哪个用户添加的，但所有用户都能看到
      const newRecord = {
        userId: currentUser.id, // 记录添加者
        type: typeId,
        timestamp: Date.now(),
        note: `${currentUser.name}添加的${typeId}记录`,
      }

      // 保存到数据库
      await addRecord(newRecord)
      console.log(`已添加${typeId}记录`)
      setShowModal(false)
    } catch (error) {
      console.error("添加记录失败:", error)
    }
  }

  // Record Type Selection Modal
  const RecordTypeModal = ({ onClose }: { onClose: () => void }) => {
    const handleAddRecord = async (typeId: string) => {
      // 如果用户数据还在加载中，不执行操作
      if (userLoading) {
        console.log("用户数据加载中，请稍候...")
        return
      }

      if (!currentUser) {
        console.warn("当前没有选中的用户")
        alert("系统正在初始化用户，请稍候再试")
        return
      }

      // 如果是排便记录，跳转到专门的大便记录页面
      if (typeId === "stool") {
        onClose()
        router.push("/stool-record")
        return
      }

      try {
        // 创建基本记录对象
        const newRecord = {
          userId: currentUser.id,
          type: typeId,
          timestamp: Date.now(),
          note: `新${typeId}记录`,
        }

        // 保存到数据库
        await addRecord(newRecord)
        console.log(`已添加${typeId}记录`)
        onClose()
      } catch (error) {
        console.error("添加记录失败:", error)
      }
    }

    const recordTypes = [
      {
        id: "food",
        title: "一日三餐",
        description: "记录每日饮食情况",
        icon: "🍴",
        color: "bg-green-50",
        borderColor: "border-green-200",
      },
      {
        id: "stool",
        title: "排便记录",
        description: "记录排便情况和健康",
        icon: "🟠",
        color: "bg-amber-50",
        borderColor: "border-amber-200",
      },
      {
        id: "health",
        title: "生理记录",
        description: "记录生理周期和症状",
        icon: "📈",
        color: "bg-red-50",
        borderColor: "border-red-200",
      },
      {
        id: "note",
        title: "我的记录",
        description: "记录其他信息",
        icon: "•••",
        color: "bg-slate-50",
        borderColor: "border-slate-200",
      },
    ]

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">
              <span className="add-icon">+</span> 选择记录类型
            </h3>
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="record-types-grid">
            {recordTypes.map((type) => (
              <div
                key={type.id}
                className={`record-type-card ${type.color} ${type.borderColor}`}
                onClick={() => handleAddRecord(type.id)}
              >
                <div
                  className={`record-type-icon ${
                    type.id === "food"
                      ? "food-icon"
                      : type.id === "stool"
                        ? "stool-icon"
                        : type.id === "health"
                          ? "health-icon"
                          : "note-icon"
                  }`}
                >
                  {type.icon}
                </div>
                <div className="record-type-title">{type.title}</div>
                <div className="record-type-description">{type.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const router = useRouter()

  return (
    <div className="health-calendar-container">
      {/* Header */}
      <div className="header">
        <div className="title-section">
          <div className="heart-icon">❤️</div>
          <div className="title-content">
            <h1>健康日历</h1>
            <p>记录健康，管理生活</p>
          </div>
        </div>
        <button 
          className="add-record-btn" 
          onClick={() => setShowModal(true)}
          disabled={userLoading || !currentUser}
        >
          <span className="plus-icon">+</span> 
          {userLoading ? "加载中..." : currentUser ? "添加记录" : "初始化中..."}
        </button>
      </div>

      {/* 调试信息 - 临时显示 */}
      <div style={{ 
        position: 'fixed', 
        top: '10px', 
        right: '10px', 
        background: 'rgba(0,0,0,0.8)', 
        color: 'white', 
        padding: '10px', 
        borderRadius: '5px', 
        fontSize: '12px',
        zIndex: 9999,
        maxWidth: '300px'
      }}>
        <div>用户加载状态: {userLoading ? "加载中" : "已完成"}</div>
        <div>当前用户: {currentUser?.name || "无"}</div>
        <div>用户ID: {currentUser?.id || "无"}</div>
        <div>关系: {currentUser?.relationship || "无"}</div>
        <div>用户总数: {users?.length || 0}</div>
        {users && users.length > 0 && (
          <div>
            用户列表: {users.map(u => `${u.name}(${u.relationship})`).join(", ")}
          </div>
        )}
        {(!users || users.length === 0) && !userLoading && (
          <button 
            onClick={handleCreateDefaultUser}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              fontSize: '11px',
              marginTop: '5px',
              cursor: 'pointer'
            }}
          >
            创建默认用户
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">📅</div>
          <div className="card-content">
            <div className="card-title">本月记录</div>
            <div className="card-value">{monthlyRecords}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <div className="card-title">大便次数</div>
            <div className="card-value">{bigRecords}</div>
          </div>
        </div>
      </div>

      {/* User Switcher Component */}
      {/* Calendar Section */}
      <div className="calendar-section">
        <div className="calendar-header">
          <h2>健康日历</h2>
          <UserDropdown />
        </div>

        <div className="calendar-navigation">
          <div className="calendar-nav-controls">
            <button className="nav-btn">〈</button>
            <div className="current-month">
              {currentYear}年 {currentMonth}月
            </div>
            <button className="nav-btn">〉</button>
          </div>
          <div className="calendar-actions">
            <button className="refresh-btn">🔄</button>
            <button className="today-btn">今天</button>
          </div>
        </div>

        <table className="calendar">
          <thead>
            <tr>
              <th>日</th>
              <th>一</th>
              <th>二</th>
              <th>三</th>
              <th>四</th>
              <th>五</th>
              <th>六</th>
            </tr>
          </thead>
          <tbody>{generateCalendarRows()}</tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="legend">
        <div className="legend-title">说明：</div>
        <div className="legend-items">
          <div className="legend-item">
            <span className="dot life"></span> 生理
          </div>
          <div className="legend-item">
            <span className="dot sleep"></span> 睡眠
          </div>
          <div className="legend-item">
            <span className="dot medicine"></span> 用药
          </div>
          <div className="legend-item">
            <span className="dot note"></span> 记录
          </div>
          <div className="legend-item">
            <span className="dot food"></span> 物品
          </div>
          <div className="legend-item">
            <span className="dot health"></span> 健康
          </div>
          <div className="legend-item">
            <span className="dot mental"></span> 心情
          </div>
          <div className="legend-item">
            <span className="dot pharmacy"></span> 用药
          </div>
          <div className="legend-item">
            <span className="dot love"></span> 爱情
          </div>
          <div className="legend-item">
            <span className="dot body"></span> 体征
          </div>
          <div className="legend-item">
            <span className="dot toilet"></span> 厕所
          </div>
          <div className="legend-item">
            <span className="dot sport"></span> 运动
          </div>
        </div>
      </div>

      {/* Recent Records */}
      <div className="recent-records">
        <div className="records-header">
          <h3>最近记录</h3>
          <div className="records-count">
            共 {recentRecords.length} 条记录 <span className="refresh-icon">🔄</span>
          </div>
        </div>

        <div className="records-list">
          {isLoading ? (
            <div className="text-center py-4">加载记录中...</div>
          ) : recentRecords.length > 0 ? (
            recentRecords.map((record) => (
              <div key={record.id} className={`record-item ${record.type}`}>
                <div className="record-icon">
                  {record.type === "medicine" && "💊"}
                  {record.type === "note" && "❤️"}
                  {record.type === "stool" && "📊"}
                  {record.type === "food" && "🍴"}
                  {record.type === "health" && "📈"}
                </div>
                <div className="record-content">
                  <div className="record-title">
                    {record.type === "medicine" && "用药记录"}
                    {record.type === "note" && "我的记录"}
                    {record.type === "stool" && "排便记录"}
                    {record.type === "food" && "饮食记录"}
                    {record.type === "health" && "健康记录"}
                  </div>
                  <div className="record-details">
                    <span className="record-user">{currentUser?.name || "用户"}</span>
                    <span className="record-time">{record.time}</span>
                    {record.meal && <span className="record-meal">· {record.meal}</span>}
                    {record.category && <span className="record-category">· {record.category}</span>}
                    {record.color && <span className="record-color">· {record.color}</span>}
                    <span className="record-note">· {record.note}</span>
                  </div>
                </div>
                <div className="record-action">查看</div>
              </div>
            ))
          ) : (
            <div className="text-center py-4">暂无记录</div>
          )}
        </div>

        <button className="view-more-btn">查看更多记录</button>
      </div>

      {/* Logout Button */}
      <button className="logout-btn">退出</button>

      {/* 系统管理卡片 - 可折叠 */}
      <div className="bg-white rounded-lg p-4 mb-4">
        <button
          onClick={() => setSystemManagementExpanded(!systemManagementExpanded)}
          className="w-full flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg p-2"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
            </div>
            <span className="font-medium">系统管理</span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${systemManagementExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {systemManagementExpanded && (
          <div className="mt-3 pt-3 border-t">
            <button
              onClick={() => router.push("/user-management")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-left">用户管理</div>
                  <div className="text-sm text-gray-500 text-left">管理家庭成员和权限设置</div>
                </div>
              </div>
              <span className="text-blue-500 text-sm">进入</span>
            </button>
          </div>
        )}
      </div>

      {/* Record Type Modal */}
      {showModal && <RecordTypeModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
