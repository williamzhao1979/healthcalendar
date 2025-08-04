import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google" 
import "./globals.css"
import AndroidEdgeErrorBoundary from "../components/AndroidEdgeErrorBoundary"
import MSALRedirectHandler from "../components/MSALRedirectHandler"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "健康日历",
  description: "生活离不开吃喝拉撒 - 健康日历应用",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <AndroidEdgeErrorBoundary>
          <MSALRedirectHandler>
            <main className="min-h-screen">{children}</main>
          </MSALRedirectHandler>
        </AndroidEdgeErrorBoundary>
      </body>
    </html>
  )
}
