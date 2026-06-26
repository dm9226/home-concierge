"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  Building2,
  Wrench,
  Users,
  MessageSquare,
  MoreHorizontal,
  LayoutDashboard,
  Calendar,
  UserCheck,
  FileText,
  BarChart3,
  Settings,
  ScrollText,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

const primaryLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/properties", label: "Properties", icon: Building2 },
  { href: "/dashboard/work-orders", label: "Work Orders", icon: Wrench },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
]

const moreLinks = [
  { href: "/dashboard/maintenance", label: "Maintenance", icon: Calendar },
  { href: "/dashboard/vendors", label: "Vendors", icon: UserCheck },
  { href: "/dashboard/team", label: "Team", icon: Settings },
  { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/audit", label: "Audit Log", icon: ScrollText },
]

export function BottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  const anyMoreActive = moreLinks.some((l) => isActive(l.href))

  return (
    <>
      {/* Backdrop */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More drawer */}
      {moreOpen && (
        <div className="fixed bottom-16 left-0 right-0 z-50 rounded-t-2xl bg-white shadow-2xl lg:hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-700">More</span>
            <button onClick={() => setMoreOpen(false)} className="p-1 text-slate-400">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="grid grid-cols-3 gap-px bg-slate-100 p-px">
            {moreLinks.map((link) => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 bg-white px-3 py-4 text-xs font-medium transition-colors",
                    active ? "text-[#0F1B2D]" : "text-slate-500"
                  )}
                >
                  <link.icon className={cn("h-5 w-5", active && "text-[#C9A96E]")} />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-stretch border-t border-slate-200 bg-white lg:hidden">
        {primaryLinks.map((link) => {
          const active = isActive(link.href, link.exact)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                active ? "text-[#0F1B2D]" : "text-slate-400"
              )}
            >
              <link.icon className={cn("h-5 w-5", active && "text-[#C9A96E]")} />
              <span>{link.label.split(" ")[0]}</span>
            </Link>
          )
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
            anyMoreActive || moreOpen ? "text-[#0F1B2D]" : "text-slate-400"
          )}
        >
          <MoreHorizontal className={cn("h-5 w-5", (anyMoreActive || moreOpen) && "text-[#C9A96E]")} />
          <span>More</span>
        </button>
      </nav>
    </>
  )
}
