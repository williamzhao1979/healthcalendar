"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "首页" },
  { href: "/about", label: "关于我们" },
  { href: "/services", label: "服务" },
  { href: "/products", label: "产品" },
  { href: "/contact", label: "联系我们" },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-blue-600">
            我的网站
          </Link>

          <div className="hidden md:flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-gray-600 hover:text-blue-600 transition-colors duration-200",
                  pathname === item.href && "text-blue-600 font-semibold",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* 移动端菜单按钮 */}
          <div className="md:hidden">
            <button className="text-gray-600 hover:text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
