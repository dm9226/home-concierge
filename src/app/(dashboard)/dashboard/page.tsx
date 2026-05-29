import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PriorityBadge } from "@/components/status-badge"
import { formatCurrency, formatDateShort, getDaysUntil } from "@/lib/utils"
import {
  Building2, Wrench, Calendar, AlertTriangle, TrendingUp,
  Plus, ArrowRight, Clock, DollarSign, Home, MessageSquare,
  ShieldAlert, Package,
} from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  // Step 1: properties (needed for all subsequent queries)
  const { data: properties } = await supabase
    .from("properties")
    .select("*, client:users!properties_client_id_fkey(id, full_name, email)")
    .eq("status", "active")
    .order("created_at", { ascending: false })

  const propertyIds = properties?.map(p => p.id) ?? []
  const clientIds = properties
    ?.map(p => p.client_id)
    .filter((id): id is string => !!id) ?? []

  // Lookup maps for message display
  const propertyById: Record<string, { address: string; city: string }> = {}
  const clientNameById: Record<string, string> = {}
  properties?.forEach(p => {
    propertyById[p.id] = { address: p.address, city: p.city }
    const client = (p as any).client
    if (p.client_id && client?.full_name) clientNameById[p.client_id] = client.full_name
  })

  const avgHealthScore = properties?.length
    ? Math.round(properties.reduce((sum, p) => sum + (p.health_score ?? 0), 0) / properties.length)
    : 0

  const now = new Date()
  const ttmStart = new Date(now); ttmStart.setFullYear(ttmStart.getFullYear() - 1)
  const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7)
  const ninetyDays = new Date(now); ninetyDays.setDate(now.getDate() + 90)
  const todayStr = now.toISOString().split("T")[0]

  // Step 2: parallel fetch everything
  const [
    { data: emergencies },
    { data: ttmInvoices },
    { data: monthPaidInvoices },
    { data: outstandingInvoices },
    { data: submittedOrders },
    { data: overdueItems },
    { data: upcomingWork },
    { data: rawClientMessages },
    { data: expiringWarranties },
    { data: agingAssets },
  ] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id, title, property_id, properties(address)")
      .in("property_id", propertyIds)
      .eq("is_emergency", true)
      .not("status", "in", '("completed","cancelled")'),

    supabase
      .from("invoices")
      .select("total")
      .in("property_id", propertyIds)
      .in("status", ["paid", "sent", "overdue"])
      .gte("created_at", ttmStart.toISOString()),

    supabase
      .from("invoices")
      .select("total")
      .in("property_id", propertyIds)
      .eq("status", "paid")
      .gte("created_at", monthStart.toISOString()),

    supabase
      .from("invoices")
      .select("total")
      .in("property_id", propertyIds)
      .in("status", ["sent", "overdue"]),

    supabase
      .from("work_orders")
      .select("id, title, priority, property_id, properties(address, city)")
      .in("property_id", propertyIds)
      .eq("status", "submitted")
      .order("created_at", { ascending: false })
      .limit(6),

    supabase
      .from("maintenance_schedules")
      .select("id, title, next_due, property_id, properties(address, city)")
      .in("property_id", propertyIds)
      .eq("is_active", true)
      .lt("next_due", todayStr)
      .order("next_due", { ascending: true })
      .limit(6),

    supabase
      .from("work_orders")
      .select("id, title, scheduled_date, property_id, properties(address, city)")
      .in("property_id", propertyIds)
      .eq("status", "scheduled")
      .gte("scheduled_date", now.toISOString())
      .lte("scheduled_date", nextWeek.toISOString())
      .order("scheduled_date", { ascending: true })
      .limit(8),

    clientIds.length
      ? supabase
          .from("messages")
          .select("id, body, created_at, property_id, sender_id, is_read")
          .in("property_id", propertyIds)
          .in("sender_id", clientIds)
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] as any[], error: null }),

    supabase
      .from("assets")
      .select("id, name, warranty_expiration, property_id, properties(address)")
      .in("property_id", propertyIds)
      .eq("status", "active")
      .not("warranty_expiration", "is", null)
      .gte("warranty_expiration", todayStr)
      .lte("warranty_expiration", ninetyDays.toISOString().split("T")[0])
      .order("warranty_expiration", { ascending: true })
      .limit(4),

    supabase
      .from("assets")
      .select("id, name, install_date, expected_lifespan_years, property_id, properties(address)")
      .in("property_id", propertyIds)
      .eq("status", "active")
      .not("install_date", "is", null)
      .not("expected_lifespan_years", "is", null),
  ])

  // Derived values
  const arr = ttmInvoices?.reduce((sum, inv) => sum + inv.total, 0) ?? 0
  const monthRevenue = monthPaidInvoices?.reduce((sum, inv) => sum + inv.total, 0) ?? 0
  const outstanding = outstandingInvoices?.reduce((sum, inv) => sum + inv.total, 0) ?? 0

  const atRiskAssets = (agingAssets ?? [])
    .filter(asset => {
      if (!asset.install_date || !asset.expected_lifespan_years) return false
      const age = now.getFullYear() - new Date(asset.install_date).getFullYear()
      return age / asset.expected_lifespan_years >= 0.75
    })
    .slice(0, 4)

  const unassignedProps = (properties ?? []).filter(p => !p.client_id)
  const atRiskProperties = (properties ?? []).filter(p => (p.health_score ?? 100) < 65)
  const recentClientMessages = (rawClientMessages ?? []) as any[]

  const totalActionItems =
    (submittedOrders?.length ?? 0) +
    (overdueItems?.length ?? 0) +
    unassignedProps.length

  const hasProactiveAlerts =
    atRiskProperties.length > 0 ||
    (expiringWarranties?.length ?? 0) > 0 ||
    atRiskAssets.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#0F1B2D] dark:text-white">
            Good {getTimeOfDay()}, {profile.full_name.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/work-orders/new">
            <Plus className="h-4 w-4" />
            New Work Order
          </Link>
        </Button>
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
                  <Link key={e.id} href={`/dashboard/work-orders/${e.id}`} className="block text-sm text-red-700 hover:underline">
                    {(e as any).properties?.address} -- {e.title}
                  </Link>
                ))}
              </div>
            </div>
            <Button asChild size="sm" className="bg-red-600 hover:bg-red-700 text-white shrink-0">
              <Link href="/dashboard/work-orders?filter=emergency">View All</Link>
            </Button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* ARR */}
        <Link href="/dashboard/reports" className="group">
          <Card className="h-full hover:shadow-md transition-all cursor-pointer border-[#C9A96E]/30 hover:border-[#C9A96E]/60">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Revenue (TTM)</p>
                <TrendingUp className="h-4 w-4 text-[#C9A96E]" />
              </div>
              <p className="font-display text-2xl font-bold text-[#0F1B2D] dark:text-white">
                {formatCurrency(arr)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                +{formatCurrency(monthRevenue)} collected this month
              </p>
              <p className="mt-3 flex items-center gap-1 text-xs font-medium text-[#C9A96E] group-hover:underline">
                View reports <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Properties */}
        <Link href="/dashboard/properties" className="group">
          <Card className="h-full hover:shadow-md transition-all cursor-pointer">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Properties</p>
                <Building2 className="h-4 w-4 text-blue-500" />
              </div>
              <p className="font-display text-2xl font-bold text-[#0F1B2D] dark:text-white">
                {properties?.length ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">Avg health score: {avgHealthScore}</p>
              <p className="mt-3 flex items-center gap-1 text-xs font-medium text-[#C9A96E] group-hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Action Items */}
        <Link href="/dashboard/work-orders" className="group">
          <Card className={`h-full hover:shadow-md transition-all cursor-pointer ${totalActionItems > 0 ? "border-amber-200" : ""}`}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Action Items</p>
                <AlertTriangle className={`h-4 w-4 ${totalActionItems > 0 ? "text-amber-500" : "text-emerald-500"}`} />
              </div>
              <p className={`font-display text-2xl font-bold ${totalActionItems > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {totalActionItems}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {submittedOrders?.length ?? 0} pending &bull; {overdueItems?.length ?? 0} overdue
              </p>
              <p className="mt-3 flex items-center gap-1 text-xs font-medium text-[#C9A96E] group-hover:underline">
                View work orders <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Outstanding */}
        <Link href="/dashboard/invoices" className="group">
          <Card className={`h-full hover:shadow-md transition-all cursor-pointer ${outstanding > 0 ? "border-amber-200" : ""}`}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Outstanding</p>
                <DollarSign className={`h-4 w-4 ${outstanding > 0 ? "text-amber-500" : "text-emerald-500"}`} />
              </div>
              <p className="font-display text-2xl font-bold text-[#0F1B2D] dark:text-white">
                {formatCurrency(outstanding)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Receivables due</p>
              <p className="mt-3 flex items-center gap-1 text-xs font-medium text-[#C9A96E] group-hover:underline">
                View invoices <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main content: Action Items + Messages */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Open Action Items */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">
              Open Action Items
            </h2>
            {totalActionItems > 0 && (
              <Badge variant="warning" className="text-xs">{totalActionItems} open</Badge>
            )}
          </div>

          {totalActionItems === 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 shrink-0">
                <span className="text-sm">✓</span>
              </div>
              <p className="text-sm font-medium text-emerald-700">All caught up -- no action items right now.</p>
            </div>
          )}

          {/* Submitted work orders needing scheduling */}
          {submittedOrders?.map(wo => (
            <Link key={wo.id} href={`/dashboard/work-orders/${wo.id}`}>
              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/40 p-4 hover:shadow-md transition-all">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 shrink-0">
                  <Wrench className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#0F1B2D] dark:text-white">{wo.title}</p>
                  <p className="text-sm text-slate-500 truncate">
                    {(wo as any).properties?.address} &bull; Awaiting scheduling
                  </p>
                </div>
                <PriorityBadge priority={wo.priority} />
              </div>
            </Link>
          ))}

          {/* Overdue maintenance */}
          {overdueItems?.map(item => {
            const daysOverdue = item.next_due ? Math.abs(getDaysUntil(item.next_due)) : 0
            return (
              <Link key={item.id} href={`/dashboard/properties/${item.property_id}`}>
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/40 p-4 hover:shadow-md transition-all">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 shrink-0">
                    <Calendar className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#0F1B2D] dark:text-white">{item.title}</p>
                    <p className="text-sm text-slate-500 truncate">
                      {(item as any).properties?.address} &bull; {daysOverdue}d overdue
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-xs shrink-0">Overdue</Badge>
                </div>
              </Link>
            )
          })}

          {/* Properties with no owner */}
          {unassignedProps.map(p => (
            <Link key={p.id} href={`/dashboard/properties/${p.id}`}>
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 shrink-0 dark:bg-slate-800">
                  <Home className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#0F1B2D] dark:text-white">{p.address}</p>
                  <p className="text-sm text-slate-500">No owner assigned</p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">Unassigned</Badge>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Client Messages */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">
              Client Messages
            </h2>
            <Link href="/dashboard/messages" className="flex items-center gap-1 text-sm text-[#C9A96E] hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentClientMessages.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900">
              <MessageSquare className="h-8 w-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No client messages yet</p>
            </div>
          )}

          {recentClientMessages.map((msg: any) => {
            const property = propertyById[msg.property_id]
            const clientName = clientNameById[msg.sender_id] ?? "Client"
            const initials = clientName.split(" ").map((n: string) => n[0]).join("")
            return (
              <Link key={msg.id} href={`/dashboard/messages/${msg.property_id}`}>
                <div className={`rounded-lg border p-3 hover:shadow-md transition-all ${
                  !msg.is_read
                    ? "border-[#C9A96E]/40 bg-[#C9A96E]/5"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0F1B2D] text-white text-xs font-semibold shrink-0">
                      {initials}
                    </div>
                    <p className="font-medium text-sm text-[#0F1B2D] dark:text-white flex-1 truncate">
                      {clientName}
                    </p>
                    {!msg.is_read && (
                      <div className="h-2 w-2 rounded-full bg-[#C9A96E] shrink-0" />
                    )}
                  </div>
                  {property && (
                    <p className="text-xs text-slate-400 mb-1 truncate">{property.address}</p>
                  )}
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{msg.body}</p>
                  <p className="text-xs text-slate-400 mt-1.5">{formatDateShort(msg.created_at)}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Proactive Alerts: Things to Watch */}
      {hasProactiveAlerts && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">
              Things to Watch
            </h2>
            <Badge variant="secondary" className="text-xs">
              {atRiskProperties.length + (expiringWarranties?.length ?? 0) + atRiskAssets.length} items
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {atRiskProperties.map(p => (
              <Link key={p.id} href={`/dashboard/properties/${p.id}`}>
                <div className="h-full rounded-lg border border-red-200 bg-red-50/50 p-4 hover:shadow-md transition-all dark:border-red-900 dark:bg-red-950/20">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-500">Low Health Score</p>
                  </div>
                  <p className="font-medium text-[#0F1B2D] dark:text-white">{p.address}</p>
                  <p className="text-sm text-slate-500 mt-0.5">Score: {p.health_score} -- needs attention</p>
                </div>
              </Link>
            ))}
            {expiringWarranties?.map(asset => (
              <Link key={asset.id} href={`/dashboard/properties/${asset.property_id}`}>
                <div className="h-full rounded-lg border border-amber-200 bg-amber-50/50 p-4 hover:shadow-md transition-all dark:border-amber-900 dark:bg-amber-950/20">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Package className="h-3.5 w-3.5 text-amber-500" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">Warranty Expiring</p>
                  </div>
                  <p className="font-medium text-[#0F1B2D] dark:text-white">{asset.name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {(asset as any).properties?.address} &bull; expires {formatDateShort(asset.warranty_expiration!)}
                  </p>
                </div>
              </Link>
            ))}
            {atRiskAssets.map(asset => (
              <Link key={asset.id} href={`/dashboard/properties/${asset.property_id}`}>
                <div className="h-full rounded-lg border border-slate-200 bg-white p-4 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Approaching End of Life</p>
                  </div>
                  <p className="font-medium text-[#0F1B2D] dark:text-white">{asset.name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {(asset as any).properties?.address} &bull; plan replacement soon
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled This Week */}
      {upcomingWork && upcomingWork.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">
            Scheduled This Week
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {upcomingWork.map(wo => (
              <Link key={wo.id} href={`/dashboard/work-orders/${wo.id}`}>
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 shrink-0">
                    <Clock className="h-4 w-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#0F1B2D] dark:text-white line-clamp-1">{wo.title}</p>
                    <p className="text-sm text-slate-500 truncate">
                      {(wo as any).properties?.address} &bull; {wo.scheduled_date ? formatDateShort(wo.scheduled_date) : "TBD"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "morning"
  if (hour < 17) return "afternoon"
  return "evening"
}
