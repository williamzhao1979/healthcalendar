'use client'

import React, { useState, useEffect } from 'react'
import { 
  Heart, 
  Utensils, 
  Sprout, 
  Folder, 
  Flower2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  Settings,
  Database,
  Download,
  Upload,
  Trash2,
  Clock,
  X,
  User,
  Camera,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { userDB, User as UserType, UserUtils } from '../lib/userDatabase'

interface HealthCalendarProps {}

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onAddUser: (userName: string, avatarUrl: string) => void
}

// AddUserModal Component
const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onAddUser }) => {
  const [userName, setUserName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('')
  
  const avatarOptions = [
    'https://images.unsplash.com/photo-1494790108755-2616b2e4d93d?w=80&h=80&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=80&h=80&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=80&h=80&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face'
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userName.trim()) {
      onAddUser(userName.trim(), selectedAvatar || avatarOptions[0])
      setUserName('')
      setSelectedAvatar('')
    }
  }

  const handleClose = () => {
    setUserName('')
    setSelectedAvatar('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={handleClose}></div>
      
      {/* Modal Content */}
      <div className="relative flex items-center justify-center min-h-screen p-6 w-full">
        <div className="glass-morphism rounded-3xl p-6 w-full max-w-md transform transition-all scale-100 opacity-100">
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
              <Users className="text-health-primary mr-2" />
              添加新用户
            </h3>
            <button onClick={handleClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <X className="text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Name Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">用户名称</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="请输入用户名称"
                  className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-health-primary/20 focus:border-health-primary transition-all"
                  required
                />
              </div>
            </div>

            {/* Avatar Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center">
                <Camera className="w-4 h-4 mr-2" />
                选择头像
              </label>
              <div className="grid grid-cols-3 gap-3">
                {avatarOptions.map((avatar, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`relative w-20 h-20 rounded-2xl overflow-hidden transition-all ${
                      selectedAvatar === avatar || (!selectedAvatar && index === 0)
                        ? 'ring-4 ring-health-primary ring-offset-2 scale-105'
                        : 'ring-2 ring-gray-200 hover:ring-health-primary/50 hover:scale-102'
                    }`}
                  >
                    <img 
                      src={avatar} 
                      alt={`头像选项 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 text-gray-600 font-medium hover:text-gray-800 transition-colors bg-gray-100 hover:bg-gray-200 rounded-2xl"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!userName.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-health-primary to-health-accent text-white font-semibold rounded-2xl hover:from-health-secondary hover:to-health-primary transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                添加用户
              </button>
            </div>
          </form>

          {/* Tips */}
          <div className="mt-4 p-3 bg-blue-50 rounded-2xl">
            <p className="text-xs text-blue-600">
              💡 提示：添加的用户将可以独立记录和管理自己的健康数据
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const HealthCalendar: React.FC<HealthCalendarProps> = () => {
  const [activeTab, setActiveTab] = useState('recent')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [users, setUsers] = useState<UserType[]>([])
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 初始化用户数据
    initializeUsers()
    
    // 点击外部关闭下拉菜单
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.user-menu-container')) {
        setIsUserMenuOpen(false)
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    
    // Animate calendar cells on load
    const calendarCells = document.querySelectorAll('.calendar-cell')
    calendarCells.forEach((cell, index) => {
      const element = cell as HTMLElement
      element.style.animationDelay = `${index * 0.02}s`
      element.classList.add('animate-fade-in')
    })

    // Animate record cards
    const recordCards = document.querySelectorAll('.record-card')
    recordCards.forEach((card, index) => {
      const element = card as HTMLElement
      element.style.animationDelay = `${0.1 + index * 0.1}s`
      element.classList.add('animate-slide-up')
    })
    
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  const initializeUsers = async () => {
    try {
      setIsLoading(true)
      
      // 首先确保数据库完全初始化
      await userDB.ensureInitialized()
      
      // 初始化默认用户（如果没有用户）
      const defaultUser = await userDB.initializeDefaultUser()
      // 获取所有用户
      const allUsers = await userDB.getAllUsers()
      // 获取当前当前用户
      const activeUser = await userDB.getActiveUser()
      
      setUsers(allUsers)
      setCurrentUser(activeUser || defaultUser)
    } catch (error) {
      console.error('初始化用户数据失败:', error)
      
      // 如果是数据库访问错误，尝试清理并重试
      if (error instanceof Error && error.message.includes('object stores')) {
        console.log('尝试重置数据库并重试...')
        try {
          // 删除旧数据库
          const deleteRequest = indexedDB.deleteDatabase('HealthCalendarDB')
          deleteRequest.onsuccess = async () => {
            console.log('数据库已重置，正在重新初始化...')
            // 重新初始化
            await userDB.ensureInitialized()
            const defaultUser = await userDB.initializeDefaultUser()
            const allUsers = await userDB.getAllUsers()
            const activeUser = await userDB.getActiveUser()
            
            setUsers(allUsers)
            setCurrentUser(activeUser || defaultUser)
          }
        } catch (retryError) {
          console.error('重试失败:', retryError)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUsers = async () => {
    try {
      const allUsers = await userDB.getAllUsers()
      const activeUser = await userDB.getActiveUser()
      setUsers(allUsers)
      setCurrentUser(activeUser)
    } catch (error) {
      console.error('刷新用户数据失败:', error)
    }
  }

  const openRecordModal = () => {
    setIsModalOpen(true)
  }

  const closeRecordModal = () => {
    setIsModalOpen(false)
  }

  const selectRecordType = (type: string) => {
    closeRecordModal()
    
    switch(type) {
      case 'meals':
        console.log('选择了一日三餐记录')
        window.location.href = 'meal_page.html'
        break
      case 'stool':
        console.log('选择了排便记录')
        window.location.href = 'stool_page.html'
        break
      case 'period':
        console.log('选择了生理记录')
        window.location.href = 'period_page.html'
        break
      case 'myrecord':
        console.log('选择了我的记录')
        window.location.href = 'myrecord_page.html'
        break
    }
  }

  const goToPrivacyCalendar = () => {
    console.log('跳转到隐私日历')
    window.location.href = 'period_calendar.html'
  }

  const switchTab = (tabName: string) => {
    setActiveTab(tabName)
  }

  // Settings Functions
  const addUser = () => {
    setIsAddUserModalOpen(true)
  }

  const closeAddUserModal = () => {
    setIsAddUserModalOpen(false)
  }

  const handleAddUser = async (userName: string, avatarUrl: string) => {
    try {
      // 验证用户名
      if (!UserUtils.isValidUserName(userName)) {
        alert('用户名长度应在1-20个字符之间')
        return
      }

      // 检查用户名是否已存在
      const existingUsers = await userDB.getAllUsers()
      const nameExists = existingUsers.some(user => user.name.toLowerCase() === userName.toLowerCase())
      
      if (nameExists) {
        alert('用户名已存在，请选择其他名称')
        return
      }

      // 添加新用户
      const newUser = await userDB.addUser({
        name: userName,
        avatarUrl,
        isActive: false // 新用户默认不激活
      })

      console.log('新用户已添加:', newUser)
      alert(`用户 "${userName}" 已成功添加！`)
      
      // 刷新用户列表
      await refreshUsers()
      closeAddUserModal()
    } catch (error) {
      console.error('添加用户失败:', error)
      alert('添加用户失败，请重试')
    }
  }

  const switchUser = async (userId: string) => {
    try {
      await userDB.setActiveUser(userId)
      await refreshUsers()
      console.log('已切换用户:', userId)
    } catch (error) {
      console.error('切换用户失败:', error)
      alert('切换用户失败，请重试')
    }
  }

  const deleteUser = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId)
      if (!user) return

      if (users.length <= 1) {
        alert('至少需要保留一个用户')
        return
      }

      if (confirm(`确定要删除用户 "${user.name}" 吗？此操作不可恢复！`)) {
        await userDB.deleteUser(userId)
        
        // 如果删除的是当前当前用户，则激活第一个剩余用户
        if (user.isActive) {
          const remainingUsers = await userDB.getAllUsers()
          if (remainingUsers.length > 0) {
            await userDB.setActiveUser(remainingUsers[0].id)
          }
        }
        
        await refreshUsers()
        console.log('用户已删除:', userId)
      }
    } catch (error) {
      console.error('删除用户失败:', error)
      alert('删除用户失败，请重试')
    }
  }

  const exportData = () => {
    alert('正在导出数据...')
  }

  const importData = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.csv'
    input.onchange = function(e) {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        alert('正在导入文件: ' + file.name)
      }
    }
    input.click()
  }

  const clearData = () => {
    if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
      alert('数据已清除！')
    }
  }

  return (
    <div className="overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 hero-gradient"></div>
      <div className="fixed inset-0 bg-white/10"></div>
      
      <div className="relative min-h-screen">
        {/* Header */}
        <header className="glass-morphism sticky top-0 z-50 px-6 py-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-9 h-9 health-icon primary rounded-2xl flex items-center justify-center">
                  <Heart className="text-white text-base" />
                </div>
                <div className="absolute inset-0 pulse-ring bg-green-500 bg-opacity-20 rounded-2xl"></div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">健康日历</h1>
                <p className="text-xs text-gray-600 font-medium">生活离不开吃喝拉撒</p>
              </div>
            </div>
            
            {/* User Profile */}
            <div className="flex items-center">
              <div className="relative user-menu-container">
                {currentUser && !isLoading && (
                  <div className="relative">
                    {/* User Button */}
                    <button 
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-white/30 backdrop-blur-sm rounded-xl hover:bg-white/40 transition-all border border-white/20"
                    >
                      <img src={currentUser.avatarUrl} 
                           alt="用户头像" className="w-6 h-6 rounded-full ring-2 ring-white/50" />
                      <span className="text-sm font-semibold text-gray-800">{currentUser.name}</span>
                      <ChevronLeft className={`text-gray-500 text-xs transition-transform ${isUserMenuOpen ? 'rotate-180' : 'rotate-90'}`} />
                    </button>

                    {/* User Dropdown Menu */}
                    {isUserMenuOpen && (
                      <div className="absolute top-full right-0 mt-2 w-64 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 z-50 p-2">
                        {/* Current User Section */}
                        <div className="px-3 py-2 border-b border-gray-100 mb-2">
                          <div className="flex items-center space-x-3">
                            <img src={currentUser.avatarUrl} 
                                 alt={currentUser.name} 
                                 className="w-8 h-8 rounded-full ring-2 ring-health-primary/30" />
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{currentUser.name}</div>
                              <div className="text-xs text-health-primary flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                当前用户
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Other Users */}
                        <div className="max-h-40 overflow-y-auto">
                          {users.filter(user => !user.isActive).map((user) => (
                            <button
                              key={user.id}
                              onClick={() => {
                                switchUser(user.id)
                                setIsUserMenuOpen(false)
                              }}
                              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-health-primary/10 transition-colors text-left"
                            >
                              <img src={user.avatarUrl} 
                                   alt={user.name} 
                                   className="w-8 h-8 rounded-full ring-2 ring-gray-200" />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {isLoading && (
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/30 backdrop-blur-sm rounded-xl border border-white/20">
                    <div className="w-6 h-6 rounded-full bg-gray-300 animate-pulse"></div>
                    <div className="w-12 h-4 bg-gray-300 rounded animate-pulse"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Quick Stats */}
        <section className="px-6 py-3 animate-slide-up">
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card rounded-2xl p-2.5 flex items-center space-x-2">
              <div className="health-icon warm w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0">
                <Utensils className="text-white text-xs" />
              </div>
              <div className="text-left">
                <div className="text-base font-bold text-gray-800 leading-tight">3</div>
                <div className="text-xs text-gray-600">今日饮食</div>
              </div>
            </div>
            <div className="stat-card rounded-2xl p-2.5 flex items-center space-x-2">
              <div className="health-icon primary w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sprout className="text-white text-xs" />
              </div>
              <div className="text-left">
                <div className="text-base font-bold text-gray-800 leading-tight">2</div>
                <div className="text-xs text-gray-600">排便记录</div>
              </div>
            </div>
            <div className="stat-card rounded-2xl p-2.5 flex items-center space-x-2">
              <div className="health-icon soft w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0">
                <Folder className="text-white text-xs" />
              </div>
              <div className="text-left">
                <div className="text-base font-bold text-gray-800 leading-tight">1</div>
                <div className="text-xs text-gray-600">我的记录</div>
              </div>
            </div>
          </div>
        </section>

        {/* Calendar Section */}
        <main className="px-6 pb-8">
          <div className="glass-morphism rounded-3xl p-6 mb-6 animate-fade-in shadow-2xl">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">2025年 7月</h2>
                  <p className="text-sm text-gray-600 mt-1">健康记录概览</p>
                </div>
                <button onClick={goToPrivacyCalendar} className="p-3 rounded-2xl bg-white/30 hover:bg-white/40 transition-all backdrop-blur-sm health-icon privacy">
                  <Flower2 className="text-white text-sm" />
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-3 rounded-2xl bg-white/30 hover:bg-white/40 transition-all backdrop-blur-sm">
                  <ChevronLeft className="text-gray-700" />
                </button>
                <button className="p-3 rounded-2xl bg-white/30 hover:bg-white/40 transition-all backdrop-blur-sm">
                  <ChevronRight className="text-gray-700" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {/* Week Header */}
              {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
                <div key={index} className="text-center text-sm font-semibold text-gray-500 py-3">{day}</div>
              ))}

              {/* Calendar Days */}
              {Array.from({ length: 35 }, (_, i) => {
                const day = i - 1 // Adjust for starting on Sunday
                const isToday = day === 14
                const isCurrentMonth = day >= 1 && day <= 31
                const displayDay = day < 1 ? 30 + day : day > 31 ? day - 31 : day
                
                return (
                  <div key={i} className={`calendar-cell h-14 flex flex-col items-center justify-center rounded-2xl cursor-pointer ${isToday ? 'today text-white' : ''}`}>
                    <span className={`text-sm font-${isToday ? 'bold' : 'semibold'} ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-800'}`}>
                      {displayDay}
                    </span>
                    {/* Sample dots for some dates */}
                    {(day === 2 || day === 3 || day === 6 || day === 8 || day === 10 || day === 12 || day === 14 || day === 17) && (
                      <div className="flex mt-1">
                        {day === 3 || day === 10 || day === 14 ? (
                          <>
                            <div className="calendar-dot bg-gradient-to-r from-orange-400 to-yellow-500"></div>
                            <div className="calendar-dot bg-gradient-to-r from-green-400 to-emerald-500"></div>
                            {day === 3 || day === 10 ? (
                              <div className="calendar-dot bg-gradient-to-r from-pink-400 to-purple-500"></div>
                            ) : null}
                          </>
                        ) : day === 2 || day === 6 ? (
                          <>
                            <div className="calendar-dot bg-gradient-to-r from-orange-400 to-yellow-500"></div>
                            <div className="calendar-dot bg-gradient-to-r from-green-400 to-emerald-500"></div>
                          </>
                        ) : (
                          <div className={`calendar-dot bg-gradient-to-r ${isToday ? 'from-white to-white' : 'from-orange-400 to-yellow-500'}`}></div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 pt-4 border-t border-white/20">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gradient-to-r from-orange-400 to-yellow-500 rounded-full shadow-sm"></div>
                <span className="text-sm font-medium text-gray-700">饮食记录</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full shadow-sm"></div>
                <span className="text-sm font-medium text-gray-700">排便记录</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full shadow-sm"></div>
                <span className="text-sm font-medium text-gray-700">我的记录</span>
              </div>
            </div>
          </div>

          {/* Recent Records */}
          <div className="glass-morphism rounded-3xl p-6 shadow-2xl animate-fade-in">
            {/* Tab Navigation */}
            <div className="flex items-center mb-6 bg-gray-50 rounded-2xl p-1">
              <button 
                onClick={() => switchTab('recent')} 
                className={`flex-1 px-4 py-2 text-sm font-semibold transition-all rounded-xl ${activeTab === 'recent' ? 'text-health-primary bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                最近记录
              </button>
              <button 
                onClick={() => switchTab('updates')} 
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'updates' ? 'text-health-primary bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                最近更新
              </button>
              <button 
                onClick={() => switchTab('settings')} 
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'settings' ? 'text-health-primary bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                设置
              </button>
            </div>
            
            {/* Tab Content */}
            <div id="tabContent">
              {/* Recent Records Tab - Timeline Layout */}
              {activeTab === 'recent' && (
                <div className="tab-content">
                  <div className="timeline-container">
                    <div className="timeline-line"></div>
                    
                    {/* Today's records */}
                    <div className="timeline-date">今天, 2025年7月20日</div>
                    
                    {/* Breakfast record */}
                    <div className="timeline-item">
                      <div className="timeline-time">08:30</div>
                      <div className="record-card rounded-2xl p-4 shadow-sm">
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Utensils className="text-orange-500" />
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between items-start">
                              <div className="text-base font-semibold text-gray-900">早餐记录</div>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">全麦面包 + 鸡蛋 + 牛奶</div>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded-md">食量: 适中</span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-md">有附件</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bowel record */}
                    <div className="timeline-item">
                      <div className="timeline-time">09:15</div>
                      <div className="record-card rounded-2xl p-4 shadow-sm">
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Sprout className="text-green-500" />
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between items-start">
                              <div className="text-base font-semibold text-gray-900">排便记录</div>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">正常，颜色健康</div>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-md">状态: 良好</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Lunch record */}
                    <div className="timeline-item">
                      <div className="timeline-time">12:30</div>
                      <div className="record-card rounded-2xl p-4 shadow-sm">
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Utensils className="text-orange-500" />
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between items-start">
                              <div className="text-base font-semibold text-gray-900">午餐记录</div>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">米饭 + 青菜 + 鸡肉</div>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded-md">食量: 适中</span>
                              <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-md">心情不错</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Yesterday's records */}
                    <div className="timeline-date past-date">昨天, 2025年7月19日</div>
                    
                    {/* Dinner record */}
                    <div className="timeline-item past-item">
                      <div className="timeline-time">19:45</div>
                      <div className="record-card rounded-2xl p-4 shadow-sm">
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Utensils className="text-orange-500" />
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between items-start">
                              <div className="text-base font-semibold text-gray-900">晚餐记录</div>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">蔬菜沙拉 + 鸡胸肉</div>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded-md">食量: 较少</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* July 18th records */}
                    <div className="timeline-date past-date">2025年7月18日</div>
                    
                    {/* Personal record */}
                    <div className="timeline-item past-item">
                      <div className="timeline-time">22:30</div>
                      <div className="record-card rounded-2xl p-4 shadow-sm">
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Folder className="text-purple-500" />
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between items-start">
                              <div className="text-base font-semibold text-gray-900">我的记录</div>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">今日步数 7,200 步</div>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-md">运动量: 一般</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* July 10th records */}
                    <div className="timeline-date past-date">2025年7月10日</div>
                    
                    {/* Physical record */}
                    <div className="timeline-item past-item">
                      <div className="timeline-time">20:30</div>
                      <div className="record-card rounded-2xl p-4 shadow-sm">
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Heart className="text-pink-500" />
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between items-start">
                              <div className="text-base font-semibold text-gray-900">生理记录</div>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">体温 36.5°C，血压正常</div>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-md">状态: 正常</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Updates Tab */}
              {activeTab === 'updates' && (
                <div className="tab-content">
                  <div className="space-y-4">
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Clock className="text-gray-400 text-xl" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">最近更新</h3>
                      <p className="text-sm text-gray-500">暂无更新内容</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="tab-content">
                  <div className="space-y-4">
                    {/* User Management Section */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                        <Users className="text-health-primary mr-2" />
                        用户管理
                        {users.length > 0 && (
                          <span className="ml-2 text-xs bg-health-primary/10 text-health-primary px-2 py-1 rounded-full">
                            {users.length}个用户
                          </span>
                        )}
                      </h4>
                      <div className="space-y-3">
                        {isLoading ? (
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-gray-300 animate-pulse"></div>
                              <div className="space-y-1">
                                <div className="w-16 h-4 bg-gray-300 rounded animate-pulse"></div>
                                <div className="w-12 h-3 bg-gray-300 rounded animate-pulse"></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* User List */}
                            {users.map((user) => (
                              <div key={user.id} className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                                user.isActive ? 'bg-health-primary/5 border border-health-primary/20' : 'bg-gray-50 hover:bg-gray-100'
                              }`}>
                                <div className="flex items-center space-x-3">
                                  <img src={user.avatarUrl} 
                                       alt={user.name} className={`w-10 h-10 rounded-full ring-2 ${
                                         user.isActive ? 'ring-health-primary/40' : 'ring-gray-200'
                                       }`} />
                                  <div>
                                    <div className="text-sm font-semibold text-gray-900 flex items-center">
                                      {user.name}
                                      {user.isActive && (
                                        <CheckCircle className="w-3 h-3 text-health-primary ml-1" />
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {user.isActive ? '当前用户' : `创建于 ${UserUtils.formatCreatedTime(new Date(user.createdAt))}`}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {!user.isActive && (
                                    <button
                                      onClick={() => switchUser(user.id)}
                                      className="px-2 py-1 text-xs text-health-primary hover:bg-health-primary/10 rounded-md transition-colors"
                                    >
                                      切换
                                    </button>
                                  )}
                                  {user.isActive && (
                                    <span className="px-2 py-1 bg-health-primary/10 text-health-primary text-xs rounded-md">
                                      当前
                                    </span>
                                  )}
                                  {users.length > 1 && user.id !== 'user_self' && (
                                    <button
                                      onClick={() => deleteUser(user.id)}
                                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="删除用户"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                        
                        {/* Add User Button */}
                        <button onClick={addUser} className="w-full flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-health-primary hover:bg-health-primary/5 transition-colors">
                          <Plus className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-600">添加新用户</span>
                        </button>
                      </div>
                    </div>

                    {/* General Settings */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                        <Settings className="text-health-primary mr-2" />
                        常规设置
                      </h4>
                      <div className="space-y-3">
                        {/* Notification Settings */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">推送通知</div>
                            <div className="text-xs text-gray-500">接收记录提醒通知</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-health-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-health-primary"></div>
                          </label>
                        </div>

                        {/* Auto Backup */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">自动备份</div>
                            <div className="text-xs text-gray-500">自动备份健康数据</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-health-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-health-primary"></div>
                          </label>
                        </div>

                        {/* Dark Mode */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">深色模式</div>
                            <div className="text-xs text-gray-500">使用深色主题</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-health-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-health-primary"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Data Management */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                        <Database className="text-health-primary mr-2" />
                        数据管理
                      </h4>
                      <div className="space-y-3">
                        <button onClick={exportData} className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-3">
                            <Download className="text-blue-500" />
                            <div className="text-left">
                              <div className="text-sm font-medium text-gray-900">导出数据</div>
                              <div className="text-xs text-gray-500">导出所有健康记录</div>
                            </div>
                          </div>
                          <ChevronRight className="text-gray-400" />
                        </button>

                        <button onClick={importData} className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-3">
                            <Upload className="text-green-500" />
                            <div className="text-left">
                              <div className="text-sm font-medium text-gray-900">导入数据</div>
                              <div className="text-xs text-gray-500">从文件导入健康数据</div>
                            </div>
                          </div>
                          <ChevronRight className="text-gray-400" />
                        </button>

                        <button onClick={clearData} className="w-full flex items-center justify-between p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                          <div className="flex items-center space-x-3">
                            <Trash2 className="text-red-500" />
                            <div className="text-left">
                              <div className="text-sm font-medium text-red-700">清除数据</div>
                              <div className="text-xs text-red-500">删除所有健康记录</div>
                            </div>
                          </div>
                          <ChevronRight className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Floating Action Button */}
        <div className="fixed bottom-8 right-6 z-40">
          <button onClick={openRecordModal} className="floating-action-btn w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl">
            <Plus className="text-white text-xl" />
          </button>
        </div>

        {/* Record Type Selection Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={closeRecordModal}></div>
            
            {/* Modal Content */}
            <div className="relative flex items-center justify-center min-h-screen p-6 w-full">
              <div className={`glass-morphism rounded-3xl p-6 w-full max-w-sm transform transition-all ${isModalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800">选择记录类型</h3>
                  <button onClick={closeRecordModal} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                    <X className="text-gray-500" />
                  </button>
                </div>

                {/* Record Type Options */}
                <div className="space-y-3">
                  {/* 一日三餐 */}
                  <button onClick={() => selectRecordType('meals')} className="w-full record-type-option flex items-center space-x-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all hover:scale-105">
                    <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                      <Utensils className="text-orange-500 text-lg" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-base font-semibold text-gray-900">一日三餐</div>
                      <div className="text-sm text-gray-500">记录早餐、午餐、晚餐</div>
                    </div>
                    <ChevronRight className="text-gray-400" />
                  </button>

                  {/* 排便记录 */}
                  <button onClick={() => selectRecordType('stool')} className="w-full record-type-option flex items-center space-x-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all hover:scale-105">
                    <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                      <Sprout className="text-green-500 text-lg" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-base font-semibold text-gray-900">排便记录</div>
                      <div className="text-sm text-gray-500">记录排便状态和健康</div>
                    </div>
                    <ChevronRight className="text-gray-400" />
                  </button>

                  {/* 生理记录 */}
                  <button onClick={() => selectRecordType('period')} className="w-full record-type-option flex items-center space-x-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all hover:scale-105">
                    <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center">
                      <Heart className="text-pink-500 text-lg" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-base font-semibold text-gray-900">生理记录</div>
                      <div className="text-sm text-gray-500">记录生理日期和状态</div>
                    </div>
                    <ChevronRight className="text-gray-400" />
                  </button>

                  {/* 我的记录 */}
                  <button onClick={() => selectRecordType('myrecord')} className="w-full record-type-option flex items-center space-x-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all hover:scale-105">
                    <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                      <Folder className="text-purple-500 text-lg" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-base font-semibold text-gray-900">我的记录</div>
                      <div className="text-sm text-gray-500">记录步数、运动等个人数据</div>
                    </div>
                    <ChevronRight className="text-gray-400" />
                  </button>
                </div>

                {/* Cancel Button */}
                <button onClick={closeRecordModal} className="w-full mt-6 py-3 text-gray-600 font-medium hover:text-gray-800 transition-colors">
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {isAddUserModalOpen && (
          <AddUserModal 
            isOpen={isAddUserModalOpen}
            onClose={closeAddUserModal}
            onAddUser={handleAddUser}
          />
        )}
      </div>
      
      <style jsx>{`
        :root {
          --health-primary: #10B981;
          --health-secondary: #059669;
          --health-accent: #34D399;
          --health-warm: #F59E0B;
          --health-cool: #3B82F6;
          --health-soft: #8B5CF6;
        }
        
        .glass-morphism {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        }
        
        .calendar-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin: 0 1px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        
        .calendar-cell {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        
        .calendar-cell:hover {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.1) 100%);
          transform: scale(1.05);
        }
        
        .calendar-cell.today {
          background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
        }
        
        .record-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid rgba(226, 232, 240, 0.8);
        }
        
        .record-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border-color: rgba(16, 185, 129, 0.2);
        }
        
        .floating-action-btn {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .floating-action-btn:hover {
          transform: scale(1.1) rotate(90deg);
          box-shadow: 0 15px 35px rgba(16, 185, 129, 0.4);
        }
        
        .hero-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #667eea 50%, #f093fb 75%, #f5576c 100%);
          background-size: 300% 300%;
          animation: gradient 15s ease infinite;
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .stat-card {
          background: linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%);
          border: 1px solid rgba(226, 232, 240, 0.6);
          transition: all 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .health-icon {
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .health-icon.primary {
          background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
        }
        
        .health-icon.warm {
          background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%);
        }
        
        .health-icon.soft {
          background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%);
        }
        
        .health-icon.privacy {
          background: linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%);
        }
        
        .pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
        }
        
        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          80%, 100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
        
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideUp {
          0% { transform: translateY(100px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        .text-health-primary {
          color: #10B981;
        }
        
        .record-type-option {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .record-type-option:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .record-type-option:active {
          transform: translateY(0) scale(0.98);
        }
        
        /* Timeline Styles */
        .timeline-container {
          position: relative;
          padding-left: 1.5rem;
        }
        
        .timeline-line {
          position: absolute;
          left: 1.75rem;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(to bottom, 
            rgba(16, 185, 129, 0.3) 0%, 
            rgba(16, 185, 129, 0.15) 100%);
        }
        
        .timeline-date {
          position: relative;
          margin-bottom: 1rem;
          padding-left: 2.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--health-primary);
        }
        
        .timeline-date::before {
          content: '';
          position: absolute;
          left: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1.25rem;
          height: 1.25rem;
          border-radius: 50%;
          background-color: var(--health-primary);
          border: 3px solid white;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }
        
        .timeline-date.past-date {
          color: #6b7280;
        }
        
        .timeline-date.past-date::before {
          background-color: #d1d5db;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .timeline-item {
          position: relative;
          margin-bottom: 1.5rem;
          padding-left: 2.5rem;
        }
        
        .timeline-item::before {
          content: '';
          position: absolute;
          left: 1.25rem;
          top: 1.5rem;
          width: 0.75rem;
          height: 0.75rem;
          border-radius: 50%;
          background-color: var(--health-accent);
          border: 2px solid white;
          z-index: 10;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
        }
        
        .timeline-item.past-item::before {
          background-color: #9ca3af;
        }
        
        .timeline-time {
          position: absolute;
          left: -0.5rem;
          top: 1.5rem;
          background: white;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--health-secondary);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
          z-index: 10;
        }
        
        .timeline-item.past-item .timeline-time {
          color: #6b7280;
        }
      `}</style>
    </div>
  )
}

export default HealthCalendar
