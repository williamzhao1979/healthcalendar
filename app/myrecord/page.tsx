"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, FileText, Calendar, TrendingUp, Download, Share } from "lucide-react"

export default function MyRecordPage() {
  const periodData = [
    { date: "2024-01-15", flow: "正常", mood: "开心", symptoms: ["轻微腹痛"] },
    { date: "2024-01-14", flow: "量多", mood: "烦躁", symptoms: ["腹痛", "疲劳"] },
    { date: "2024-01-13", flow: "正常", mood: "一般", symptoms: [] },
  ]

  const mealData = [
    { date: "2024-01-15", breakfast: "燕麦粥、鸡蛋", lunch: "米饭、青菜、鸡肉", dinner: "面条、蔬菜" },
    { date: "2024-01-14", breakfast: "面包、牛奶", lunch: "沙拉、三明治", dinner: "汤、米饭" },
  ]

  const stoolData = [
    { date: "2024-01-15", time: "早上", type: "类型4", color: "棕色", symptoms: [] },
    { date: "2024-01-14", time: "晚上", type: "类型3", color: "棕色", symptoms: ["轻微腹胀"] },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-800">我的记录</h1>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Share className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-pink-500">28</div>
              <div className="text-xs text-gray-500">周期天数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-orange-500">1850</div>
              <div className="text-xs text-gray-500">今日卡路里</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-blue-500">7</div>
              <div className="text-xs text-gray-500">连续记录天数</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="period" className="mb-20">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="period">生理期</TabsTrigger>
            <TabsTrigger value="meal">饮食</TabsTrigger>
            <TabsTrigger value="stool">排便</TabsTrigger>
          </TabsList>

          <TabsContent value="period" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Calendar className="w-5 h-5 text-pink-500 mr-2" />
                  生理期记录
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {periodData.map((record, index) => (
                  <div key={index} className="border-l-4 border-pink-500 pl-4 py-2">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium">{record.date}</span>
                      <span className="text-sm text-gray-500">流量: {record.flow}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">心情: {record.mood}</div>
                    {record.symptoms.length > 0 && (
                      <div className="text-sm text-gray-600">症状: {record.symptoms.join(", ")}</div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <TrendingUp className="w-5 h-5 text-pink-500 mr-2" />
                  周期分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">平均周期</span>
                    <span className="font-medium">28天</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">经期长度</span>
                    <span className="font-medium">5天</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">下次预测</span>
                    <span className="font-medium text-pink-500">2024-02-12</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meal" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileText className="w-5 h-5 text-orange-500 mr-2" />
                  饮食记录
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mealData.map((record, index) => (
                  <div key={index} className="border-l-4 border-orange-500 pl-4 py-2">
                    <div className="font-medium mb-2">{record.date}</div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">早餐:</span> {record.breakfast}
                      </div>
                      <div>
                        <span className="font-medium">午餐:</span> {record.lunch}
                      </div>
                      <div>
                        <span className="font-medium">晚餐:</span> {record.dinner}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <TrendingUp className="w-5 h-5 text-orange-500 mr-2" />
                  营养分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600">卡路里</span>
                      <span className="font-medium">1850 / 2000</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: "92.5%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600">蛋白质</span>
                      <span className="font-medium">65g / 80g</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: "81.25%" }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stool" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileText className="w-5 h-5 text-amber-600 mr-2" />
                  排便记录
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stoolData.map((record, index) => (
                  <div key={index} className="border-l-4 border-amber-600 pl-4 py-2">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium">{record.date}</span>
                      <span className="text-sm text-gray-500">{record.time}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      形状: {record.type} | 颜色: {record.color}
                    </div>
                    {record.symptoms.length > 0 && (
                      <div className="text-sm text-gray-600">症状: {record.symptoms.join(", ")}</div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <TrendingUp className="w-5 h-5 text-amber-600 mr-2" />
                  健康分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">排便频率</span>
                    <span className="font-medium">每日1次</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">健康状态</span>
                    <span className="font-medium text-green-500">良好</span>
                  </div>
                  <div className="text-sm text-gray-500 bg-green-50 p-3 rounded-lg">
                    💡 您的排便规律正常，建议继续保持良好的饮食习惯和适量运动。
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
