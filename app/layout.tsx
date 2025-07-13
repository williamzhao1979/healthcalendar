import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Noto_Sans_SC } from "next/font/google"
import "./globals.css"
import Providers from "./providers"

// Geist字体主要用于英文和数字
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// 使用思源黑体(Noto Sans SC)加载中文字体
const notoSansSC = Noto_Sans_SC({
  variable: "--font-chinese",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: true,
})

export const metadata: Metadata = {
  title: "全家健康日历",
  description: "全家健康日历",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${notoSansSC.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
