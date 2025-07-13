"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Page() {
  const router = useRouter()

  useEffect(() => {
    // 重定向到健康日历页面
    router.replace("/health-calendar")
  }, [router])

  // 返回一个加载中的界面，只会短暂显示
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div
          className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
          role="status"
        >
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            加载中...
          </span>
        </div>
        <p className="mt-2 text-gray-600">健康日历加载中...</p>
      </div>
    </div>
  )
}
