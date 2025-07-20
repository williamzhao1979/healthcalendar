"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Heart, Utensils, FileText, Activity } from "lucide-react"

export default function HealthCalendarPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="flex justify-center mb-4">
            <div className="bg-pink-500 rounded-full p-4">
              <Heart className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">健康日历</h1>
          <p className="text-gray-600 text-sm">记录您的健康生活</p>
        </div>

        {/* Main Calendar Card */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <Calendar className="w-12 h-12 text-pink-500 mx-auto mb-2" />
              <h2 className="text-lg font-semibold text-gray-800">今日记录</h2>
              <p className="text-gray-500 text-sm">{new Date().toLocaleDateString("zh-CN")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link href="/period">
                <Button
                  variant="outline"
                  className="w-full h-16 flex flex-col items-center justify-center space-y-1 border-pink-200 hover:bg-pink-50 bg-transparent"
                >
                  <div className="w-6 h-6 bg-pink-500 rounded-full"></div>
                  <span className="text-sm">生理期</span>
                </Button>
              </Link>

              <Link href="/meal">
                <Button
                  variant="outline"
                  className="w-full h-16 flex flex-col items-center justify-center space-y-1 border-orange-200 hover:bg-orange-50 bg-transparent"
                >
                  <Utensils className="w-6 h-6 text-orange-500" />
                  <span className="text-sm">饮食</span>
                </Button>
              </Link>

              <Link href="/stool">
                <Button
                  variant="outline"
                  className="w-full h-16 flex flex-col items-center justify-center space-y-1 border-brown-200 hover:bg-brown-50 bg-transparent"
                >
                  <Activity className="w-6 h-6 text-amber-600" />
                  <span className="text-sm">排便</span>
                </Button>
              </Link>

              <Link href="/myrecord">
                <Button
                  variant="outline"
                  className="w-full h-16 flex flex-col items-center justify-center space-y-1 border-blue-200 hover:bg-blue-50 bg-transparent"
                >
                  <FileText className="w-6 h-6 text-blue-500" />
                  <span className="text-sm">我的记录</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-3">
          <Link href="/period-calendar">
            <Button className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3">
              <Calendar className="w-5 h-5 mr-2" />
              查看生理期日历
            </Button>
          </Link>

          <Button variant="outline" className="w-full py-3 border-gray-300 bg-transparent">
            <Heart className="w-5 h-5 mr-2 text-red-500" />
            健康提醒设置
          </Button>
        </div>

        {/* Bottom Navigation Placeholder */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-md mx-auto flex justify-around">
            <Button variant="ghost" size="sm" className="flex flex-col items-center">
              <Calendar className="w-5 h-5 mb-1 text-pink-500" />
              <span className="text-xs">日历</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex flex-col items-center">
              <FileText className="w-5 h-5 mb-1 text-gray-400" />
              <span className="text-xs">记录</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex flex-col items-center">
              <Heart className="w-5 h-5 mb-1 text-gray-400" />
              <span className="text-xs">健康</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
