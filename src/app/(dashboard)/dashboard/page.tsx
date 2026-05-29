import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HealthScoreGauge } from "@/components/health-score-gauge"
import { StatusBadge, PriorityBadge } from "@/components/status-badge"
import { formatCurrency, formatDateShort, getDaysUntil } from "@/lib/utils"
import {
  Building2,
  Wrench,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
} from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  const isAdmin = profile.role === "admin"

  // Fetch properties (scoped by RLS)
  const { data: properties } = await supabase
    .from("properties")
    .select("*, users!properties_client_id_fkey(full_name, email, phone)")
    .eq("status", "active")
    .order("created_at", { ascending: false })

  const propertyIds = properties?.map((p) => p.id) ?? []

  // Fetch work orders this week
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data: recentWorkOrders } = await supabase
    .from("work_orders")
    .select("*, properties(address, city)")
    .in("property_id", propertyIds)
    .gte("created_at", weekAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(10)

  // Active emergencies
  const { data: emergencies } = await supabase
    .from("work_orders")
    .select("*, properties(address)")
    .in("property_id", propertyIds)
    .eq("is_emergency", true)
    .not("status", "in", '("completed","cancelled")')

  // Overdue maintenance
  const { data: overdueItems } = await supabase
    .from("maintenance_schedules")
    .select("*, properties(address, city)")
    .in("property_id", propertyIds)
    .eq("is_active", true)
    .lt("next_due", new Date().toISOString().split("T")[0])
    .order("next_due", { ascending: true })
    .limit(5)

  // Upcoming scheduled work (next 7 days)
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)

  const { data: upcomingWork } = await supabase
    .from("work_orders")
    .select("*, properties(address, city)")
    .in("property_id", propertyIds)
    .eq("status", "scheduled")
    .gte("scheduled_date", new Date().toISOString())
    .lte("scheduled_date", nextWeek.toISOString())
    .order("scheduled_date", { ascending: true })
    .limit(5)

  // Recent activity
  const { data: recentActivity } = await supabase
    .from("activity_logs")
    .select("*, users(full_name), properties(address)")
    .in("property_id", propertyIds)
    .order("created_at", { ascending: false })
    .limit(8)

  const stats = [
    {
      label: "Active Properties",
      value: properties?.length ?? 0,
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Work Orders This Week",
      value: recentWorkOrders?.length ?? 0,
      icon: Wrench,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Overdue Maintenance",
      value: overdueItems?.length ?? 0,
      icon: Calendar,
      color: overdueItems?.length ? "text-red-600" : "text-emerald-600",
      bg: overdueItems?.length ? "bg-red-50" : "bg-emerald-50",
    },
    {
      label: "Active Emergencies",
      value: emergencies?.length ?? 0,
      icon: AlertTriangle,
      color: emergencies?.length ? "text-red-600" : "text-emerald-600",
      bg: emergencies?.length ? "bg-red-50" : "bg-emerald-50",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#0F1B2D] dark:text-white">
            Good {getTimeOfDay()}, {profile.full_name.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/work-orders/new">
              <Plus className="h-4 w-4" />
              New Work Order
            </Link>
          </Button>
        </div>
      </div>

      {/* Emergency Banner */}
      {emergencies && emergencies.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800">
                {emergencies.length} Active Emergency{emergencies.length > 1 ? " Requests" : ""}
              </p>
              <div className="mt-2 space-y-1">
                {emergencies.map((e) => (
                  <p key={e.id} className="text-sm text-red-700">
                    {(e as any).properties?.address} &mdash; {e.title}
                  </p>
                ))}
              </div>
            </div>
            <Button variant="emergency" size="sm" asChild>
              <Link href="/dashboard/work-orders?filter=emergency">View All</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0F1B2D] dark:text-white">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Properties list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">
              {isAdmin ? "All Properties" : "Your Properties"}
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/properties">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="space-y-3">
            {properties?.slice(0, 5).map((property) => {
              const client = (property as any).users
              return (
                <Link
                  key={property.id}
                  href={`/dashboard/properties/${property.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-4 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:block">
                      <HealthScoreGauge score={property.health_score} size="sm" showLabel={false} />
                    </div>
                    <div>
                      <p className="font-medium text-[#0F1B2D] dark:text-white">
                        {property.address}
                      </p>
                      <p className="text-sm text-slate-500">
                        {property.city}, {property.state} &bull; {client?.full_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-sm font-medium text-slate-500 sm:block">
                      Score: <span className={property.health_score >= 80 ? "text-emerald-600" : property.health_score >= 60 ? "text-amber-500" : "text-red-500"}>
                        {property.health_score}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Sidebar: upcoming + activity */}
        <div className="space-y-6">
          {/* Upcoming work */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Upcoming This Week</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingWork && upcomingWork.length > 0 ? (
                upcomingWork.map((wo) => (
                  <Link
                    key={wo.id}
                    href={`/dashboard/work-orders/${wo.id}`}
                    className="block rounded-md p-2 hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <p className="text-sm font-medium text-[#0F1B2D] dark:text-white line-clamp-1">
                      {wo.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {wo.scheduled_date
                        ? formatDateShort(wo.scheduled_date)
                        : "No date"}
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-slate-500 py-2">No upcoming work orders</p>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity?.map((log) => (
                <div key={log.id} className="border-l-2 border-[#C9A96E]/40 pl-3">
                  <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                    {log.description}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {formatDateShort(log.created_at)} &bull; {(log as any).properties?.address?.split(" ").slice(0, 3).join(" ")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function getTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "morning"
  if (hour < 17) return "afternoon"
  return "evening"
}
