"use client";

import React, { useState, useEffect } from 'react';
import '../../components/ui/health-calendar/calendar.css';
import UserSwitcher from '@/components/UserSwitcher';
import { useDatabase } from '@/context/DatabaseContext';
import { useHealthRecords } from '@/hooks/useHealthRecords';
// import { useMigration } from '@/hooks/useMigration';
import dbService from '@/services/db';

export default function HealthCalendarPage() {
  // State to control the modal visibility
  const [showModal, setShowModal] = useState(false);
  
  // 获取当前日期信息
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 月份从0开始，需要+1
  const currentDay = today.getDate();
  
  // 计算当月天数
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  
  // 使用数据库上下文
  const { currentUser } = useDatabase();
  // 使用健康记录钩子
  const { records, isLoading, addRecord } = useHealthRecords(currentUser?.id || null);
  
  // 使用迁移钩子
  // const { migrationComplete, migrationError } = useMigration();
  
  // 初始化数据库
  useEffect(() => {
    const initDatabase = async () => {
      try {
        await dbService.initDB();
        console.log("HealthCalendarPage: 数据库已初始化");
      } catch (error) {
        console.error("HealthCalendarPage: 数据库初始化失败", error);
      }
    };
    
    initDatabase();
  }, []);
  
  // 计算本月记录和大便次数
  const monthlyRecords = records?.length || 0;
  const bigRecords = records?.filter(record => record.type === 'stool').length || 0;
  
  // Generate calendar days
  const generateCalendarDays = () => {
    const days = [];
    const previousMonthDays = 2; // Days showing from previous month (29, 30)
    
    // Previous month days
    days.push(<td key="prev-29" className="text-gray-400">29</td>);
    days.push(<td key="prev-30" className="text-gray-400">30</td>);
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      // Check if day has events (orange dot)
      const hasEvent = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(i);
      // Check if day has badge number
      const hasBadge = [3, 7, 10, 11].includes(i);
      const badgeNumber = hasBadge ? 2 : (i === 11 ? 3 : null);
      
      // Check if current day
      const isCurrentDay = i === currentDay;
      
      days.push(
        <td key={`day-${i}`} className={`day-cell ${isCurrentDay ? 'current-day' : ''}`}>
          {i}
          {hasEvent && <div className="event-dot"></div>}
          {hasBadge && <div className="badge">{badgeNumber}</div>}
        </td>
      );
    }
    
    // Next month days (1, 2)
    days.push(<td key="next-1" className="text-gray-400">1</td>);
    days.push(<td key="next-2" className="text-gray-400">2</td>);
    
    return days;
  };
  
  // Generate rows for calendar
  const generateCalendarRows = () => {
    const days = generateCalendarDays();
    const rows = [];
    const daysPerRow = 7;
    
    for (let i = 0; i < days.length; i += daysPerRow) {
      rows.push(
        <tr key={`row-${i}`}>
          {days.slice(i, i + daysPerRow)}
        </tr>
      );
    }
    
    return rows;
  };
  
  // 处理记录数据，转换为UI显示格式
  const formatRecords = () => {
    if (isLoading || !records) {
      return [];
    }
    
    return records.slice(0, 5).map(record => {
      // 计算时间差
      const now = new Date();
      const recordTime = new Date(record.timestamp);
      const diffMs = now.getTime() - recordTime.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      let timeDisplay = '';
      if (diffMins < 60) {
        timeDisplay = `${diffMins}分钟前`;
      } else if (diffHours < 24) {
        timeDisplay = `${diffHours}小时前`;
      } else {
        timeDisplay = `${diffDays}天前`;
      }
      
      return {
        id: record.id,
        type: record.type,
        time: timeDisplay,
        meal: record.meal,
        category: record.category,
        color: record.color,
        note: record.note || ''
      };
    });
  };
  
  const recentRecords = formatRecords();
  
  // 添加记录的处理函数
  const handleAddRecord = async (typeId: string) => {
    if (!currentUser) {
      alert("请先选择用户");
      return;
    }
    
    try {
      // 创建基本记录对象
      const newRecord = {
        userId: currentUser.id,
        type: typeId,
        timestamp: Date.now(),
        note: `新${typeId}记录`
      };
      
      // 保存到数据库
      await addRecord(newRecord);
      console.log(`已添加${typeId}记录`);
      setShowModal(false);
    } catch (error) {
      console.error("添加记录失败:", error);
    }
  };
  
  // Record Type Selection Modal
  const RecordTypeModal = ({ onClose }: { onClose: () => void }) => {
    const handleAddRecord = async (typeId: string) => {
      if (!currentUser) {
        alert("请先选择用户");
        return;
      }
      
      try {
        // 创建基本记录对象
        const newRecord = {
          userId: currentUser.id,
          type: typeId,
          timestamp: Date.now(),
          note: `新${typeId}记录`
        };
        
        // 保存到数据库
        await addRecord(newRecord);
        console.log(`已添加${typeId}记录`);
        onClose();
      } catch (error) {
        console.error("添加记录失败:", error);
      }
    };
    
    const recordTypes = [
      { 
        id: 'food', 
        title: '一日三餐', 
        description: '记录每日饮食情况', 
        icon: '🍴', 
        color: 'bg-green-50',
        borderColor: 'border-green-200'
      },
      { 
        id: 'stool', 
        title: '排便记录', 
        description: '记录排便情况和健康', 
        icon: '🟠', 
        color: 'bg-amber-50',
        borderColor: 'border-amber-200' 
      },
      { 
        id: 'health', 
        title: '生理记录', 
        description: '记录生理周期和症状', 
        icon: '📈', 
        color: 'bg-red-50',
        borderColor: 'border-red-200'
      },
      { 
        id: 'note', 
        title: '我的记录', 
        description: '记录其他信息', 
        icon: '•••', 
        color: 'bg-slate-50',
        borderColor: 'border-slate-200'
      },
    ];

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">
              <span className="add-icon">+</span> 选择记录类型
            </h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          
          <div className="record-types-grid">
            {recordTypes.map(type => (
              <div 
                key={type.id} 
                className={`record-type-card ${type.color} ${type.borderColor}`}
                onClick={() => handleAddRecord(type.id)}
              >
                <div className={`record-type-icon ${type.id === 'food' ? 'food-icon' : 
                                                   type.id === 'stool' ? 'stool-icon' : 
                                                   type.id === 'health' ? 'health-icon' : 'note-icon'}`}>
                  {type.icon}
                </div>
                <div className="record-type-title">{type.title}</div>
                <div className="record-type-description">{type.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
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
        <button className="add-record-btn" onClick={() => setShowModal(true)}>
          <span className="plus-icon">+</span> 添加记录
        </button>
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
      <div className="mb-4">
        <UserSwitcher />
      </div>

      {/* Calendar Section */}
      <div className="calendar-section">
        <div className="calendar-header">
          <h2>健康日历</h2>
          <div className="calendar-filter">
            <span>{currentUser?.name || '加载中...'}</span>
            <span className="dropdown-icon">▼</span>
          </div>
        </div>
        
        <div className="calendar-navigation">
          <div className="calendar-nav-controls">
            <button className="nav-btn">〈</button>
            <div className="current-month">{currentYear}年 {currentMonth}月</div>
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
          <tbody>
            {generateCalendarRows()}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="legend">
        <div className="legend-title">说明：</div>
        <div className="legend-items">
          <div className="legend-item"><span className="dot life"></span> 生理</div>
          <div className="legend-item"><span className="dot sleep"></span> 睡眠</div>
          <div className="legend-item"><span className="dot medicine"></span> 用药</div>
          <div className="legend-item"><span className="dot note"></span> 记录</div>
          <div className="legend-item"><span className="dot food"></span> 物品</div>
          <div className="legend-item"><span className="dot health"></span> 健康</div>
          <div className="legend-item"><span className="dot mental"></span> 心情</div>
          <div className="legend-item"><span className="dot pharmacy"></span> 用药</div>
          <div className="legend-item"><span className="dot love"></span> 爱情</div>
          <div className="legend-item"><span className="dot body"></span> 体征</div>
          <div className="legend-item"><span className="dot toilet"></span> 厕所</div>
          <div className="legend-item"><span className="dot sport"></span> 运动</div>
        </div>
      </div>
      
      {/* Recent Records */}
      <div className="recent-records">
        <div className="records-header">
          <h3>最近记录</h3>
          <div className="records-count">共 {recentRecords.length} 条记录 <span className="refresh-icon">🔄</span></div>
        </div>
        
        <div className="records-list">
          {isLoading ? (
            <div className="text-center py-4">加载记录中...</div>
          ) : recentRecords.length > 0 ? (
            recentRecords.map(record => (
              <div key={record.id} className={`record-item ${record.type}`}>
                <div className="record-icon">
                  {record.type === 'medicine' && '💊'}
                  {record.type === 'note' && '❤️'}
                  {record.type === 'stool' && '📊'}
                  {record.type === 'food' && '🍴'}
                  {record.type === 'health' && '📈'}
                </div>
                <div className="record-content">
                  <div className="record-title">
                    {record.type === 'medicine' && '用药记录'}
                    {record.type === 'note' && '我的记录'}
                    {record.type === 'stool' && '排便记录'}
                    {record.type === 'food' && '饮食记录'}
                    {record.type === 'health' && '健康记录'}
                  </div>
                  <div className="record-details">
                    <span className="record-user">{currentUser?.name || '用户'}</span>
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
      
      {/* Record Type Modal */}
      {showModal && <RecordTypeModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
