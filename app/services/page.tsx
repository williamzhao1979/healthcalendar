import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const services = [
  {
    title: "Web开发",
    description: "现代化的响应式网站开发",
    features: ["React/Next.js开发", "响应式设计", "SEO优化", "性能优化"],
    icon: "💻",
  },
  {
    title: "移动应用",
    description: "跨平台移动应用开发",
    features: ["React Native", "Flutter开发", "原生应用", "PWA应用"],
    icon: "📱",
  },
  {
    title: "后端服务",
    description: "可靠的后端API和数据库设计",
    features: ["RESTful API", "GraphQL", "数据库设计", "云服务部署"],
    icon: "⚙️",
  },
  {
    title: "UI/UX设计",
    description: "用户体验和界面设计",
    features: ["用户研究", "原型设计", "视觉设计", "交互设计"],
    icon: "🎨",
  },
]

export default function ServicesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">我们的服务</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          我们提供全方位的数字化解决方案，从概念设计到产品上线，为您的业务提供强有力的技术支持。
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 mb-12">
        {services.map((service, index) => (
          <Card key={index} className="h-full">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">{service.icon}</span>
              </div>
              <CardTitle>{service.title}</CardTitle>
              <CardDescription>{service.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {service.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center bg-blue-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-4">需要定制化解决方案？</h2>
        <p className="text-gray-600 mb-6">我们的专业团队随时准备为您提供个性化的技术咨询和开发服务。</p>
        <Button asChild size="lg">
          <Link href="/contact">立即咨询</Link>
        </Button>
      </div>
    </div>
  )
}
