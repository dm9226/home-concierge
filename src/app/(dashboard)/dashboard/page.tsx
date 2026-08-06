import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PriorityBadge } from "@/components/status-badge"
import { formatCurrency, formatDateShort, getDaysUntil } from "@/lib/utils"
import {
  Building2, Wrench, Calendar, AlertTriangle, TrendingUp,
  Plus, ArrowRight, Clock, DollarSign, Home, MessageSquare,
  ShieldAlert, Package, Star, ClipboardList, CheckCircle2, Circle,
} from "lucide-react"
import { onboardingSteps } from "@/lib/onboarding"

export default async function DashboardPage() {
  // Auth check via session client (respects RLS -- good for auth)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const userId = user.id

  const { data: profile } = await supabase.from("users").select("*").eq("id", userId).single()
  if (!profile) redirect("/login")

  // All data fetches use the admin client so RLS never limits company-wide visibility.
  // Role has already been verified above.
  const admin = createAdminClient()

  // Step 1: all active properties (company-wide)
  const { data: properties } = await admin
    .from("properties")
    .select("*, client:users!properties_client_id_fkey(id, full_name, email)")
    .eq("status", "active")
    .order("created_at", { ascending: false })

  const propertyIds = properties?.map(p => p.id) ?? []

  // Health score only counts once a property has a completed inspection
  const { data: dashAssessedRows } = propertyIds.length
    ? await admin
        .from("property_inspections")
        .select("property_id")
        .eq("status", "complete")
        .in("property_id", propertyIds)
    : { data: [] }
  const assessedSet = new Set((dashAssessedRows ?? []).map(r => r.property_id))

  const clientIds = properties
    ?.map(p => p.client_id)
    .filter((id): id is string => !!id) ?? []

  // Which properties are specifically assigned to the current user
  const myPropertyIds = new Set(
    properties?.filter(p => p.primary_concierge_id === userId).map(p => p.id) ?? []
  )

  const propertyById: Record<string, { address: string; city: string }> = {}
  const clientNameById: Record<string, string> = {}
  properties?.forEach(p => {
    propertyById[p.id] = { address: p.address, city: p.city }
    const client = (p as any).client
    if (p.client_id && client?.full_name) clientNameById[p.client_id] = client.full_name
  })

  const assessedProps = (properties ?? []).filter(p => assessedSet.has(p.id))
  const avgHealthScore = assessedProps.length
    ? Math.round(assessedProps.reduce((sum, p) => sum + (p.health_score ?? 0), 0) / assessedProps.length)
    : null

  const now = new Date()
  const ttmStart = new Date(now); ttmStart.setFullYear(ttmStart.getFullYear() - 1)
  const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7)
  const ninetyDays = new Date(now); ninetyDays.setDate(now.getDate() + 90)
  const todayStr = now.toISOString().split("T")[0]

  // Step 2: parallel fetch everything -- all scoped to all company properties
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
    { count: openWorkOrders },
  ] = await Promise.all([
    propertyIds.length
      ? admin.from("work_orders")
          .select("id, title, property_id, assigned_to, properties(address)")
          .in("property_id", propertyIds)
          .eq("is_emergency", true)
          .not("status", "in", '("completed","cancelled")')
      : Promise.resolve({ data: [], error: null }),

    propertyIds.length
      ? admin.from("invoices")
          .select("total")
          .in("property_id", propertyIds)
          .in("status", ["paid", "sent", "overdue"])
          .gte("created_at", ttmStart.toISOString())
      : Promise.resolve({ data: [], error: null }),

    propertyIds.length
      ? admin.from("invoices")
          .select("total")
          .in("property_id", propertyIds)
          .eq("status", "paid")
          .gte("created_at", monthStart.toISOString())
      : Promise.resolve({ data: [], error: null }),

    propertyIds.length
      ? admin.from("invoices")
          .select("total")
          .in("property_id", propertyIds)
          .in("status", ["sent", "overdue"])
      : Promise.resolve({ data: [], error: null }),

    propertyIds.length
      ? admin.from("work_orders")
          .select("id, title, priority, property_id, assigned_to, properties(address, city)")
          .in("property_id", propertyIds)
          .eq("status", "submitted")
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [], error: null }),

    propertyIds.length
      ? admin.from("maintenance_schedules")
          .select("id, title, next_due, property_id, properties(address, city)")
          .in("property_id", propertyIds)
          .eq("is_active", true)
          .lt("next_due", todayStr)
          .order("next_due", { ascending: true })
          .limit(8)
      : Promise.resolve({ data: [], error: null }),

    propertyIds.length
      ? admin.from("work_orders")
          .select("id, title, scheduled_date, property_id, assigned_to, properties(address, city)")
          .in("property_id", propertyIds)
          .eq("status", "scheduled")
          .gte("scheduled_date", now.toISOString())
          .lte("scheduled_date", nextWeek.toISOString())
          .order("scheduled_date", { ascending: true })
          .limit(8)
      : Promise.resolve({ data: [], error: null }),

    clientIds.length
      ? admin.from("messages")
          .select("id, body, created_at, property_id, sender_id, is_read")
          .in("property_id", propertyIds)
          .in("sender_id", clientIds)
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] as any[], error: null }),

    propertyIds.length
      ? admin.from("assets")
          .select("id, name, warranty_expiration, property_id, properties(address)")
          .in("property_id", propertyIds)
          .eq("status", "active")
          .not("warranty_expiration", "is", null)
          .gte("warranty_expiration", todayStr)
          .lte("warranty_expiration", ninetyDays.toISOString().split("T")[0])
          .order("warranty_expiration", { ascending: true })
          .limit(4)
      : Promise.resolve({ data: [], error: null }),

    propertyIds.length
      ? admin.from("assets")
          .select("id, name, install_date, expected_lifespan_years, property_id, properties(address)")
          .in("property_id", propertyIds)
          .eq("status", "active")
          .not("install_date", "is", null)
          .not("expected_lifespan_years", "is", null)
      : Promise.resolve({ data: [], error: null }),

    propertyIds.length
      ? admin.from("work_orders")
          .select("*", { count: "exact", head: true })
          .in("property_id", propertyIds)
          .not("status", "in", '("completed","cancelled")')
      : Promise.resolve({ count: 0, error: null }),
  ])

  // Onboarding progress across every property, computed in bulk so the
  // dashboard can flag homes that still have setup steps outstanding.
  const [
    { data: agreementRows },
    { data: assetPropRows },
    { data: servicePropRows },
    { data: recPropRows },
    { data: onboardingRows },
  ] = propertyIds.length
    ? await Promise.all([
        admin.from("service_agreements").select("property_id, status").in("property_id", propertyIds),
        admin.from("assets").select("property_id").in("property_id", propertyIds).eq("status", "active"),
        admin.from("recurring_services").select("property_id").in("property_id", propertyIds).eq("is_active", true),
        admin.from("recommendations").select("property_id").in("property_id", propertyIds),
        admin.from("property_onboarding").select("property_id, hoa_name, utility_providers").in("property_id", propertyIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }] as any

  const agreementAcceptedSet = new Set((agreementRows ?? []).filter((r: any) => r.status === "accepted").map((r: any) => r.property_id))
  const inventorySet = new Set((assetPropRows ?? []).map((r: any) => r.property_id))
  const servicesSet = new Set((servicePropRows ?? []).map((r: any) => r.property_id))
  const recsSet = new Set((recPropRows ?? []).map((r: any) => r.property_id))
  const infoSet = new Set(
    (onboardingRows ?? [])
      .filter((r: any) => !!r.hoa_name || (Array.isArray(r.utility_providers) && r.utility_providers.length > 0))
      .map((r: any) => r.property_id)
  )

  const onboardingProperties = (properties ?? [])
    .map(p => {
      const steps = onboardingSteps({
        agreementAccepted: agreementAcceptedSet.has(p.id),
        hasInspection: assessedSet.has(p.id),
        hasInfo: p.bedroom_count != null || infoSet.has(p.id),
        hasInventory: inventorySet.has(p.id),
        hasServices: servicesSet.has(p.id),
        hasRecommendations: recsSet.has(p.id),
      })
      const remaining = steps.filter(s => !s.done)
      return { property: p, steps, remaining, done: steps.length - remaining.length, total: steps.length }
    })
    .filter(x => x.remaining.length > 0)
    // Least-complete first, so the homes needing the most work rise to the top
    .sort((a, b) => a.done - b.done)

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
  const atRiskProperties = (properties ?? []).filter(p => assessedSet.has(p.id) && (p.health_score ?? 100) < 65)
  const recentClientMessages = (rawClientMessages ?? []) as any[]

  const totalActionItems =
    (submittedOrders?.length ?? 0) +
    (overdueItems?.length ?? 0) +
    unassignedProps.length

  const hasProactiveAlerts =
    atRiskProperties.length > 0 ||
    (expiringWarranties?.length ?? 0) > 0 ||
    atRiskAssets.length > 0

  // Items specifically assigned to / related to the current user
  function isMyItem(propertyId: string, assignedTo?: string | null) {
    return assignedTo === userId || myPropertyIds.has(propertyId)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#1A2320] dark:text-white">
            Good {getTimeOfDay()}, {profile.full_name.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {myPropertyIds.size > 0 && (
              <span className="ml-2 text-[#0E7C67]">
                &bull; {myPropertyIds.size} {myPropertyIds.size === 1 ? "property" : "properties"} assigned to you
              </span>
            )}
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
                {emergencies.map((e: any) => (
                  <Link key={e.id} href={`/dashboard/work-orders/${e.id}`} className="block text-sm text-red-700 hover:underline">
                    {e.properties?.address} -- {e.title}
                    {isMyItem(e.property_id, e.assigned_to) && (
                      <span className="ml-2 text-xs font-semibold text-red-600">(yours)</span>
                    )}
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
        <Link href="/dashboard/reports" className="group">
          <Card className="h-full hover:shadow-md transition-all cursor-pointer border-[#0E7C67]/30 hover:border-[#0E7C67]/60">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Revenue (TTM)</p>
                <TrendingUp className="h-4 w-4 text-[#0E7C67]" />
              </div>
              <p className="font-display text-2xl font-bold text-[#1A2320] dark:text-white">{formatCurrency(arr)}</p>
              <p className="text-xs text-slate-500 mt-1">+{formatCurrency(monthRevenue)} collected this month</p>
              <p className="mt-3 flex items-center gap-1 text-xs font-medium text-[#0E7C67] group-hover:underline">
                View reports <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/properties" className="group">
          <Card className="h-full hover:shadow-md transition-all cursor-pointer">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Properties</p>
                <Building2 className="h-4 w-4 text-blue-500" />
              </div>
              <p className="font-display text-2xl font-bold text-[#1A2320] dark:text-white">{properties?.length ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1">
                {avgHealthScore !== null ? `Avg health score: ${avgHealthScore}` : "Health scores pending inspection"}
                {myPropertyIds.size > 0 && <span className="text-[#0E7C67]"> &bull; {myPropertyIds.size} yours</span>}
              </p>
              <p className="mt-3 flex items-center gap-1 text-xs font-medium text-[#0E7C67] group-hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/work-orders" className="group">
          <Card className={`h-full hover:shadow-md transition-all cursor-pointer ${(openWorkOrders ?? 0) > 0 ? "border-amber-200" : ""}`}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Open Work Orders</p>
                <Wrench className={`h-4 w-4 ${(openWorkOrders ?? 0) > 0 ? "text-amber-500" : "text-slate-300"}`} />
              </div>
              <p className={`font-display text-2xl font-bold ${(openWorkOrders ?? 0) > 0 ? "text-amber-600" : "text-[#1A2320] dark:text-white"}`}>
                {openWorkOrders ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {(submittedOrders?.length ?? 0) > 0 ? `${submittedOrders!.length} awaiting approval` : "None awaiting approval"}
              </p>
              <p className="mt-3 flex items-center gap-1 text-xs font-medium text-[#0E7C67] group-hover:underline">
                View work orders <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/invoices" className="group">
          <Card className={`h-full hover:shadow-md transition-all cursor-pointer ${outstanding > 0 ? "border-amber-200" : ""}`}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Outstanding</p>
                <DollarSign className={`h-4 w-4 ${outstanding > 0 ? "text-amber-500" : "text-emerald-500"}`} />
              </div>
              <p className="font-display text-2xl font-bold text-[#1A2320] dark:text-white">{formatCurrency(outstanding)}</p>
              <p className="text-xs text-slate-500 mt-1">Receivables due</p>
              <p className="mt-3 flex items-center gap-1 text-xs font-medium text-[#0E7C67] group-hover:underline">
                View invoices <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Onboarding in progress */}
      {onboardingProperties.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#0E7C67]" />
            <h2 className="font-display text-lg font-semibold text-[#1A2320] dark:text-white">Onboarding in progress</h2>
            <Badge variant="secondary" className="text-xs">
              {onboardingProperties.length} {onboardingProperties.length === 1 ? "property" : "properties"}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 -mt-1">
            These homes still have setup steps to finish before they're fully onboarded.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {onboardingProperties.map(({ property: p, steps, remaining, done, total }) => {
              const pct = Math.round((done / total) * 100)
              const mine = myPropertyIds.has(p.id)
              return (
                <Link key={p.id} href={`/dashboard/properties/${p.id}`}>
                  <div className="h-full rounded-lg border border-[#0E7C67]/25 bg-[#0E7C67]/[0.03] p-4 hover:shadow-md hover:border-[#0E7C67]/50 transition-all dark:border-[#0E7C67]/30 dark:bg-[#0E7C67]/10">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-medium text-[#1A2320] dark:text-white truncate">{p.address}</p>
                        <p className="text-xs text-slate-500 truncate">{p.city}</p>
                      </div>
                      {mine && <Star className="h-3.5 w-3.5 text-[#0E7C67] shrink-0 mt-0.5" />}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full bg-[#0E7C67]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-slate-500 shrink-0">{done}/{total}</span>
                    </div>

                    <div className="space-y-1.5">
                      {steps.map(s => (
                        <div key={s.key} className="flex items-center gap-1.5 text-xs">
                          {s.done ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#0E7C67] shrink-0" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                          )}
                          <span className={s.done ? "text-slate-400 line-through" : "text-[#1A2320] dark:text-slate-200"}>
                            {s.label}
                          </span>
                          {!s.done && s.clientAction && (
                            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-amber-600 shrink-0">
                              Client
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <p className="mt-3 text-xs font-medium text-[#0E7C67]">
                      {remaining.length} {remaining.length === 1 ? "step" : "steps"} left &bull; open property &rarr;
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Open Action Items */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#1A2320] dark:text-white">Open Action Items</h2>
            {totalActionItems > 0 && (
              <Badge variant="warning" className="text-xs">{totalActionItems} open</Badge>
            )}
          </div>

          {totalActionItems === 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <span className="text-sm text-emerald-700">✓</span>
              <p className="text-sm font-medium text-emerald-700">All caught up -- no action items right now.</p>
            </div>
          )}

          {submittedOrders?.map((wo: any) => {
            const mine = isMyItem(wo.property_id, wo.assigned_to)
            return (
              <Link key={wo.id} href={`/dashboard/work-orders/${wo.id}`}>
                <div className={`flex items-center gap-3 rounded-lg border p-4 hover:shadow-md transition-all ${
                  mine
                    ? "border-[#0E7C67]/50 bg-[#0E7C67]/5"
                    : "border-amber-200 bg-amber-50/40"
                }`}>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${
                    mine ? "bg-[#0E7C67]/20" : "bg-amber-100"
                  }`}>
                    <Wrench className={`h-4 w-4 ${mine ? "text-[#0E7C67]" : "text-amber-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[#1A2320] dark:text-white">{wo.title}</p>
                      {mine && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#0E7C67] uppercase tracking-wide">
                          <Star className="h-2.5 w-2.5" /> Yours
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                      {wo.properties?.address} &bull; Awaiting scheduling
                    </p>
                  </div>
                  <PriorityBadge priority={wo.priority} />
                </div>
              </Link>
            )
          })}

          {overdueItems?.map((item: any) => {
            const daysOverdue = item.next_due ? Math.abs(getDaysUntil(item.next_due)) : 0
            const mine = myPropertyIds.has(item.property_id)
            return (
              <Link key={item.id} href={`/dashboard/properties/${item.property_id}`}>
                <div className={`flex items-center gap-3 rounded-lg border p-4 hover:shadow-md transition-all ${
                  mine ? "border-[#0E7C67]/50 bg-[#0E7C67]/5" : "border-amber-200 bg-amber-50/40"
                }`}>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${
                    mine ? "bg-[#0E7C67]/20" : "bg-amber-100"
                  }`}>
                    <Calendar className={`h-4 w-4 ${mine ? "text-[#0E7C67]" : "text-amber-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[#1A2320] dark:text-white">{item.title}</p>
                      {mine && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#0E7C67] uppercase tracking-wide">
                          <Star className="h-2.5 w-2.5" /> Yours
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                      {item.properties?.address} &bull; {daysOverdue}d overdue
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-xs shrink-0">Overdue</Badge>
                </div>
              </Link>
            )
          })}

          {unassignedProps.map(p => (
            <Link key={p.id} href={`/dashboard/properties/${p.id}`}>
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 shrink-0 dark:bg-slate-800">
                  <Home className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1A2320] dark:text-white">{p.address}</p>
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
            <h2 className="font-display text-lg font-semibold text-[#1A2320] dark:text-white">Client Messages</h2>
            <Link href="/dashboard/messages" className="flex items-center gap-1 text-sm text-[#0E7C67] hover:underline">
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
            const mine = myPropertyIds.has(msg.property_id)
            return (
              <Link key={msg.id} href={`/dashboard/messages/${msg.property_id}`}>
                <div className={`rounded-lg border p-3 hover:shadow-md transition-all ${
                  !msg.is_read
                    ? "border-[#0E7C67]/40 bg-[#0E7C67]/5"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1A2320] text-white text-xs font-semibold shrink-0">
                      {initials}
                    </div>
                    <p className="font-medium text-sm text-[#1A2320] dark:text-white flex-1 truncate">{clientName}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {mine && <Star className="h-3 w-3 text-[#0E7C67]" />}
                      {!msg.is_read && <div className="h-2 w-2 rounded-full bg-[#0E7C67]" />}
                    </div>
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

      {/* Things to Watch */}
      {hasProactiveAlerts && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-[#1A2320] dark:text-white">Things to Watch</h2>
            <Badge variant="secondary" className="text-xs">
              {atRiskProperties.length + (expiringWarranties?.length ?? 0) + atRiskAssets.length} items
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {atRiskProperties.map(p => (
              <Link key={p.id} href={`/dashboard/properties/${p.id}`}>
                <div className="h-full rounded-lg border border-red-200 bg-red-50/50 p-4 hover:shadow-md transition-all dark:border-red-900 dark:bg-red-950/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-red-500">Low Health Score</p>
                    </div>
                    {myPropertyIds.has(p.id) && <Star className="h-3 w-3 text-[#0E7C67]" />}
                  </div>
                  <p className="font-medium text-[#1A2320] dark:text-white">{p.address}</p>
                  <p className="text-sm text-slate-500 mt-0.5">Score: {p.health_score} -- needs attention</p>
                </div>
              </Link>
            ))}
            {expiringWarranties?.map((asset: any) => (
              <Link key={asset.id} href={`/dashboard/properties/${asset.property_id}`}>
                <div className="h-full rounded-lg border border-amber-200 bg-amber-50/50 p-4 hover:shadow-md transition-all dark:border-amber-900 dark:bg-amber-950/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-amber-500" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">Warranty Expiring</p>
                    </div>
                    {myPropertyIds.has(asset.property_id) && <Star className="h-3 w-3 text-[#0E7C67]" />}
                  </div>
                  <p className="font-medium text-[#1A2320] dark:text-white">{asset.name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {asset.properties?.address} &bull; expires {formatDateShort(asset.warranty_expiration!)}
                  </p>
                </div>
              </Link>
            ))}
            {atRiskAssets.map((asset: any) => (
              <Link key={asset.id} href={`/dashboard/properties/${asset.property_id}`}>
                <div className="h-full rounded-lg border border-slate-200 bg-white p-4 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">End of Life</p>
                    </div>
                    {myPropertyIds.has(asset.property_id) && <Star className="h-3 w-3 text-[#0E7C67]" />}
                  </div>
                  <p className="font-medium text-[#1A2320] dark:text-white">{asset.name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {asset.properties?.address} &bull; plan replacement soon
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
          <h2 className="font-display text-lg font-semibold text-[#1A2320] dark:text-white">Scheduled This Week</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {upcomingWork.map((wo: any) => {
              const mine = isMyItem(wo.property_id, wo.assigned_to)
              return (
                <Link key={wo.id} href={`/dashboard/work-orders/${wo.id}`}>
                  <div className={`flex items-center gap-3 rounded-lg border p-4 hover:shadow-md transition-all ${
                    mine
                      ? "border-[#0E7C67]/40 bg-[#0E7C67]/5"
                      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  }`}>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${
                      mine ? "bg-[#0E7C67]/20" : "bg-violet-50"
                    }`}>
                      <Clock className={`h-4 w-4 ${mine ? "text-[#0E7C67]" : "text-violet-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-[#1A2320] dark:text-white line-clamp-1">{wo.title}</p>
                        {mine && <Star className="h-3 w-3 text-[#0E7C67] shrink-0" />}
                      </div>
                      <p className="text-sm text-slate-500 truncate">
                        {wo.properties?.address} &bull; {wo.scheduled_date ? formatDateShort(wo.scheduled_date) : "TBD"}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
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
