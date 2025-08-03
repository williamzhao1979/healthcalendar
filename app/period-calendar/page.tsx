'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Heart,
  Droplets,
  Sun,
  Activity,
  Plus,
  ArrowLeft,
  BarChart3,
  Apple,
  Dumbbell
} from 'lucide-react'
import { userDB, User as UserType } from '../../lib/userDatabase'
import { adminService } from '@/lib/adminService'
import { HEALTH_CALENDAR_DB_VERSION } from '../../lib/dbVersion'
import { BaseRecord } from '@/type/baserecord'
import { Attachment } from '../../types/attachment'

// Period record types
type PeriodStatus = 'start' | 'ongoing' | 'end'
type FlowAmount = 'spotting' | 'light' | 'normal' | 'heavy'
type PeriodColor = 'bright-red' | 'dark-red' | 'deep-red' | 'orange-red' | 'pink'
type MoodType = 'very-sad' | 'sad' | 'neutral' | 'happy' | 'very-happy'

interface PeriodRecord extends BaseRecord {
  dateTime: string
  status: PeriodStatus
  flowAmount: FlowAmount
  color: PeriodColor
  mood: MoodType
  notes: string
  tags: string[]
  attachments: Attachment[]
}

// Period cycle types
type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal'
type DayType = 'period' | 'fertile' | 'ovulation' | 'pms' | 'predicted' | 'safe' | 'today'

interface CycleDay {
  date: number
  type: DayType
  phase: CyclePhase
  tooltip: string
  isToday?: boolean
  flowAmount?: 'heavy' | 'normal' | 'light'
}

interface CycleStats {
  averageCycle: number
  periodDays: number
  daysToNext: number
  ovulationDay: number
}

// Database class for period records
class PeriodDB {
  private dbName = 'HealthCalendarDB'
  private version = HEALTH_CALENDAR_DB_VERSION
  private db: IDBDatabase | null = null

  async ensureInitialized(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('PeriodDB IndexedDB error:', request.error)
        reject(request.error)
      }
      
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains('periodRecords')) {
          const store = db.createObjectStore('periodRecords', { keyPath: 'id' })
          store.createIndex('userId', 'userId', { unique: false })
          store.createIndex('dateTime', 'dateTime', { unique: false })
        }
      }
    })
  }

  async getAllRecordsByUser(userId: string): Promise<PeriodRecord[]> {
    await this.ensureInitialized()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['periodRecords'], 'readonly')
      const store = transaction.objectStore('periodRecords')
      const index = store.index('userId')
      const request = index.getAll(userId)

      request.onsuccess = () => {
        const records = request.result || []
        // Sort by dateTime descending
        records.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
        resolve(records)
      }

      request.onerror = () => {
        console.error('Failed to get period records:', request.error)
        reject(request.error)
      }
    })
  }
}

const periodDB = new PeriodDB()

