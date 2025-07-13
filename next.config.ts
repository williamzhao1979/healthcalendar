import type { NextConfig } from "next";

const nextConfig = {
  // 配置路由重定向
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/health-calendar',
        permanent: true, // 301永久重定向
      },
    ];
  },
  
  // 允许特定IP地址访问开发服务器
  // 添加这个配置是为了解决跨源请求警告
  experimental: {
    allowedDevOrigins: process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS?.split(',') || ['localhost'],
  },
} as NextConfig;

export default nextConfig;
