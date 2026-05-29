"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Home,
  Wrench,
  Calendar,
  Users,
  Building2,
  FileText,
  BarChart3,
  MessageSquare,
  UserCheck,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"

const adminLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/properties", label: "Properties", icon: Building2 },
  { href: "/dashboard/work-orders", label: "Work Orders", icon: Wrench },
  { href: "/dashboard/maintenance", label: "Maintenance", icon: Calendar },
  { href: "/dashboard/vendors", label: "Vendors", icon: UserCheck },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/team", label: "Team", icon: Settings },
  { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
]

interface SidebarProps {
  role: "admin" | "concierge" | "client"
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const links = adminLinks

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#0a1628] lg:flex">
      <nav className="flex flex-col gap-1 p-4 pt-6">
        {links.map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#0F1B2D] text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              )}
            >
              <link.icon className={cn("h-4 w-4 shrink-0", isActive && "text-[#C9A96E]")} />
              {link.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
