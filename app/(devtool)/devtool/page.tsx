import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DevToolHomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="text-center py-20 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg mb-12">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">欢迎来到我们的网站</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          这是一个使用Next.js构建的多页面网站示例，展示了现代化的页面跳转和导航功能。
        </p>
        <div className="space-x-4">
          <Button asChild size="lg">
            <Link href="/about">了解更多</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/contact">联系我们</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center mb-12">主要特性</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>快速导航</CardTitle>
              <CardDescription>使用Next.js Link组件实现快速页面跳转</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">客户端路由确保页面切换流畅，提供优秀的用户体验。</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>响应式设计</CardTitle>
              <CardDescription>适配各种设备屏幕尺寸</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">使用Tailwind CSS构建的响应式布局，在任何设备上都能完美显示。</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>现代化架构</CardTitle>
              <CardDescription>基于Next.js App Router</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">采用最新的Next.js App Router架构，支持服务端渲染和静态生成。</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}