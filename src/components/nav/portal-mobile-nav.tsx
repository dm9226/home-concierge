"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Wrench, Building2, FileText, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/portal", label: "Home", icon: Home, exact: true },
  { href: "/portal/service", label: "Service", icon: Wrench },
  { href: "/portal/property", label: "My Home", icon: Building2 },
  { href: "/portal/invoices", label: "Invoices", icon: FileText },
  { href: "/portal/messages", label: "Messages", icon: MessageSquare },
]

export function PortalMobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/80 bg-white/95 backdrop-blur-sm md:hidden dark:border-slate-800 dark:bg-[#0F1512]/95">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "text-[#1A2320] dark:text-white"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-[#0E7C67]")} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
