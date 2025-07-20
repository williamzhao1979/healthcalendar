import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">关于我们</h1>

        <div className="prose prose-lg mx-auto mb-12">
          <p className="text-xl text-gray-600 text-center">
            我们是一家专注于现代化Web开发的技术团队，致力于为客户提供高质量的数字化解决方案。
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>我们的使命</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                通过创新的技术和优秀的设计，帮助企业在数字化时代取得成功。我们相信技术应该服务于人，让生活变得更加便利和美好。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>我们的愿景</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                成为行业领先的Web开发服务提供商，为全球客户提供卓越的数字化体验，推动互联网技术的发展和应用。
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-gray-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">团队优势</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="font-semibold mb-2">技术创新</h3>
              <p className="text-sm text-gray-600">采用最新的技术栈和开发方法</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="font-semibold mb-2">高效交付</h3>
              <p className="text-sm text-gray-600">快速响应，按时交付高质量产品</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="font-semibold mb-2">专业服务</h3>
              <p className="text-sm text-gray-600">提供全方位的技术支持和咨询</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
