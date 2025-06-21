'use client'

import Navbar from "@/components/Navbar"
import { usePathname } from "next/navigation"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNavbar = pathname.startsWith("/chat")

  return (
    <>
      {!hideNavbar && <Navbar />}
      <main>{children}</main>
    </>
  )
}