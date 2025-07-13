import Link from "next/link"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">健康日历</h1>
          <p className="text-xl text-gray-600 mb-8">记录健康，管理生活</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📅</span>
                健康日历
              </CardTitle>
              <CardDescription>查看和管理您的健康记录</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/health-calendar">
                <Button className="w-full">进入日历</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">👥</span>
                用户管理
              </CardTitle>
              <CardDescription>管理家庭成员和权限设置</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/user-management">
                <Button className="w-full bg-transparent" variant="outline">
                  管理用户
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                排便记录
              </CardTitle>
              <CardDescription>记录和分析排便健康状况</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/stool-record">
                <Button className="w-full bg-transparent" variant="outline">
                  记录排便
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-500">开始记录您的健康数据，让生活更有序</p>
        </div>
      </div>
    </div>
  )
}
