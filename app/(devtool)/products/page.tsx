import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const products = [
  {
    name: "WebBuilder Pro",
    description: "专业的网站构建平台",
    price: "¥299/月",
    features: ["拖拽式编辑器", "响应式模板", "SEO工具", "数据分析"],
    status: "热门",
    image: "/placeholder-7u98v.png",
  },
  {
    name: "AppStudio",
    description: "移动应用开发套件",
    price: "¥599/月",
    features: ["跨平台开发", "云端编译", "实时预览", "应用商店发布"],
    status: "新品",
    image: "/mobile-app-development.png",
  },
  {
    name: "DataFlow",
    description: "数据管理和分析平台",
    price: "¥899/月",
    features: ["实时数据处理", "可视化图表", "API集成", "自动化报告"],
    status: "企业版",
    image: "/data-analytics-dashboard.png",
  },
]

export default function ProductsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">我们的产品</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          探索我们精心打造的产品系列，每一款都旨在提升您的工作效率和业务成果。
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        {products.map((product, index) => (
          <Card key={index} className="overflow-hidden">
            <div className="relative">
              <img src={product.image || "/placeholder.svg"} alt={product.name} className="w-full h-48 object-cover" />
              <Badge className="absolute top-4 right-4" variant="secondary">
                {product.status}
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {product.name}
                <span className="text-lg font-bold text-blue-600">{product.price}</span>
              </CardTitle>
              <CardDescription>{product.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {product.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full">了解详情</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">企业定制方案</h2>
        <p className="mb-6 opacity-90">需要更多功能或定制化解决方案？我们的企业版产品可以满足您的特殊需求。</p>
        <Button variant="secondary" size="lg">
          联系销售团队
        </Button>
      </div>
    </div>
  )
}
