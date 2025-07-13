import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    allowedDevOrigins: process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS?.split(",") || [],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
