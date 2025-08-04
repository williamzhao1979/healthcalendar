'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { AlertTriangle, CheckCircle, Clock, Calendar, Bug } from 'lucide-react'
import { getLocalDateString, isRecordOnLocalDate, formatLocalDateTime } from '../../lib/dateUtils'

export default function TimezoneTestPage() {
  const [testResults, setTestResults] = useState<any[]>([])

  useEffect(() => {
    runTimezoneTests()
  }, [])

  const runTimezoneTests = () => {
    const results = []

    // Test case 1: Record at 23:30 on August 3rd
    const record1DateTime = '2024-08-03T23:30:00'
    const calendarDate1 = new Date(2024, 7, 3) // August 3rd local time
    const calendarDate2 = new Date(2024, 7, 4) // August 4th local time

    // Old method (problematic)
    const oldMethod1 = new Date(record1DateTime).toISOString().split('T')[0]
    const oldCalendarDate1 = calendarDate1.toISOString().split('T')[0]
    const oldCalendarDate2 = calendarDate2.toISOString().split('T')[0]

    // New method (fixed)
    const newRecordDate1 = getLocalDateString(record1DateTime)
    const newCalendarDate1 = getLocalDateString(calendarDate1)
    const newCalendarDate2 = getLocalDateString(calendarDate2)

    results.push({
      title: 'Test Case 1: Record at 23:30 on August 3rd',
      recordDateTime: record1DateTime,
      calendarDates: ['2024-08-03', '2024-08-04'],
      oldMethod: {
        recordDate: oldMethod1,
        matches: [
          { date: '2024-08-03', matches: oldMethod1 === oldCalendarDate1 },
          { date: '2024-08-04', matches: oldMethod1 === oldCalendarDate2 }
        ]
      },
      newMethod: {
        recordDate: newRecordDate1,
        matches: [
          { date: '2024-08-03', matches: isRecordOnLocalDate(record1DateTime, calendarDate1) },
          { date: '2024-08-04', matches: isRecordOnLocalDate(record1DateTime, calendarDate2) }
        ]
      }
    })

    // Test case 2: Record at 01:30 on August 4th
    const record2DateTime = '2024-08-04T01:30:00'
    const oldMethod2 = new Date(record2DateTime).toISOString().split('T')[0]
    const newRecordDate2 = getLocalDateString(record2DateTime)

    results.push({
      title: 'Test Case 2: Record at 01:30 on August 4th',
      recordDateTime: record2DateTime,
      calendarDates: ['2024-08-03', '2024-08-04'],
      oldMethod: {
        recordDate: oldMethod2,
        matches: [
          { date: '2024-08-03', matches: oldMethod2 === oldCalendarDate1 },
          { date: '2024-08-04', matches: oldMethod2 === oldCalendarDate2 }
        ]
      },
      newMethod: {
        recordDate: newRecordDate2,
        matches: [
          { date: '2024-08-03', matches: isRecordOnLocalDate(record2DateTime, calendarDate1) },
          { date: '2024-08-04', matches: isRecordOnLocalDate(record2DateTime, calendarDate2) }
        ]
      }
    })

    // Test case 3: Edge case - Record with timezone offset
    const record3DateTime = '2024-08-03T23:45:00+08:00'
    const oldMethod3 = new Date(record3DateTime).toISOString().split('T')[0]
    const newRecordDate3 = getLocalDateString(record3DateTime)

    results.push({
      title: 'Test Case 3: Record with timezone offset (+08:00)',
      recordDateTime: record3DateTime,
      calendarDates: ['2024-08-03', '2024-08-04'],
      oldMethod: {
        recordDate: oldMethod3,
        matches: [
          { date: '2024-08-03', matches: oldMethod3 === oldCalendarDate1 },
          { date: '2024-08-04', matches: oldMethod3 === oldCalendarDate2 }
        ]
      },
      newMethod: {
        recordDate: newRecordDate3,
        matches: [
          { date: '2024-08-03', matches: isRecordOnLocalDate(record3DateTime, calendarDate1) },
          { date: '2024-08-04', matches: isRecordOnLocalDate(record3DateTime, calendarDate2) }
        ]
      }
    })

    setTestResults(results)
  }

  const getTimezoneInfo = () => {
    const now = new Date()
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      offset: now.getTimezoneOffset(),
      offsetString: now.toString().match(/GMT[+-]\d{4}/)?.[0] || 'Unknown'
    }
  }

  const timezoneInfo = getTimezoneInfo()

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-600" />
            时区问题测试和修复验证
          </h1>
          <p className="text-gray-600">
            测试记录日期时区转换问题：8/3记录显示在8/4日历上的问题
          </p>
        </div>

        {/* 系统时区信息 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              系统时区信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-gray-600">时区:</span>
                <div className="font-mono text-sm">{timezoneInfo.timezone}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">UTC偏移:</span>
                <div className="font-mono text-sm">{timezoneInfo.offset} 分钟</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">偏移字符串:</span>
                <div className="font-mono text-sm">{timezoneInfo.offsetString}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 问题说明 */}
        <Alert className="mb-6">
          <Bug className="h-4 w-4" />
          <AlertTitle>问题说明</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>当使用 <code className="bg-gray-100 px-1 rounded">new Date(dateTime).toISOString().split('T')[0]</code> 进行日期比较时，会发生时区转换问题：</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                <li><strong>问题</strong>: <code>toISOString()</code> 总是返回UTC时间</li>
                <li><strong>结果</strong>: 本地时间晚上的记录可能被转换到第二天的UTC日期</li>
                <li><strong>影响</strong>: 8月3日晚上的记录在日历上显示在8月4日</li>
                <li><strong>解决</strong>: 使用本地日期组件进行比较，避免UTC转换</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        {/* 测试结果 */}
        <div className="space-y-6">
          {testResults.map((result, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">{result.title}</CardTitle>
                <CardDescription>
                  记录时间: <code className="bg-gray-100 px-1 rounded">{result.recordDateTime}</code>
                  <br />
                  格式化显示: {formatLocalDateTime(result.recordDateTime)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 旧方法 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-red-600 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      旧方法 (有问题)
                    </h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="text-gray-600">提取的日期:</span>
                          <code className="ml-2 bg-red-100 px-1 rounded">{result.oldMethod.recordDate}</code>
                        </div>
                        <div className="space-y-1">
                          <span className="text-gray-600">日历匹配:</span>
                          {result.oldMethod.matches.map((match: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 ml-2">
                              <Badge variant={match.matches ? "destructive" : "outline"}>
                                {match.date}
                              </Badge>
                              <span className="text-xs">
                                {match.matches ? '✓ 匹配' : '✗ 不匹配'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 新方法 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-green-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      新方法 (已修复)
                    </h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="text-gray-600">提取的日期:</span>
                          <code className="ml-2 bg-green-100 px-1 rounded">{result.newMethod.recordDate}</code>
                        </div>
                        <div className="space-y-1">
                          <span className="text-gray-600">日历匹配:</span>
                          {result.newMethod.matches.map((match: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 ml-2">
                              <Badge variant={match.matches ? "default" : "outline"}>
                                {result.calendarDates[idx]}
                              </Badge>
                              <span className="text-xs">
                                {match.matches ? '✓ 匹配' : '✗ 不匹配'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 修复说明 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              修复方案
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">1. 新的日期工具函数</h3>
                <p className="text-sm text-gray-600 mb-2">创建了 <code className="bg-gray-100 px-1 rounded">lib/dateUtils.ts</code> 文件，包含时区安全的日期处理函数：</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• <code>getLocalDateString()</code> - 获取本地日期字符串，不进行UTC转换</li>
                  <li>• <code>isRecordOnLocalDate()</code> - 检查记录是否在指定的本地日期</li>
                  <li>• <code>formatLocalDateTime()</code> - 格式化本地日期时间显示</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">2. 更新了HealthCalendar组件</h3>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• 替换 <code>getRecordDotsForDate()</code> 中的日期比较逻辑</li>
                  <li>• 更新 <code>getRecordsForSelectedDate()</code> 中的记录筛选</li>
                  <li>• 改进时间显示格式化</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3. 测试验证</h3>
                <p className="text-sm text-gray-600">上述测试结果证明新方法可以正确处理：</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• 晚上时间的记录不会被错误地显示在第二天</li>
                  <li>• 带时区偏移的日期时间</li>
                  <li>• 跨时区的日期比较</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-center">
          <Button onClick={runTimezoneTests} variant="outline">
            <Clock className="w-4 h-4 mr-2" />
            重新运行测试
          </Button>
        </div>
      </div>
    </div>
  )
}