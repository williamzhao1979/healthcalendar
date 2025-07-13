"use client"

import type React from "react"

import { ThemeProvider } from "@/components/theme-provider"
import { DatabaseProvider } from "@/context/DatabaseContext"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <DatabaseProvider>{children}</DatabaseProvider>
    </ThemeProvider>
  )
}
