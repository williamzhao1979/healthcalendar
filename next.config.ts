import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    allowedDevOrigins: ["localhost:3000", "127.0.0.1:3000"],
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
