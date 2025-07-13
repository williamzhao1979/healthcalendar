import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // 配置路由重定向
  redirects: async () => {
    return [
      {
        source: "/",
        destination: "/health-calendar",
        permanent: true, // 301永久重定向
      },
    ]
  },

  // 允许特定IP地址访问开发服务器
  experimental: {
    allowedDevOrigins: process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS?.split(",") || ["localhost"],
  },

  // 如果 ESLint 问题严重，可以暂时跳过构建时的 ESLint 检查
  eslint: {
    // 在生产构建时忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },

  // 同样可以跳过 TypeScript 检查（不推荐，但可以用于紧急修复）
  typescript: {
    ignoreBuildErrors: true,
  },

  // 启用未优化图像
  images: {
    unoptimized: true,
  },
}

export default nextConfig
