"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // 这里可以添加表单提交逻辑
    alert("感谢您的留言！我们会尽快回复您。")
    setFormData({ name: "", email: "", subject: "", message: "" })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">联系我们</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          有任何问题或需要帮助？我们随时为您提供支持。请通过以下方式与我们取得联系。
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* 联系表单 */}
        <Card>
          <CardHeader>
            <CardTitle>发送消息</CardTitle>
            <CardDescription>填写下面的表单，我们会尽快回复您</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">姓名</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="email">邮箱</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
                </div>
              </div>
              <div>
                <Label htmlFor="subject">主题</Label>
                <Input id="subject" name="subject" value={formData.subject} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="message">消息内容</Label>
                <Textarea
                  id="message"
                  name="message"
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                发送消息
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 联系信息 */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>联系信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600">📧</span>
                </div>
                <div>
                  <p className="font-semibold">邮箱</p>
                  <p className="text-gray-600">contact@example.com</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600">📞</span>
                </div>
                <div>
                  <p className="font-semibold">电话</p>
                  <p className="text-gray-600">+86 138-0000-0000</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600">📍</span>
                </div>
                <div>
                  <p className="font-semibold">地址</p>
                  <p className="text-gray-600">北京市朝阳区科技园区</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>工作时间</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>周一 - 周五</span>
                  <span className="text-gray-600">9:00 - 18:00</span>
                </div>
                <div className="flex justify-between">
                  <span>周六</span>
                  <span className="text-gray-600">10:00 - 16:00</span>
                </div>
                <div className="flex justify-between">
                  <span>周日</span>
                  <span className="text-gray-600">休息</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>社交媒体</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Button variant="outline" size="sm">
                  微信
                </Button>
                <Button variant="outline" size="sm">
                  微博
                </Button>
                <Button variant="outline" size="sm">
                  LinkedIn
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
