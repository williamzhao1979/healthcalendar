"use client";

import { DatabaseProvider } from "@/context/DatabaseContext";
import { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <DatabaseProvider>{children}</DatabaseProvider>
  );
}
