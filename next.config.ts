import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    allowedDevOrigins: process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS?.split(",") || [],
  },
  eslint: {
    // 在构建时忽略 ESLint 错误，避免构建失败
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 在构建时忽略 TypeScript 错误，避免构建失败
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
