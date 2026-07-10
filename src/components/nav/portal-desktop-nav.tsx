"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Wrench, Building2, FileText, MessageSquare, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/portal", label: "Home", icon: Home, exact: true },
  { href: "/portal/service", label: "Service", icon: Wrench },
  { href: "/portal/property", label: "My Home", icon: Building2 },
  { href: "/portal/maintenance", label: "Schedule", icon: Calendar },
  { href: "/portal/invoices", label: "Invoices", icon: FileText },
  { href: "/portal/messages", label: "Messages", icon: MessageSquare },
]

export function PortalDesktopNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden md:block border-b border-slate-200/80 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-[#0a1628]/95">
      <div className="max-w-2xl mx-auto px-4 flex gap-0.5">
        {navItems.map(item => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-[#0E7C67] text-[#0F1B2D] dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive && "text-[#0E7C67]")} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
