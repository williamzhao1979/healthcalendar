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
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [cycleStats, setCycleStats] = useState<CycleStats>({
    averageCycle: 28,
    periodDays: 5,
    daysToNext: 3,
    ovulationDay: 14
  })

  // Mock cycle data - in a real app this would come from the database
  const generateCycleDays = (): CycleDay[] => {
    const days: CycleDay[] = []
    const today = new Date()
    const currentDay = today.getDate()
    
    // Generate calendar days for July 2025
    const daysInMonth = 31
    
    for (let i = 1; i <= daysInMonth; i++) {
      let type: DayType = 'safe'
      let phase: CyclePhase = 'follicular'
      let tooltip = '安全期'
      let flowAmount: 'heavy' | 'normal' | 'light' | undefined

      // Period days (1-5)
      if (i >= 1 && i <= 5) {
        type = 'period'
        phase = 'menstrual'
        if (i === 1) {
          flowAmount = 'heavy'
          tooltip = '月经第1天 · 重度流量'
        } else if (i <= 3) {
          flowAmount = 'normal'
          tooltip = `月经第${i}天 · 中度流量`
        } else {
          flowAmount = 'light'
          tooltip = `月经第${i}天 · 轻度流量`
        }
      }
      // Fertile period (11-17)
      else if (i >= 11 && i <= 17) {
        if (i === 14) {
          type = 'ovulation'
          phase = 'ovulation'
          tooltip = '排卵日 · 最佳受孕时机'
        } else {
          type = 'fertile'
          phase = i < 14 ? 'follicular' : 'luteal'
          tooltip = i < 14 ? '易孕期 · 受孕几率增加' : '易孕期 · 受孕几率递减'
        }
      }
      // PMS period (24-27)
      else if (i >= 24 && i <= 27) {
        type = 'pms'
        phase = 'luteal'
        tooltip = '经前期 · 可能出现PMS症状'
      }
      // Predicted next period (28-31)
      else if (i >= 28) {
        type = 'predicted'
        phase = 'menstrual'
        tooltip = `预测月经第${i - 27}天`
      }

      // Mark today
      if (i === currentDay) {
        type = 'today'
        tooltip = '排卵日 · 今天 · 最佳受孕时机'
      }

      days.push({
        date: i,
        type,
        phase,
        tooltip,
        isToday: i === currentDay,
        flowAmount
      })
    }

    return days
  }

  const [cycleDays] = useState<CycleDay[]>(generateCycleDays())

  // Initialize
  useEffect(() => {
    loadUsers()
  }, [])

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
    // TODO: Load user's cycle data from database
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-2 text-white">加载中...</p>
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
                <p className="text-sm text-gray-600 mt-1">第14天 · 排卵期</p>
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

            {/* Current Phase Indicator */}
            <div className={`mb-6 p-4 bg-gradient-to-r ${phaseInfo.gradient} rounded-2xl border ${phaseInfo.border}`}>
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
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-6">
              {/* Week Header */}
              {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-gray-500 py-3">{day}</div>
              ))}

              {/* Empty cells for proper alignment */}
              <div></div> {/* July 1st starts on Monday */}
              
              {/* Calendar Days */}
              {cycleDays.map((day) => (
                <div
                  key={day.date}
                  className={getDayClasses(day)}
                  title={day.tooltip}
                  onClick={() => {
                    console.log(`点击了第${day.date}天: ${day.tooltip}`)
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
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>第1天</span>
                    <span>第14天 (今天)</span>
                    <span>第28天</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div className="bg-gradient-to-r from-pink-500 to-orange-400 h-2 rounded-full" style={{width: '50%'}}></div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-1"></div>
                      <span className="text-gray-600">月经期</span>
                      <div className="text-gray-500">1-5天</div>
                    </div>
                    <div className="text-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-1"></div>
                      <span className="text-gray-600">卵泡期</span>
                      <div className="text-gray-500">6-13天</div>
                    </div>
                    <div className="text-center">
                      <div className="w-3 h-3 bg-orange-500 rounded-full mx-auto mb-1 ring-2 ring-orange-300"></div>
                      <span className="text-orange-600 font-semibold">排卵期</span>
                      <div className="text-orange-600">14-16天</div>
                    </div>
                    <div className="text-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mx-auto mb-1"></div>
                      <span className="text-gray-600">黄体期</span>
                      <div className="text-gray-500">17-28天</div>
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
