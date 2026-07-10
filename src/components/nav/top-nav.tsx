"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import {
  Bell, Menu, X, Home,
  LayoutDashboard, Building2, Wrench, Calendar,
  Users, UserCheck, Settings, FileText, BarChart3,
  MessageSquare, ChevronDown,
} from "lucide-react"

const portalNavLinks = [
  { href: "/portal", label: "Home", icon: Home, exact: true },
  { href: "/portal/service", label: "Service", icon: Wrench },
  { href: "/portal/property", label: "My Home", icon: Building2 },
  { href: "/portal/maintenance", label: "Schedule", icon: Calendar },
  { href: "/portal/invoices", label: "Invoices", icon: FileText },
  { href: "/portal/messages", label: "Messages", icon: MessageSquare },
]
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { getInitials, cn } from "@/lib/utils"
import type { Tables } from "@/types/database"

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/properties", label: "Properties", icon: Building2 },
  { href: "/dashboard/work-orders", label: "Work Orders", icon: Wrench },
  { href: "/dashboard/maintenance", label: "Maintenance", icon: Calendar },
  { href: "/dashboard/vendors", label: "Vendors", icon: UserCheck },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/team", label: "Team Members", icon: Settings },
  { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
]

interface TopNavProps {
  user: Tables<"users">
}

export function TopNav({ user }: TopNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .neq("sender_id", user.id)
      .eq("is_read", false)
      .then(({ count }) => setUnreadCount(count ?? 0))
  }, [user.id])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const dashboardPath = user.role === "client" ? "/portal" : "/dashboard"

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-[#0F1512]/95">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">

          {/* Hamburger -- mobile only */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Open menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo */}
          <Link href={dashboardPath} className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#1A2320]">
              <Home className="h-4 w-4 text-[#0E7C67]" />
            </div>
            <span className="font-display text-lg font-semibold text-[#1A2320] dark:text-white">
              Carefree Casa
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`${dashboardPath}/messages`} className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                <span className="sr-only">Messages</span>
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{getInitials(user.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium md:block">{user.full_name.split(" ")[0]}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-xs text-slate-500 font-normal">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`${dashboardPath}/settings`}>Account Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  onClick={handleSignOut}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile slide-out menu */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-white shadow-2xl lg:hidden dark:bg-[#0F1512]">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
              <span className="font-display text-lg font-semibold text-[#1A2320] dark:text-white">Menu</span>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              {(user.role === "client" ? portalNavLinks : navLinks).map((link) => {
                const active = isActive(link.href, (link as any).exact)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors mb-0.5",
                      active
                        ? "bg-[#1A2320] text-white"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                    )}
                  >
                    <link.icon className={cn("h-5 w-5 shrink-0", active && "text-[#0E7C67]")} />
                    {link.label}
                  </Link>
                )
              })}
            </nav>
            <div className="border-t border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">{getInitials(user.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A2320] truncate dark:text-white">{user.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
