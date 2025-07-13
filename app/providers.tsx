"use client"

import type React from "react"
import { ThemeProvider } from "next-themes"
import { DatabaseProvider } from "@/context/DatabaseContext"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <DatabaseProvider>{children}</DatabaseProvider>
    </ThemeProvider>
  )
}
