"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Utensils, Plus, Clock, Camera } from "lucide-react"
import { useState } from "react"

export default function MealPage() {
  const [meals, setMeals] = useState([
    { time: "08:00", type: "早餐", food: "", calories: "" },
    { time: "12:00", type: "午餐", food: "", calories: "" },
    { time: "18:00", type: "晚餐", food: "", calories: "" },
  ])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6 pt-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-800">饮食记录</h1>
        </div>

        {/* Date Card */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="text-center">
              <Utensils className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-lg font-semibold">{new Date().toLocaleDateString("zh-CN")}</p>
              <p className="text-sm text-gray-500">今日饮食</p>
            </div>
          </CardContent>
        </Card>

        {/* Meal Records */}
        <div className="space-y-4 mb-20">
          {meals.map((meal, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-orange-500 mr-2" />
                    <span>{meal.type}</span>
                  </div>
                  <span className="text-sm text-gray-500">{meal.time}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">食物内容</label>
                  <Textarea
                    placeholder="记录今天吃了什么..."
                    className="min-h-[80px]"
                    value={meal.food}
                    onChange={(e) => {
                      const newMeals = [...meals]
                      newMeals[index].food = e.target.value
                      setMeals(newMeals)
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">卡路里 (可选)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={meal.calories}
                      onChange={(e) => {
                        const newMeals = [...meals]
                        newMeals[index].calories = e.target.value
                        setMeals(newMeals)
                      }}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" className="w-full bg-transparent">
                      <Camera className="w-4 h-4 mr-2" />
                      拍照
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Snack */}
          <Card className="border-dashed border-2 border-orange-200">
            <CardContent className="p-6">
              <Button variant="ghost" className="w-full text-orange-500 hover:text-orange-600 hover:bg-orange-50">
                <Plus className="w-5 h-5 mr-2" />
                添加加餐/零食
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Water Intake */}
        <Card className="mb-20">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <div className="w-5 h-5 bg-blue-500 rounded-full mr-2"></div>
              饮水记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">今日饮水量</span>
              <span className="font-semibold">1200ml / 2000ml</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div className="bg-blue-500 h-3 rounded-full" style={{ width: "60%" }}></div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[250, 500, 250, 300].map((amount, index) => (
                <Button key={index} variant="outline" size="sm">
                  +{amount}ml
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="fixed bottom-20 left-4 right-4">
          <div className="max-w-md mx-auto">
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3">保存记录</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
