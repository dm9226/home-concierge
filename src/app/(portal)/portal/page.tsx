import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { formatCurrency, formatDateShort, getDaysUntil } from "@/lib/utils"
import { CoverPhotoEditor } from "@/components/cover-photo-editor"
import { PortalOnboardingTracker } from "./onboarding-tracker"
import { onboardingSteps } from "@/lib/onboarding"
import {
  AlertTriangle, Wrench, ArrowRight, ChevronRight,
  Home, MessageSquare, CheckCircle2, Camera,
  Calendar, Clock, Shield, MapPin, AlertCircle,
  TrendingUp,
} from "lucide-react"

const CATEGORY_LABELS: Record<string, string> = {
  hvac: "HVAC", plumbing: "Plumbing", electrical: "Electrical",
  appliance: "Appliances", roofing: "Roofing", exterior: "Exterior",
  pool: "Pool", landscaping: "Landscaping", smart_home: "Smart Home",
  security: "Security", other: "Other",
}

const FREQ_LABELS: Record<string, string> = {
  monthly: "Monthly", quarterly: "Quarterly",
  semi_annual: "Every 6 mo", annual: "Annual", custom: "Custom",
}

export default async function PortalHomePage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: ownerships } = await supabase
    .from("property_owners")
    .select("property_id")
    .eq("user_id", user.id)

  const propertyIds = ownerships?.map(o => o.property_id) ?? []

  const { data: properties } = propertyIds.length
    ? await supabase
        .from("properties")
        .select("*")
        .in("id", propertyIds)
        .eq("status", "active")
        .order("created_at", { ascending: true })
    : { data: [] }

  if (!properties || properties.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="text-center">
          <Home className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h2 className="font-display text-xl font-semibold text-[#0F1B2D]">No properties yet</h2>
          <p className="mt-2 text-slate-500">Your home profile will appear here once your team sets it up.</p>
        </div>
      </div>
    )
  }

  const { p: selectedId } = await searchParams
  const property = properties.find(p => p.id === selectedId) ?? properties[0]
  const propertyId = property.id
  const now = new Date()
  const todayStr = now.toISOString().split("T")[0]
  const ninetyDaysStr = new Date(now.getTime() + 90 * 86400000).toISOString().split("T")[0]

  const [
    { data: allMaintenance },
    { data: assets },
    { data: openWorkOrders },
    { data: completedWorkOrders },
    { data: activeProjects },
    { data: unpaidInvoices },
    { data: unreadMessages },
    { data: upcomingVisits },
    { data: agreementRow },
    { data: recRows },
    { data: inspectionRows },
    { data: servicesRows },
    { data: onboardingInfo },
  ] = await Promise.all([
    supabase
      .from("maintenance_schedules")
      .select("id, title, category, frequency, next_due, last_completed, estimated_cost")
      .eq("property_id", propertyId)
      .eq("is_active", true)
      .order("next_due", { ascending: true }),

    supabase
      .from("assets")
      .select("id, name, category, warranty_expiration, install_date, expected_lifespan_years, brand")
      .eq("property_id", propertyId)
      .eq("status", "active")
      .order("category"),

    supabase
      .from("work_orders")
      .select("id, title, status, created_at, is_emergency, scheduled_date")
      .eq("property_id", propertyId)
      .in("status", ["submitted", "approved", "in_progress", "scheduled"])
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("work_orders")
      .select("id, title, completed_date, client_cost, category")
      .eq("property_id", propertyId)
      .eq("status", "completed")
      .order("completed_date", { ascending: false })
      .limit(4),

    supabase
      .from("projects")
      .select("id, title, status, target_completion_date, project_tasks(status)")
      .eq("property_id", propertyId)
      .in("status", ["planning", "in_progress"])
      .limit(3),

    supabase
      .from("invoices")
      .select("id, invoice_number, total, due_date, status")
      .eq("property_id", propertyId)
      .in("status", ["sent", "overdue"])
      .order("due_date", { ascending: true })
      .limit(3),

    supabase
      .from("messages")
      .select("id, body, created_at")
      .eq("property_id", propertyId)
      .neq("sender_id", user.id)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(1),

    supabase
      .from("work_orders")
      .select("id, title, scheduled_date")
      .eq("property_id", propertyId)
      .eq("status", "scheduled")
      .gte("scheduled_date", now.toISOString())
      .order("scheduled_date", { ascending: true })
      .limit(2),

    supabase.from("service_agreements").select("status").eq("property_id", propertyId).maybeSingle(),
    supabase.from("recommendations").select("status").eq("property_id", propertyId),
    supabase.from("property_inspections").select("id").eq("property_id", propertyId).eq("status", "complete").limit(1),
    supabase.from("recurring_services").select("id").eq("property_id", propertyId).eq("is_active", true).limit(1),
    supabase.from("property_onboarding").select("utility_providers, hoa_name").eq("property_id", propertyId).maybeSingle(),
  ])

  // Derived
  const overdueItems = allMaintenance?.filter(m => {
    const d = m.next_due ? getDaysUntil(m.next_due) : null
    return d !== null && d < 0
  }) ?? []
  const dueSoonItems = allMaintenance?.filter(m => {
    const d = m.next_due ? getDaysUntil(m.next_due) : null
    return d !== null && d >= 0 && d <= 30
  }) ?? []
  const upcomingMaintenance = allMaintenance?.filter(m => {
    const d = m.next_due ? getDaysUntil(m.next_due) : null
    return d === null || d > 30
  }) ?? []

  const expiringWarranties = (assets ?? []).filter(a => {
    if (!a.warranty_expiration) return false
    const d = getDaysUntil(a.warranty_expiration)
    return d !== null && d >= 0 && d <= 90
  })

  const assetCategories = [...new Set(assets?.map(a => a.category) ?? [])]
  const maintenanceCost = allMaintenance?.reduce((sum, m) => sum + (m.estimated_cost ?? 0), 0) ?? 0
  const completedWorkCost = completedWorkOrders?.reduce((sum, wo) => sum + (wo.client_cost ?? 0), 0) ?? 0

  const latestUnread = unreadMessages?.[0] ?? null
  const seasonalTip = getSeasonalTip(now.getMonth(), assetCategories, property.year_built)

  // Onboarding tracker + homeowner action items
  const obSteps = onboardingSteps({
    agreementAccepted: agreementRow?.status === "accepted",
    hasInspection: (inspectionRows?.length ?? 0) > 0,
    hasInfo: property.bedroom_count != null || !!onboardingInfo?.hoa_name ||
      (Array.isArray(onboardingInfo?.utility_providers) && (onboardingInfo!.utility_providers as unknown[]).length > 0),
    hasInventory: (assets?.length ?? 0) > 0,
    hasServices: (servicesRows?.length ?? 0) > 0,
    hasRecommendations: (recRows?.length ?? 0) > 0,
  })
  const obComplete = obSteps.every(s => s.done)
  const agreementActionable = agreementRow?.status === "sent"
  const pendingRecCount = (recRows ?? []).filter(r => r.status === "pending").length

  const healthScore = property.health_score ?? 0
  const healthColor = healthScore >= 80 ? "text-emerald-400" : healthScore >= 60 ? "text-amber-400" : "text-red-400"
  const healthLabel = healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : "Needs Attention"
  const healthDesc = healthScore >= 80
    ? "Your home is well-maintained and protected."
    : healthScore >= 60
    ? "A few items need attention to keep your home in top shape."
    : "Your home needs attention in several areas."

  const marketData = property.market_data as Record<string, any> | null

  // Show first 8 maintenance items total (overdue first, then due soon, then upcoming)
  const displayMaintenance = [
    ...overdueItems,
    ...dueSoonItems,
    ...upcomingMaintenance,
  ].slice(0, 8)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* ── PROPERTY SWITCHER (only when multiple) ───────────────────── */}
      {properties.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {properties.map(p => (
            <Link
              key={p.id}
              href={`/portal?p=${p.id}`}
              className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                p.id === property.id
                  ? "border-[#C9A96E] bg-[#C9A96E]/10 text-[#0F1B2D] dark:text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
              }`}
            >
              <p className="font-semibold">{p.address}</p>
              <p className="text-xs opacity-70">{p.city}, {p.state}</p>
            </Link>
          ))}
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CoverPhotoEditor
          propertyId={property.id}
          coverPhotoUrl={property.cover_photo_url}
          address={`${property.address}, ${property.city}, ${property.state} ${property.zip}`}
          latitude={property.latitude ? Number(property.latitude) : null}
          longitude={property.longitude ? Number(property.longitude) : null}
          canEdit
          className="h-44"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-bold text-white leading-snug">{property.address}</h1>
              <p className="text-sm text-white/75 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                {property.city}, {property.state} {property.zip}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-center bg-black/40 backdrop-blur-sm rounded-xl px-3 py-2">
              <p className={`font-display text-2xl font-bold leading-none ${healthColor}`}>{healthScore}</p>
              <p className="text-[10px] text-white/60 mt-0.5 whitespace-nowrap">{healthLabel}</p>
            </div>
          </div>
        </CoverPhotoEditor>

        {/* 4-column stats bar */}
        <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          <div className="flex flex-col items-center py-3 px-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Built</p>
            <p className="font-bold text-[#0F1B2D] dark:text-white text-sm mt-0.5">{property.year_built ?? "--"}</p>
          </div>
          <div className="flex flex-col items-center py-3 px-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Size</p>
            <p className="font-bold text-[#0F1B2D] dark:text-white text-sm mt-0.5">
              {property.square_footage ? `${(property.square_footage / 1000).toFixed(1)}k sf` : "--"}
            </p>
          </div>
          <div className="flex flex-col items-center py-3 px-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Systems</p>
            <p className="font-bold text-[#0F1B2D] dark:text-white text-sm mt-0.5">{assets?.length ?? 0}</p>
          </div>
          <div className="flex flex-col items-center py-3 px-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Tasks</p>
            <p className="font-bold text-[#0F1B2D] dark:text-white text-sm mt-0.5">{allMaintenance?.length ?? 0}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 p-4 border-t border-slate-100 dark:border-slate-800">
          <Link
            href="/portal/service/emergency"
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/25 hover:bg-red-700 transition-colors"
          >
            <AlertTriangle className="h-4 w-4" />
            Emergency
          </Link>
          <Link
            href="/portal/service/new"
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#0F1B2D] px-4 py-2.5 text-sm font-medium text-[#0F1B2D] hover:bg-[#0F1B2D]/5 transition-colors dark:border-slate-600 dark:text-white"
          >
            <Wrench className="h-4 w-4" />
            Request Service
          </Link>
        </div>
      </div>

      {/* ── ONBOARDING TRACKER (until setup complete) ────────────────── */}
      {!obComplete && (
        <PortalOnboardingTracker steps={obSteps} propertyId={propertyId} agreementActionable={agreementActionable} />
      )}

      {/* ── COVER PHOTO PROMPT ───────────────────────────────────────── */}
      {!property.cover_photo_url && !process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY && (
        <div className="flex items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Camera className="h-5 w-5 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[#0F1B2D] dark:text-white text-sm">Personalize your home profile</p>
            <p className="text-xs text-slate-500 mt-0.5">Add a photo to make your dashboard feel like home. Tap the camera icon above.</p>
          </div>
        </div>
      )}

      {/* ── ALERTS ────────────────────────────────────────────────────── */}
      {(agreementActionable || pendingRecCount > 0 || latestUnread || overdueItems.length > 0 || (unpaidInvoices?.length ?? 0) > 0 || (upcomingVisits?.length ?? 0) > 0 || expiringWarranties.length > 0) && (
        <div className="space-y-2">
          {agreementActionable && (
            <Link href={`/portal/property?id=${propertyId}&tab=agreement`}>
              <div className="flex items-center justify-between rounded-xl border border-[#C9A96E]/50 bg-[#C9A96E]/10 p-4 hover:border-[#C9A96E] transition-colors">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#C9A96E] shrink-0" />
                  <div>
                    <p className="font-semibold text-[#0F1B2D] dark:text-white">Action needed: sign your service agreement</p>
                    <p className="text-sm text-slate-500">Review the terms and accept to get started.</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
              </div>
            </Link>
          )}

          {pendingRecCount > 0 && (
            <Link href={`/portal/property?id=${propertyId}&tab=recommendations`}>
              <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 hover:border-amber-300 transition-colors dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-300">
                      {pendingRecCount} recommendation{pendingRecCount > 1 ? "s" : ""} awaiting your decision
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">Approve, defer, or decline recommended work.</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-amber-400 shrink-0" />
              </div>
            </Link>
          )}

          {latestUnread && (
            <Link href="/portal/messages">
              <div className="flex items-start gap-3 rounded-xl border border-[#C9A96E]/40 bg-[#C9A96E]/8 p-4 hover:border-[#C9A96E]/70 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0F1B2D] text-white text-xs font-semibold shrink-0 mt-0.5">CC</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-sm text-[#0F1B2D] dark:text-white">New message from your team</p>
                    <div className="h-2 w-2 rounded-full bg-[#C9A96E] shrink-0" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1">{latestUnread.body}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 shrink-0 mt-1" />
              </div>
            </Link>
          )}

          {overdueItems.length > 0 && (
            <Link href="/portal/maintenance">
              <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 hover:border-red-300 transition-colors dark:border-red-900/40 dark:bg-red-950/20">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-red-800 dark:text-red-300">
                      {overdueItems.length} maintenance {overdueItems.length === 1 ? "task" : "tasks"} overdue
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {overdueItems[0].title}{overdueItems.length > 1 ? ` and ${overdueItems.length - 1} more` : ""}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-red-400 shrink-0" />
              </div>
            </Link>
          )}

          {expiringWarranties.length > 0 && (
            <Link href="/portal/property">
              <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 hover:border-amber-300 transition-colors dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-300">
                      {expiringWarranties[0].name} warranty expiring
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      {getDaysUntil(expiringWarranties[0].warranty_expiration!) === 0
                        ? "Expires today"
                        : `${getDaysUntil(expiringWarranties[0].warranty_expiration!)}d remaining`}
                      {expiringWarranties.length > 1 ? ` + ${expiringWarranties.length - 1} more` : ""}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-amber-400 shrink-0" />
              </div>
            </Link>
          )}

          {unpaidInvoices && unpaidInvoices.length > 0 && (
            <Link href="/portal/invoices">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="font-semibold text-[#0F1B2D] dark:text-white">
                    {unpaidInvoices.length} invoice{unpaidInvoices.length > 1 ? "s" : ""} outstanding
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatCurrency(unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0))} total due
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
              </div>
            </Link>
          )}

          {upcomingVisits && upcomingVisits.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
              <Calendar className="h-5 w-5 text-violet-500 shrink-0" />
              <div>
                <p className="font-semibold text-violet-800 dark:text-violet-300">Upcoming visit</p>
                <p className="text-sm text-violet-600 dark:text-violet-400">
                  {upcomingVisits[0].title} &bull; {upcomingVisits[0].scheduled_date ? formatDateShort(upcomingVisits[0].scheduled_date) : "Scheduled"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HOME CARE PLAN (dark card) ─────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0F1B2D] to-[#1e3452] p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#C9A96E] mb-4">Your Home Care Plan</p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="font-display text-2xl font-bold">{allMaintenance?.length ?? 0}</p>
            <p className="text-[11px] text-white/55 mt-0.5 leading-tight">Annual<br />Tasks</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="font-display text-2xl font-bold">{assets?.length ?? 0}</p>
            <p className="text-[11px] text-white/55 mt-0.5 leading-tight">Systems<br />Tracked</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="font-display text-2xl font-bold">{completedWorkOrders?.length ?? 0}</p>
            <p className="text-[11px] text-white/55 mt-0.5 leading-tight">Jobs<br />Completed</p>
          </div>
        </div>

        {maintenanceCost > 0 && (
          <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3 mb-4">
            <div>
              <p className="text-[11px] text-white/55 uppercase tracking-wider">Estimated Annual Maintenance Value</p>
              <p className="font-display text-xl font-bold text-[#C9A96E] mt-0.5">{formatCurrency(maintenanceCost)}</p>
            </div>
            <Shield className="h-8 w-8 text-[#C9A96E]/30" />
          </div>
        )}

        {completedWorkCost > 0 && (
          <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3 mb-4">
            <div>
              <p className="text-[11px] text-white/55 uppercase tracking-wider">Total Work Completed for You</p>
              <p className="font-display text-xl font-bold text-[#C9A96E] mt-0.5">{formatCurrency(completedWorkCost)}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-[#C9A96E]/30" />
          </div>
        )}

        <div className="border-t border-white/10 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#C9A96E] mb-2">{seasonalTip.season} Tip from Your Team</p>
          <p className="font-display font-semibold leading-snug mb-2">{seasonalTip.title}</p>
          <p className="text-sm text-white/65 leading-relaxed">{seasonalTip.body}</p>
          <Link href="/portal/maintenance" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#C9A96E] hover:underline">
            View maintenance schedule <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ── PROPERTY DETAILS ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Home className="h-4 w-4 text-[#C9A96E]" />
          <p className="font-semibold text-sm text-[#0F1B2D] dark:text-white">Property Details</p>
          <Link href={`/portal/property?id=${propertyId}`} className="ml-auto text-xs text-[#C9A96E] flex items-center gap-1 hover:underline">
            Full profile <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {property.property_type && (
            <PropRow label="Type" value={property.property_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} />
          )}
          {property.year_built && <PropRow label="Year Built" value={String(property.year_built)} />}
          {property.square_footage && (
            <PropRow label="Size" value={`${property.square_footage.toLocaleString()} sq ft`} />
          )}
          {property.lot_size && <PropRow label="Lot Size" value={property.lot_size} />}
          {property.contract_start_date && (
            <PropRow label="Managed Since" value={formatDateShort(property.contract_start_date)} />
          )}
          <PropRow
            label="Management Plan"
            value={`${formatCurrency(property.fee_amount)} / ${property.billing_period === "annually" ? "year" : property.billing_period === "quarterly" ? "quarter" : "month"}`}
          />
        </div>
      </div>

      {/* ── MARKET DATA ────────────────────────────────────────────────── */}
      {marketData && Object.keys(marketData).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#C9A96E]" />
            <p className="font-semibold text-sm text-[#0F1B2D] dark:text-white">Market Context</p>
            {property.zip && <span className="ml-auto text-xs text-slate-400">{property.zip}</span>}
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {marketData.median_home_value && (
              <PropRow label="Median Home Value" value={formatCurrency(marketData.median_home_value)} />
            )}
            {marketData.price_per_sqft && (
              <PropRow label="Price per Sq Ft" value={`$${marketData.price_per_sqft}`} />
            )}
            {marketData.days_on_market && (
              <PropRow label="Avg Days on Market" value={`${marketData.days_on_market} days`} />
            )}
            {marketData.market_trend && (
              <PropRow label="Market Trend" value={marketData.market_trend} />
            )}
            {marketData.appreciation_rate && (
              <PropRow label="1-Year Appreciation" value={`${marketData.appreciation_rate}%`} />
            )}
          </div>
        </div>
      )}

      {/* ── MAINTENANCE SCHEDULE ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">Maintenance Schedule</h2>
          <Link href="/portal/maintenance" className="text-sm text-[#C9A96E] flex items-center gap-1 hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {displayMaintenance.length > 0 ? (
          <div className="space-y-2">
            {displayMaintenance.map(item => {
              const days = item.next_due ? getDaysUntil(item.next_due) : null
              const isOverdue = days !== null && days < 0
              const isSoon = days !== null && days >= 0 && days <= 30
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 ${
                    isOverdue
                      ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
                      : isSoon
                      ? "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20"
                      : "border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${isOverdue ? "text-red-800 dark:text-red-300" : "text-[#0F1B2D] dark:text-white"}`}>
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{FREQ_LABELS[item.frequency] ?? item.frequency}</span>
                      {item.estimated_cost != null && (
                        <span className="text-xs text-slate-400">&bull; {formatCurrency(item.estimated_cost)}</span>
                      )}
                      {item.last_completed && (
                        <span className="text-xs text-slate-400">&bull; Done {formatDateShort(item.last_completed)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold whitespace-nowrap ${
                      isOverdue ? "text-red-600" : isSoon ? "text-amber-600" : "text-slate-500 dark:text-slate-400"
                    }`}>
                      {item.next_due ? formatDateShort(item.next_due) : "Scheduled"}
                    </p>
                    <p className={`text-xs ${isOverdue ? "text-red-500" : isSoon ? "text-amber-500" : "text-slate-400"}`}>
                      {isOverdue
                        ? `${Math.abs(days!)}d overdue`
                        : days === 0 ? "Due today"
                        : days !== null ? `in ${days}d`
                        : ""}
                    </p>
                  </div>
                </div>
              )
            })}
            {(allMaintenance?.length ?? 0) > 8 && (
              <Link
                href="/portal/maintenance"
                className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm text-slate-500 hover:border-[#C9A96E] hover:text-[#C9A96E] transition-colors"
              >
                +{(allMaintenance?.length ?? 0) - 8} more tasks <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 p-6 text-center">
            <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="font-medium text-slate-600 dark:text-slate-400">Your maintenance plan is being set up</p>
            <p className="text-sm text-slate-400 mt-1">Your team will add your personalized annual schedule once your home is fully onboarded.</p>
          </div>
        )}
      </div>

      {/* ── HOME SYSTEMS ─────────────────────────────────────────────── */}
      {assets && assets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">Your Home Systems</h2>
            <Link href="/portal/property" className="text-sm text-[#C9A96E] flex items-center gap-1 hover:underline">
              Details <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(
              assets.reduce((acc, a) => {
                if (!acc[a.category]) acc[a.category] = []
                acc[a.category].push(a)
                return acc
              }, {} as Record<string, typeof assets>)
            ).map(([category, items]) => {
              const hasExpiring = items.some(a => {
                if (!a.warranty_expiration) return false
                const d = getDaysUntil(a.warranty_expiration)
                return d !== null && d >= 0 && d <= 90
              })
              return (
                <div
                  key={category}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 bg-white dark:bg-slate-900 ${
                    hasExpiring ? "border-amber-200 dark:border-amber-900/40" : "border-slate-200/80 dark:border-slate-800"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#0F1B2D] dark:text-white">{CATEGORY_LABELS[category] ?? category}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{items.length} {items.length === 1 ? "system" : "systems"}</p>
                  </div>
                  {hasExpiring && <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
                  {!hasExpiring && items.some(a => a.warranty_expiration) && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ACTIVE SERVICE ───────────────────────────────────────────── */}
      {openWorkOrders && openWorkOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">Active Service</h2>
            <Link href="/portal/service" className="text-sm text-[#C9A96E] flex items-center gap-1 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {openWorkOrders.map(wo => (
              <Link
                key={wo.id}
                href={`/portal/service/${wo.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {wo.is_emergency && <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-medium">Emergency</span>}
                    <p className="font-medium text-[#0F1B2D] dark:text-white text-sm">{wo.title}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {wo.status === "scheduled" && wo.scheduled_date
                      ? `Scheduled ${formatDateShort(wo.scheduled_date)}`
                      : `Submitted ${formatDateShort(wo.created_at)}`}
                  </p>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                    wo.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                    wo.status === "scheduled" ? "bg-violet-100 text-violet-700" :
                    wo.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {wo.status.replace("_", " ")}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── ACTIVE PROJECTS ──────────────────────────────────────────── */}
      {activeProjects && activeProjects.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white mb-3">Active Projects</h2>
          <div className="space-y-3">
            {activeProjects.map(project => {
              const tasks = (project as any).project_tasks ?? []
              const completed = tasks.filter((t: any) => t.status === "completed").length
              const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0
              return (
                <div key={project.id} className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-[#0F1B2D] dark:text-white">{project.title}</p>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                      project.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {project.status.replace("_", " ")}
                    </span>
                  </div>
                  {tasks.length > 0 && (
                    <>
                      <div className="h-1.5 rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-[#C9A96E]" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-400">{progress}% complete &bull; {completed}/{tasks.length} steps done</p>
                    </>
                  )}
                  {project.target_completion_date && (
                    <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Target: {formatDateShort(project.target_completion_date)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── RECENT WORK ──────────────────────────────────────────────── */}
      {completedWorkOrders && completedWorkOrders.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white mb-3">Recently Completed</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-3 pl-10">
              {completedWorkOrders.map(wo => (
                <div key={wo.id} className="relative">
                  <div className="absolute -left-6 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#C9A96E] bg-white dark:bg-slate-950">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#C9A96E]" />
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-3">
                    <p className="font-medium text-sm text-[#0F1B2D] dark:text-white">{wo.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="capitalize">{(wo.category ?? "").replace("_", " ")}</span>
                      {wo.completed_date && <span>{formatDateShort(wo.completed_date)}</span>}
                      {wo.client_cost && (
                        <span className="font-semibold text-[#0F1B2D] dark:text-white">{formatCurrency(wo.client_cost)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── YOUR TEAM ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">Your Team</p>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0F1B2D] text-white font-bold shrink-0 text-sm">
            CC
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[#0F1B2D] dark:text-white">Carefree Casa</p>
            <p className="text-sm text-slate-500">Home Management Team</p>
          </div>
          <Link
            href="/portal/messages"
            className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/5"
          >
            <MessageSquare className="h-4 w-4" />
            Message
          </Link>
        </div>
      </div>
    </div>
  )
}

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-2.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-[#0F1B2D] dark:text-white">{value}</span>
    </div>
  )
}

interface SeasonalTip { season: string; title: string; body: string }

function getSeasonalTip(month: number, assetCategories: string[], yearBuilt?: number | null): SeasonalTip {
  const hasPool = assetCategories.includes("pool")
  const hasHVAC = assetCategories.includes("hvac")
  const isOlderHome = yearBuilt ? (new Date().getFullYear() - yearBuilt) > 25 : false

  if (month === 11 || month === 0 || month === 1) {
    if (hasHVAC) return { season: "Winter", title: "Keep your heating system at peak performance", body: "Replace your HVAC filter monthly during heavy heating use and keep all supply vents clear of furniture. A clean filter can reduce energy use by up to 15%." }
    if (isOlderHome) return { season: "Winter", title: "Protect your pipes this season", body: "Homes built before 2000 often have less pipe insulation. Know where your main water shutoff is, and let faucets drip slightly during freezing nights to prevent costly burst pipes." }
    return { season: "Winter", title: "Winter home protection checklist", body: "Check that all exterior hose bibs are capped, weather stripping on doors and windows is intact, and smoke and carbon monoxide detectors have fresh batteries." }
  }
  if (month >= 2 && month <= 4) {
    if (hasPool) return { season: "Spring", title: "Time to open your pool", body: "Before the first swim, have a professional inspect the pump, filter, and liner. Balance pH and alkalinity now to avoid algae season. Opening in May saves money vs. rushed June openings." }
    if (hasHVAC) return { season: "Spring", title: "Schedule your AC tune-up now", body: "Book your annual AC service before the summer rush drives up prices and wait times. Technicians are more available in April and May, and a tuned system runs 10-25% more efficiently." }
    return { season: "Spring", title: "Spring exterior walkthrough", body: "Walk the full perimeter and inspect gutters, downspouts, caulking around windows, and the roof after winter stress. Catching small issues now prevents expensive repairs come summer." }
  }
  if (month >= 5 && month <= 7) {
    if (hasPool) return { season: "Summer", title: "Stay on top of pool chemistry", body: "High temperatures and heavy use deplete sanitizer quickly. Test pool water 2-3 times per week and shock after large gatherings. Keeping chemistry balanced prevents equipment damage." }
    if (hasHVAC) return { season: "Summer", title: "Maximize cooling efficiency", body: "Set ceiling fans counter-clockwise to push cool air down. Keep blinds on south and west-facing windows closed during peak hours. A programmable thermostat that raises temps when you're away can cut AC costs by 10%." }
    return { season: "Summer", title: "Check your attic and roof", body: "Summer heat builds up fastest in attics. Inspect attic ventilation and insulation to keep cooling costs down. Also a good time to walk the roof and check flashing around chimneys and skylights." }
  }
  if (hasPool) return { season: "Fall", title: "Winterize your pool before the first freeze", body: "If temperatures regularly drop below 40 degrees, your pool needs winterization before season end. Contact your pool service provider by late October to avoid emergency freeze damage." }
  if (hasHVAC) return { season: "Fall", title: "Prep your heating system before you need it", body: "Test your thermostat in heat mode now, before the first cold snap. Schedule a heating inspection in September or October when HVAC companies have more availability and better pricing." }
  return { season: "Fall", title: "Fall is the best time for exterior prep", body: "Clean gutters after the last leaves fall, caulk any gaps around windows and doors, and have your chimney inspected before fireplace season. Small investments in fall prevent large repairs in winter." }
}
