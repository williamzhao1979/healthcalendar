'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Heart, AlertCircle, CheckCircle } from 'lucide-react';

export default function BasicTestPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasBasicFeatures, setHasBasicFeatures] = useState(false);
  const [features, setFeatures] = useState({
    localStorage: false,
    indexedDB: false,
    dateAPI: false,
    browserSupport: false
  });

  useEffect(() => {
    // 检查基本浏览器功能
    const checkFeatures = () => {
      const checks = {
        localStorage: !!window.localStorage,
        indexedDB: !!window.indexedDB,
        dateAPI: !!(Date && Date.now),
        browserSupport: true // 如果能运行到这里，说明基本支持React
      };
      
      setFeatures(checks);
      setHasBasicFeatures(Object.values(checks).every(Boolean));
      setIsLoaded(true);
    };

    checkFeatures();
  }, []);

  const currentDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 标题栏 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">健康日历</h1>
              <p className="text-gray-600">基础功能测试页面</p>
            </div>
          </div>
        </div>

        {/* 功能状态检查 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            {hasBasicFeatures ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-500" />
            )}
            <h2 className="text-xl font-semibold text-gray-900">
              浏览器兼容性检查
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(features).map(([feature, supported]) => (
              <div key={feature} className="text-center">
                <div className={`w-12 h-12 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                  supported ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {supported ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {feature === 'localStorage' && '本地存储'}
                  {feature === 'indexedDB' && '数据库'}
                  {feature === 'dateAPI' && '日期API'}
                  {feature === 'browserSupport' && '浏览器支持'}
                </p>
                <p className={`text-xs ${supported ? 'text-green-600' : 'text-red-600'}`}>
                  {supported ? '支持' : '不支持'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 基本日历显示 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">今日概览</h2>
          </div>
          
          <div className="text-center py-8">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {currentDate}
            </div>
            <p className="text-gray-600">
              基本日历功能正常工作
            </p>
          </div>
        </div>

        {/* 模拟健康记录卡片 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {[
            { title: '便便记录', icon: '💩', color: 'bg-yellow-500', count: 0 },
            { title: '饮食记录', icon: '🍎', color: 'bg-green-500', count: 0 },
            { title: '个人记录', icon: '📝', color: 'bg-blue-500', count: 0 }
          ].map((item, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center text-white text-xl`}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600">今日记录: {item.count}</p>
                </div>
              </div>
              <button className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                添加记录
              </button>
            </div>
          ))}
        </div>

        {/* 设备信息 */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">设备信息</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">用户代理:</span>
              <p className="text-gray-600 break-all mt-1">{navigator.userAgent}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">屏幕分辨率:</span>
              <p className="text-gray-600 mt-1">{window.screen.width} × {window.screen.height}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">语言:</span>
              <p className="text-gray-600 mt-1">{navigator.language}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">时区:</span>
              <p className="text-gray-600 mt-1">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
            </div>
          </div>
        </div>

        {/* 测试结果总结 */}
        <div className={`mt-6 p-4 rounded-xl ${hasBasicFeatures ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center space-x-2">
            {hasBasicFeatures ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <p className={`font-medium ${hasBasicFeatures ? 'text-green-800' : 'text-red-800'}`}>
              {hasBasicFeatures 
                ? '✅ 基本功能测试通过，页面可以正常显示和使用！'
                : '❌ 部分功能不支持，但页面仍然可以显示基本内容。'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