// User switcher component
const UserSwitcher: React.FC<{
  currentUser: UserType | null
  users: UserType[]
  onUserChange: (user: UserType) => void
}> = ({ currentUser, users, onUserChange }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-2 py-1 bg-white/30 backdrop-blur-sm rounded-xl hover:bg-white/40 transition-all border border-white/20"
      >
        {currentUser && (
          <img 
            src={currentUser.avatarUrl} 
            alt="用户头像" 
            className="w-5 h-5 rounded-full ring-1 ring-white/50"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-user.jpg'
            }}
          />
        )}
        <span className="text-xs font-semibold text-gray-800">
          {currentUser?.name || '选择用户'}
        </span>
        <ChevronLeft className={`w-3 h-3 text-gray-500 transform transition-transform ${isOpen ? 'rotate-90' : '-rotate-90'}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-white/90 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg z-50">
          <div className="p-2">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  onUserChange(user)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/50 transition-colors ${
                  currentUser?.id === user.id ? 'bg-pink-100/80 text-pink-800' : 'text-gray-700'
                }`}
              >
                <img 
                  src={user.avatarUrl} 
                  alt={user.name} 
                  className="w-4 h-4 rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-user.jpg'
                  }}
                />
                <span className="text-xs font-medium">{user.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PeriodCalendarPage() {
  const router = useRouter()
  
  // State management
  const [users, setUsers] = useState<UserType[]>([])
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodRecords, setPeriodRecords] = useState<PeriodRecord[]>([])
  const [loadingPeriods, setLoadingPeriods] = useState(false)
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [cycleStats, setCycleStats] = useState<CycleStats>({
    averageCycle: 28,
    periodDays: 5,
    daysToNext: 3,
    ovulationDay: 14
  })

  // Calculate cycle data from real period records
  const calculateCycleDays = (): CycleDay[] => {
    const days: CycleDay[] = []
    const today = new Date()
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    // Get period records for the current month
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0)
    
    const monthPeriodRecords = Array.isArray(periodRecords) 
      ? periodRecords.filter(record => {
          const recordDate = new Date(record.dateTime)
          return recordDate >= monthStart && recordDate <= monthEnd
        })
      : []
    
    // Calculate cycle stats from all records
    const stats = calculateCycleStats()
    
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDayDate = new Date(year, month, i)
      const isToday = currentDayDate.toDateString() === today.toDateString()
      
      // Check if this day has a period record
      const dayRecord = monthPeriodRecords.find(record => {
        const recordDate = new Date(record.dateTime)
        return recordDate.getDate() === i
      })
      
      let type: DayType = 'safe'
      let phase: CyclePhase = 'follicular'
      let tooltip = '安全期'
      let flowAmount: 'heavy' | 'normal' | 'light' | undefined
      
      if (dayRecord) {
        // Actual period record exists
        type = 'period'
        phase = 'menstrual'
        
        // Map flow amount
        switch (dayRecord.flowAmount) {
          case 'heavy':
            flowAmount = 'heavy'
            break
          case 'normal':
            flowAmount = 'normal'
            break
          case 'light':
          case 'spotting':
            flowAmount = 'light'
            break
        }
        
        tooltip = `月经第${i}天 · ${flowAmount === 'heavy' ? '重度' : flowAmount === 'normal' ? '中度' : '轻度'}流量`
        if (dayRecord.notes) {
          tooltip += ` · ${dayRecord.notes}`
        }
      } else {
        // Calculate predicted cycle phases based on cycle stats
        const daysSinceLastPeriod = getDaysSinceLastPeriod(currentDayDate)
        
        if (daysSinceLastPeriod >= 0) {
          const cycleDay = (daysSinceLastPeriod % stats.averageCycle) + 1
          
          if (cycleDay <= stats.periodDays) {
            type = 'predicted'
            phase = 'menstrual'
            tooltip = `预测月经第${cycleDay}天`
          } else if (cycleDay >= stats.ovulationDay - 2 && cycleDay <= stats.ovulationDay + 2) {
            if (cycleDay === stats.ovulationDay) {
              type = 'ovulation'
              phase = 'ovulation'
              tooltip = '预测排卵日 · 最佳受孕时机'
            } else {
              type = 'fertile'
              phase = cycleDay < stats.ovulationDay ? 'follicular' : 'luteal'
              tooltip = '易孕期 · 受孕几率较高'
            }
          } else if (cycleDay >= stats.averageCycle - 4) {
            type = 'pms'
            phase = 'luteal'
            tooltip = '经前期 · 可能出现PMS症状'
          } else if (cycleDay <= stats.ovulationDay) {
            phase = 'follicular'
            tooltip = '卵泡期'
          } else {
            phase = 'luteal'
            tooltip = '黄体期'
          }
        }
      }
      
      if (isToday) {
        tooltip = `今天 · ${tooltip}`
      }

      days.push({
        date: i,
        type: isToday ? 'today' : type,
        phase,
        tooltip,
        isToday,
        flowAmount
      })
    }

    return days
  }

  const [cycleDays, setCycleDays] = useState<CycleDay[]>([])

  // Helper functions for cycle calculations
  const calculateCycleStats = (): CycleStats => {
    console.log('🩸 计算周期统计 - periodRecords:', periodRecords, 'isArray:', Array.isArray(periodRecords))
    
    if (!Array.isArray(periodRecords) || periodRecords.length === 0) {
      return {
        averageCycle: 28,
        periodDays: 5,
        daysToNext: 0,
        ovulationDay: 14
      }
    }

    // Group records by period start dates
    const periodStarts: Date[] = []
    const periodLengths: number[] = []
    
    if (Array.isArray(periodRecords)) {
      periodRecords.forEach(record => {
        if (record.status === 'start') {
          periodStarts.push(new Date(record.dateTime))
        }
      })
    }
    
    // Calculate cycle lengths
    const cycleLengths: number[] = []
    for (let i = 1; i < periodStarts.length; i++) {
      const daysBetween = Math.round((periodStarts[i-1].getTime() - periodStarts[i].getTime()) / (1000 * 60 * 60 * 24))
      if (daysBetween > 0 && daysBetween <= 45) { // Reasonable cycle length
        cycleLengths.push(daysBetween)
      }
    }
    
    // Calculate period lengths by grouping consecutive days
    const allPeriodDates = Array.isArray(periodRecords) 
      ? periodRecords.map(r => new Date(r.dateTime).toDateString()).sort()
      : []
    let currentStreak = 1
    for (let i = 1; i < allPeriodDates.length; i++) {
      const prevDate = new Date(allPeriodDates[i-1])
      const currDate = new Date(allPeriodDates[i])
      const daysDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff === 1) {
        currentStreak++
      } else {
        if (currentStreak > 0) periodLengths.push(currentStreak)
        currentStreak = 1
      }
    }
    if (currentStreak > 0) periodLengths.push(currentStreak)
    
    const averageCycle = cycleLengths.length > 0 ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length) : 28
    const periodDays = periodLengths.length > 0 ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length) : 5
    const ovulationDay = Math.round(averageCycle / 2)
    
    // Calculate days to next period
    const lastPeriodStart = periodStarts[0] // Most recent (sorted descending)
    const daysSinceLastPeriod = lastPeriodStart ? Math.round((new Date().getTime() - lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24)) : 0
    const daysToNext = lastPeriodStart ? Math.max(0, averageCycle - daysSinceLastPeriod) : 0
    
    return {
      averageCycle,
      periodDays,
      daysToNext,
      ovulationDay
    }
  }

  const getDaysSinceLastPeriod = (targetDate: Date): number => {
    if (!Array.isArray(periodRecords) || periodRecords.length === 0) return -1
    
    const lastPeriodRecord = periodRecords.find(record => 
      record.status === 'start' && new Date(record.dateTime) <= targetDate
    )
    
    if (!lastPeriodRecord) return -1
    
    return Math.round((targetDate.getTime() - new Date(lastPeriodRecord.dateTime).getTime()) / (1000 * 60 * 60 * 24))
  }

  // Load period records for current user
  const loadPeriodRecords = async (userId: string) => {
    if (!userId) return
    
    setLoadingPeriods(true)
    try {
      const records = await adminService.getUserRecords('periodRecords', userId)
      console.log('🩸 Period Calendar - 加载的记录:', records, typeof records)
      
      // Ensure records is always an array
      const safeRecords = Array.isArray(records) ? records : []
      setPeriodRecords(safeRecords)
      
      console.log('🩸 Period Calendar - 设置的记录数组:', safeRecords)
    } catch (error) {
      console.error('Failed to load period records:', error)
      setPeriodRecords([]) // Set empty array on error
    } finally {
      setLoadingPeriods(false)
    }
  }

  // Initialize
  useEffect(() => {
    loadUsers()
  }, [])

  // Load period records when user changes
  useEffect(() => {
    if (currentUser) {
      loadPeriodRecords(currentUser.id)
    }
  }, [currentUser])

  // Update cycle days when period records or current date changes
  useEffect(() => {
    const newCycleDays = calculateCycleDays()
    setCycleDays(newCycleDays)
    
    // Update cycle stats
    const newStats = calculateCycleStats()
    setCycleStats(newStats)
  }, [periodRecords, currentDate])

  const loadUsers = async () => {
    try {
      const allUsers = await adminService.getAllUsers()
      const defaultUser = await adminService.getDefaultUser()
        
      setUsers(allUsers)
      setCurrentUser(await adminService.getCurrentUser() || defaultUser)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load users:', error)
      setLoading(false)
    }
  }

  const handleUserChange = async (user: UserType) => {
    setCurrentUser(user)
    await loadPeriodRecords(user.id)
  }

  const handleBack = () => {
    router.push('/health-calendar')
  }

  const addRecord = () => {
    router.push('/period')
  }

  const goToHealthCalendar = () => {
    router.push('/health-calendar')
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
    // Cycle days will be recalculated in useEffect
  }

  const getCyclePhaseInfo = () => {
    const today = new Date().getDate()
    const todayData = cycleDays.find(day => day.date === today)
    
    if (todayData?.type === 'ovulation') {
      return {
        title: '排卵期',
        description: '最佳受孕时期，体温略有升高',
        icon: Sun,
        gradient: 'from-orange-50 to-yellow-50',
        iconBg: 'from-orange-400 to-yellow-500',
        border: 'border-orange-100',
        phaseClass: 'ovulation'
      }
    } else if (todayData?.type === 'period') {
      return {
        title: '月经期',
        description: '月经期间，注意休息和保暖',
        icon: Droplets,
        gradient: 'from-red-50 to-pink-50',
        iconBg: 'from-red-500 to-pink-500',
        border: 'border-red-100',
        phaseClass: 'menstrual'
      }
    } else if (todayData?.type === 'fertile') {
      return {
        title: '易孕期',
        description: '受孕几率较高的时期',
        icon: Heart,
        gradient: 'from-green-50 to-emerald-50',
        iconBg: 'from-green-500 to-emerald-500',
        border: 'border-green-100',
        phaseClass: 'follicular'
      }
    } else if (todayData?.type === 'pms') {
      return {
        title: '经前期',
        description: '可能出现经前症状，注意情绪调节',
        icon: Activity,
        gradient: 'from-purple-50 to-indigo-50',
        iconBg: 'from-purple-500 to-indigo-500',
        border: 'border-purple-100',
        phaseClass: 'luteal'
      }
    } else {
      return {
        title: '安全期',
        description: '相对安全的时期',
        icon: Heart,
        gradient: 'from-gray-50 to-slate-50',
        iconBg: 'from-gray-400 to-slate-400',
        border: 'border-gray-100',
        phaseClass: 'follicular'
      }
    }
  }

  const getDayClasses = (day: CycleDay): string => {
    const baseClasses = "cycle-day w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold transition-all cursor-pointer m-0.5 relative"
    
    switch (day.type) {
      case 'period':
        let periodClasses = "bg-gradient-to-br from-red-600 to-red-400 text-white shadow-lg"
        if (day.flowAmount === 'heavy') {
          periodClasses = "bg-gradient-to-br from-red-800 to-red-600 text-white shadow-lg"
        } else if (day.flowAmount === 'light') {
          periodClasses = "bg-gradient-to-br from-red-300 to-red-200 text-white shadow-lg"
        }
        return `${baseClasses} ${periodClasses} hover:scale-110`
      
      case 'fertile':
        return `${baseClasses} bg-gradient-to-br from-green-500 to-emerald-400 text-white shadow-lg hover:scale-110`
      
      case 'ovulation':
        return `${baseClasses} bg-gradient-to-br from-orange-500 to-yellow-400 text-white shadow-lg hover:scale-110 ring-2 ring-orange-300 animate-pulse`
      
      case 'pms':
        return `${baseClasses} bg-gradient-to-br from-purple-500 to-indigo-400 text-white shadow-lg hover:scale-110`
      
      case 'predicted':
        return `${baseClasses} bg-gradient-to-br from-red-200 to-red-100 text-red-600 border-2 border-dashed border-red-400 hover:scale-110`
      
      case 'today':
        return `${baseClasses} bg-gradient-to-br from-orange-500 to-yellow-400 text-white shadow-xl ring-4 ring-pink-300 scale-110 z-10`
      
      default:
        return `${baseClasses} bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105`
    }
  }

  const formatDate = (date: Date): string => {
    return `${date.getFullYear()}年 ${date.getMonth() + 1}月`
  }

  const getCurrentPhase = () => {
    const today = new Date().getDate()
    return cycleDays.find(day => day.date === today)?.phase || 'follicular'
  }

  if (loading || loadingPeriods) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-2 text-white">{loading ? '加载用户中...' : '加载周期数据中...'}</p>
        </div>
      </div>
    )
  }

  const phaseInfo = getCyclePhaseInfo()

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500">
      {/* Background layer */}
      <div className="fixed inset-0 bg-white/10"></div>
      
      <div className="relative min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-50 px-6 py-3 bg-white/25 backdrop-blur-md border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="w-9 h-9 bg-white/30 backdrop-blur-sm rounded-2xl hover:bg-white/40 transition-all border border-white/20 flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 text-gray-700" />
              </button>
              <div className="relative">
                <div className="w-9 h-9 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center">
                  <Heart className="text-white text-base" />
                </div>
                <div className="absolute inset-0 bg-pink-500/20 rounded-2xl animate-ping"></div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">生理周期日历</h1>
                <p className="text-xs text-gray-600 font-medium">追踪您的月经周期</p>
              </div>
            </div>
            
            {/* User Profile */}
            <UserSwitcher
              currentUser={currentUser}
              users={users}
              onUserChange={handleUserChange}
            />
          </div>
        </header>

        {/* Quick Stats */}
        <section className="px-6 py-3">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gradient-to-b from-white to-gray-50 rounded-2xl p-2.5 flex flex-col items-center text-center shadow-lg border border-white/40">
              <div className="w-7 h-7 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center flex-shrink-0 mb-1">
                <Calendar className="text-white text-xs" />
              </div>
              <div className="text-base font-bold text-gray-800 leading-tight">{cycleStats.averageCycle}</div>
              <div className="text-xs text-gray-600">平均周期</div>
            </div>
            <div className="bg-gradient-to-b from-white to-gray-50 rounded-2xl p-2.5 flex flex-col items-center text-center shadow-lg border border-white/40">
              <div className="w-7 h-7 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0 mb-1">
                <Droplets className="text-white text-xs" />
              </div>
              <div className="text-base font-bold text-gray-800 leading-tight">{cycleStats.periodDays}</div>
              <div className="text-xs text-gray-600">经期天数</div>
            </div>
            <div className="bg-gradient-to-b from-white to-gray-50 rounded-2xl p-2.5 flex flex-col items-center text-center shadow-lg border border-white/40">
              <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-yellow-400 rounded-xl flex items-center justify-center flex-shrink-0 mb-1">
                <Heart className="text-white text-xs" />
              </div>
              <div className="text-base font-bold text-gray-800 leading-tight">{cycleStats.daysToNext}</div>
              <div className="text-xs text-gray-600">距下次</div>
            </div>
            <div className="bg-gradient-to-b from-white to-gray-50 rounded-2xl p-2.5 flex flex-col items-center text-center shadow-lg border border-white/40">
              <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0 mb-1">
                <BarChart3 className="text-white text-xs" />
              </div>
              <div className="text-base font-bold text-gray-800 leading-tight">{cycleStats.ovulationDay}</div>
              <div className="text-xs text-gray-600">排卵日</div>
            </div>
          </div>
        </section>

        {/* Calendar Section */}
        <main className="px-6 pb-8">
          <div className="bg-white/25 backdrop-blur-md rounded-3xl p-6 mb-6 shadow-2xl border border-white/30">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{formatDate(currentDate)}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {(() => {
                    const today = new Date()
                    if (currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()) {
                      const daysSinceLastPeriod = getDaysSinceLastPeriod(today)
                      if (daysSinceLastPeriod >= 0) {
                        const cycleDay = (daysSinceLastPeriod % cycleStats.averageCycle) + 1
                        const phaseInfo = getCyclePhaseInfo()
                        return `第${cycleDay}天 · ${phaseInfo.title}`
                      }
                    }
                    return '查看您的周期数据'
                  })()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => navigateMonth('prev')}
                  className="p-3 rounded-2xl bg-white/30 hover:bg-white/40 transition-all backdrop-blur-sm hover:scale-105"
                >
                  <ChevronLeft className="text-gray-700 w-5 h-5" />
                </button>
                <button 
                  onClick={() => navigateMonth('next')}
                  className="p-3 rounded-2xl bg-white/30 hover:bg-white/40 transition-all backdrop-blur-sm hover:scale-105"
                >
                  <ChevronRight className="text-gray-700 w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Do not delete, will be used for future features */}
            {/* Current Phase Indicator */}
            {/* <div className={`mb-6 p-4 bg-gradient-to-r ${phaseInfo.gradient} rounded-2xl border ${phaseInfo.border}`}>
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 bg-gradient-to-r ${phaseInfo.iconBg} rounded-full flex items-center justify-center shadow-lg`}>
                  <phaseInfo.icon className="text-white text-lg" />
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-800">{phaseInfo.title}</div>
                  <div className="text-sm text-gray-600">{phaseInfo.description}</div>
                </div>
              </div>
              <div className={`mt-3 h-1 rounded-full bg-gradient-to-r phase-indicator ${phaseInfo.phaseClass}`}></div>
            </div> */}

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-6">
              {/* Week Header */}
              {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-gray-500 py-3">{day}</div>
              ))}

              {/* Empty cells for proper alignment */}
              {(() => {
                const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
                return Array.from({ length: firstDay }, (_, i) => (
                  <div key={`empty-${i}`}></div>
                ))
              })()}
              
              {/* Calendar Days */}
              {cycleDays.map((day) => (
                <div
                  key={day.date}
                  className={getDayClasses(day)}
                  title={day.tooltip}
                  onClick={() => {
                    console.log(`点击了第${day.date}天: ${day.tooltip}`)
                    // TODO: Show day details or navigate to add/edit record
                  }}
                >
                  {day.date}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-red-600 to-red-400 rounded-full shadow-sm"></div>
                  <span className="text-sm font-medium text-gray-700">月经期</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full shadow-sm"></div>
                  <span className="text-sm font-medium text-gray-700">易孕期</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-orange-400 to-yellow-500 rounded-full shadow-sm"></div>
                  <span className="text-sm font-medium text-gray-700">排卵日</span>
                </div>
              </div>
              {/* Do not delete, will be used for future features */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-purple-500 rounded-full shadow-sm"></div>
                  <span className="text-sm font-medium text-gray-700">经前期</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-300 rounded-full shadow-sm"></div>
                  <span className="text-sm font-medium text-gray-700">安全期</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-dashed border-red-400 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">预测期</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cycle Analysis */}
          <div className="bg-white/25 backdrop-blur-md rounded-3xl p-6 shadow-2xl mb-6 border border-white/30">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <BarChart3 className="text-pink-500 mr-2 w-5 h-5" />
              周期分析
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              {/* Cycle Timeline */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <h4 className="text-base font-semibold text-gray-800 mb-3">本周期进程</h4>
                <div className="relative">
                  {(() => {
                    const today = new Date()
                    const daysSinceLastPeriod = getDaysSinceLastPeriod(today)
                    const currentCycleDay = daysSinceLastPeriod >= 0 ? (daysSinceLastPeriod % cycleStats.averageCycle) + 1 : 1
                    const progressPercentage = Math.min(100, (currentCycleDay / cycleStats.averageCycle) * 100)
                    
                    return (
                      <>
                        <div className="flex justify-between text-xs text-gray-500 mb-2">
                          <span>第1天</span>
                          <span>第{currentCycleDay}天 (今天)</span>
                          <span>第{cycleStats.averageCycle}天</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div 
                            className="bg-gradient-to-r from-pink-500 to-orange-400 h-2 rounded-full transition-all duration-300" 
                            style={{width: `${progressPercentage}%`}}
                          ></div>
                        </div>
                      </>
                    )
                  })()}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-1"></div>
                      <span className="text-gray-600">月经期</span>
                      <div className="text-gray-500">1-{cycleStats.periodDays}天</div>
                    </div>
                    <div className="text-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-1"></div>
                      <span className="text-gray-600">卵泡期</span>
                      <div className="text-gray-500">{cycleStats.periodDays + 1}-{cycleStats.ovulationDay - 1}天</div>
                    </div>
                    <div className="text-center">
                      <div className={`w-3 h-3 bg-orange-500 rounded-full mx-auto mb-1 ${(() => {
                        const today = new Date()
                        const daysSinceLastPeriod = getDaysSinceLastPeriod(today)
                        const currentCycleDay = daysSinceLastPeriod >= 0 ? (daysSinceLastPeriod % cycleStats.averageCycle) + 1 : 1
                        return currentCycleDay >= cycleStats.ovulationDay - 1 && currentCycleDay <= cycleStats.ovulationDay + 1 ? 'ring-2 ring-orange-300' : ''
                      })()}`}></div>
                      <span className={`${(() => {
                        const today = new Date()
                        const daysSinceLastPeriod = getDaysSinceLastPeriod(today)
                        const currentCycleDay = daysSinceLastPeriod >= 0 ? (daysSinceLastPeriod % cycleStats.averageCycle) + 1 : 1
                        return currentCycleDay >= cycleStats.ovulationDay - 1 && currentCycleDay <= cycleStats.ovulationDay + 1 ? 'text-orange-600 font-semibold' : 'text-gray-600'
                      })()}`}>排卵期</span>
                      <div className={`${(() => {
                        const today = new Date()
                        const daysSinceLastPeriod = getDaysSinceLastPeriod(today)
                        const currentCycleDay = daysSinceLastPeriod >= 0 ? (daysSinceLastPeriod % cycleStats.averageCycle) + 1 : 1
                        return currentCycleDay >= cycleStats.ovulationDay - 1 && currentCycleDay <= cycleStats.ovulationDay + 1 ? 'text-orange-600' : 'text-gray-500'
                      })()}`}>{cycleStats.ovulationDay - 1}-{cycleStats.ovulationDay + 1}天</div>
                    </div>
                    <div className="text-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mx-auto mb-1"></div>
                      <span className="text-gray-600">黄体期</span>
                      <div className="text-gray-500">{cycleStats.ovulationDay + 2}-{cycleStats.averageCycle}天</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Health Tips */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <h4 className="text-base font-semibold text-gray-800 mb-3">健康建议</h4>
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <Heart className="text-pink-500 text-sm mt-1 w-4 h-4" />
                    <span className="text-sm text-gray-700">排卵期体温会略有升高，注意观察基础体温变化</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Apple className="text-green-500 text-sm mt-1 w-4 h-4" />
                    <span className="text-sm text-gray-700">建议多摄入富含叶酸的食物，如绿叶蔬菜和坚果</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Dumbbell className="text-blue-500 text-sm mt-1 w-4 h-4" />
                    <span className="text-sm text-gray-700">适量运动有助于缓解经前症状，避免过度剧烈运动</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={addRecord}
              className="py-3 bg-pink-500 text-white font-semibold rounded-xl hover:bg-pink-600 transition-colors shadow-lg flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>添加记录</span>
            </button>
            <button 
              onClick={goToHealthCalendar}
              className="py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>健康日历</span>
            </button>
          </div>
        </main>
      </div>

      <style jsx>{`
        .cycle-day:hover {
          transform: scale(1.1);
          z-index: 10;
        }
        
        .phase-indicator.menstrual {
          background: linear-gradient(90deg, #DC2626 0%, #EF4444 100%);
        }
        
        .phase-indicator.follicular {
          background: linear-gradient(90deg, #059669 0%, #10B981 100%);
        }
        
        .phase-indicator.ovulation {
          background: linear-gradient(90deg, #D97706 0%, #F59E0B 100%);
        }
        
        .phase-indicator.luteal {
          background: linear-gradient(90deg, #7C3AED 0%, #8B5CF6 100%);
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  )
}
