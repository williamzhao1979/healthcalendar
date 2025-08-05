'use client'

import React from 'react'
import { useTheme } from '../../hooks/useTheme'
import { Moon, Sun } from 'lucide-react'

export default function ThemeTestPage() {
  const { resolvedTheme, toggleTheme, theme } = useTheme()

  return (
    <div className="min-h-screen theme-bg-primary p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold theme-text-primary">深色模式测试页面</h1>
            <button
              onClick={toggleTheme}
              className={`flex items-center px-4 py-2 backdrop-blur-sm rounded-xl transition-all border ${
                resolvedTheme === 'dark' 
                  ? 'bg-gray-700/30 hover:bg-gray-600/40 border-gray-600/20' 
                  : 'bg-white/30 hover:bg-white/40 border-white/20'
              }`}
              title={resolvedTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-5 h-5 theme-text-primary mr-2" />
              ) : (
                <Moon className="w-5 h-5 theme-text-primary mr-2" />
              )}
              <span className="theme-text-primary">
                {resolvedTheme === 'dark' ? '浅色模式' : '深色模式'}
              </span>
            </button>
          </div>
          
          <div className="theme-text-secondary">
            <p>当前主题设置: <span className="font-semibold">{theme}</span></p>
            <p>解析后的主题: <span className="font-semibold">{resolvedTheme}</span></p>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="stat-card rounded-xl p-6">
            <h3 className="text-lg font-semibold theme-text-primary mb-3">背景颜色测试</h3>
            <p className="theme-text-secondary mb-4">
              这张卡片使用了 stat-card 类，应该根据当前主题显示不同的背景色。
            </p>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="theme-text-tertiary text-sm">状态指示器</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="theme-bg-card rounded-xl p-6 theme-border-primary border">
            <h3 className="text-lg font-semibold theme-text-primary mb-3">文本颜色测试</h3>
            <p className="theme-text-secondary mb-2">
              这是 theme-text-secondary 样式的文本。
            </p>
            <p className="theme-text-tertiary">
              这是 theme-text-tertiary 样式的文本。
            </p>
          </div>

          {/* Card 3 */}
          <div className="calendar-container rounded-xl p-6 theme-shadow-md">
            <h3 className="text-lg font-semibold theme-text-primary mb-3">日历容器测试</h3>
            <p className="theme-text-secondary mb-4">
              这个容器使用了 calendar-container 类。
            </p>
            <div className="calendar-cell p-2 rounded hover:cursor-pointer">
              <span className="theme-text-primary">可悬停的日历单元格</span>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-bold theme-text-primary mb-4">交互组件测试</h2>
          
          <div className="space-y-4">
            <div className="user-menu rounded-xl p-4">
              <h4 className="font-semibold theme-text-primary mb-2">用户菜单样式</h4>
              <p className="theme-text-secondary text-sm">
                这个区域使用了 user-menu 类，模拟用户下拉菜单的样式。
              </p>
            </div>

            <div className="modal-content rounded-xl p-4">
              <h4 className="font-semibold theme-text-primary mb-2">模态框内容样式</h4>
              <p className="theme-text-secondary text-sm">
                这个区域使用了 modal-content 类，模拟模态框的样式。
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-bold theme-text-primary mb-4">CSS变量测试</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded border theme-border-primary">
              <div className="w-full h-8 rounded mb-2" style={{backgroundColor: 'var(--bg-primary)'}}></div>
              <span className="theme-text-secondary">--bg-primary</span>
            </div>
            
            <div className="p-3 rounded border theme-border-primary">
              <div className="w-full h-8 rounded mb-2" style={{backgroundColor: 'var(--bg-secondary)'}}></div>
              <span className="theme-text-secondary">--bg-secondary</span>
            </div>
            
            <div className="p-3 rounded border theme-border-primary">
              <div className="w-full h-8 rounded mb-2" style={{backgroundColor: 'var(--bg-card)'}}></div>
              <span className="theme-text-secondary">--bg-card</span>
            </div>
            
            <div className="p-3 rounded border theme-border-primary">
              <div className="w-full h-8 rounded mb-2" style={{backgroundColor: 'var(--text-primary)'}}></div>
              <span className="theme-text-secondary">--text-primary</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}