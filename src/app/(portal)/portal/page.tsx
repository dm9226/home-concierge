import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { HealthScoreGauge } from "@/components/health-score-gauge"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency, formatDateShort, getDaysUntil } from "@/lib/utils"
import {
  AlertTriangle, Calendar, Wrench, ArrowRight, Clock,
  ChevronRight, Home, MessageSquare, CheckCircle2, Package,
} from "lucide-react"

export default async function PortalHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("client_id", user.id)
    .eq("status", "active")

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

  const property = properties[0]
  const propertyId = property.id

  const now = new Date()
  const ninetyDays = new Date(now); ninetyDays.setDate(now.getDate() + 90)
  const todayStr = now.toISOString().split("T")[0]

  const [
    { data: upcomingWork },
    { data: openWorkOrders },
    { data: nextMaintenance },
    { data: activeProjects },
    { data: unpaidInvoices },
    { data: recentCompleted },
    { data: unreadMessages },
    { data: assetCats },
    { data: expiringWarranties },
  ] = await Promise.all([
    supabase
      .from("work_orders")
      .select("*")
      .eq("property_id", propertyId)
      .eq("status", "scheduled")
      .gte("scheduled_date", now.toISOString())
      .order("scheduled_date", { ascending: true })
      .limit(3),

    supabase
      .from("work_orders")
      .select("*")
      .eq("property_id", propertyId)
      .in("status", ["submitted", "approved", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("maintenance_schedules")
      .select("*")
      .eq("property_id", propertyId)
      .eq("is_active", true)
      .order("next_due", { ascending: true })
      .limit(3),

    supabase
      .from("projects")
      .select("*, project_tasks(status)")
      .eq("property_id", propertyId)
      .in("status", ["planning", "in_progress"])
      .limit(2),

    supabase
      .from("invoices")
      .select("*")
      .eq("property_id", propertyId)
      .in("status", ["sent", "overdue"])
      .order("due_date", { ascending: true })
      .limit(3),

    supabase
      .from("work_orders")
      .select("id, title, completed_date")
      .eq("property_id", propertyId)
      .eq("status", "completed")
      .order("completed_date", { ascending: false })
      .limit(1),

    supabase
      .from("messages")
      .select("id, body, created_at")
      .eq("property_id", propertyId)
      .neq("sender_id", user.id)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(1),

    supabase
      .from("assets")
      .select("category")
      .eq("property_id", propertyId)
      .eq("status", "active"),

    supabase
      .from("assets")
      .select("id, name, warranty_expiration")
      .eq("property_id", propertyId)
      .eq("status", "active")
      .not("warranty_expiration", "is", null)
      .gte("warranty_expiration", todayStr)
      .lte("warranty_expiration", ninetyDays.toISOString().split("T")[0])
      .order("warranty_expiration", { ascending: true })
      .limit(2),

  ])

  const assetCategories = [...new Set(assetCats?.map(a => a.category) ?? [])]
  const assetTotalCount = assetCats?.length ?? 0
  const latestUnread = unreadMessages?.[0] ?? null
  const lastCompleted = recentCompleted?.[0] ?? null
  const seasonalTip = getSeasonalTip(now.getMonth(), assetCategories, property.year_built)

  const healthColor =
    (property.health_score ?? 0) >= 80
      ? "text-emerald-600"
      : (property.health_score ?? 0) >= 60
      ? "text-amber-500"
      : "text-red-500"

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Property Hero Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="h-40 relative overflow-hidden">
          {property.cover_photo_url ? (
            <img
              src={property.cover_photo_url}
              alt={property.address}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full navy-gradient flex items-center justify-center">
              <Home className="h-12 w-12 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div>
              <p className="font-display text-lg font-semibold text-white leading-snug">{property.address}</p>
              <p className="text-sm text-white/80">{property.city}, {property.state}</p>
            </div>
            <div className="text-right">
              <p className={`font-display text-3xl font-bold ${healthColor} drop-shadow-sm`}>
                {property.health_score ?? "--"}
              </p>
              <p className="text-xs text-white/70">health score</p>
            </div>
          </div>
        </div>

        {/* Property quick stats */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          <div className="flex flex-col items-center py-3 px-2">
            <p className="text-xs text-slate-400">
              {property.year_built ? "Built" : "Type"}
            </p>
            <p className="font-semibold text-[#0F1B2D] dark:text-white text-sm">
              {property.year_built ?? property.property_type?.replace("_", " ") ?? "--"}
            </p>
          </div>
          <div className="flex flex-col items-center py-3 px-2">
            <p className="text-xs text-slate-400">Items Tracked</p>
            <p className="font-semibold text-[#0F1B2D] dark:text-white text-sm">{assetTotalCount}</p>
          </div>
          <div className="flex flex-col items-center py-3 px-2">
            <p className="text-xs text-slate-400">Open Requests</p>
            <p className="font-semibold text-[#0F1B2D] dark:text-white text-sm">
              {openWorkOrders?.length ?? 0}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 p-4 border-t border-slate-100 dark:border-slate-800">
          <Link
            href="/portal/service/emergency"
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-700 transition-colors"
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

      {/* Unread message from team */}
      {latestUnread && (
        <Link href="/portal/messages">
          <div className="flex items-start gap-3 rounded-xl border border-[#C9A96E]/40 bg-[#C9A96E]/8 p-4 hover:border-[#C9A96E]/60 transition-colors">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0F1B2D] text-white text-xs font-semibold shrink-0 mt-0.5">
              CC
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-sm text-[#0F1B2D] dark:text-white">New message from your team</p>
                <div className="h-2 w-2 rounded-full bg-[#C9A96E] shrink-0" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{latestUnread.body}</p>
              <p className="text-xs text-slate-400 mt-1">{formatDateShort(latestUnread.created_at)}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 shrink-0 mt-1" />
          </div>
        </Link>
      )}

      {/* Unpaid invoices alert */}
      {unpaidInvoices && unpaidInvoices.length > 0 && (
        <Link href="/portal/invoices">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between hover:border-amber-300 transition-colors">
            <div>
              <p className="font-semibold text-amber-800">
                {unpaidInvoices.length} invoice{unpaidInvoices.length > 1 ? "s" : ""} awaiting payment
              </p>
              <p className="text-sm text-amber-700">
                Total due: {formatCurrency(unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0))}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-amber-600" />
          </div>
        </Link>
      )}

      {/* Seasonal Home Tip */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0F1B2D] to-[#1e3452] p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#C9A96E] mb-2">
          {seasonalTip.season} Home Tip
        </p>
        <p className="font-display text-lg font-semibold mb-2">{seasonalTip.title}</p>
        <p className="text-sm text-white/75 leading-relaxed">{seasonalTip.body}</p>
        <Link
          href="/portal/maintenance"
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#C9A96E] hover:underline"
        >
          View maintenance schedule <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Expiring warranties / property insights */}
      {expiringWarranties && expiringWarranties.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Warranty Alerts</p>
          <div className="space-y-2">
            {expiringWarranties.map(asset => {
              const days = getDaysUntil(asset.warranty_expiration!)
              return (
                <div key={asset.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="h-4 w-4 text-amber-500 shrink-0" />
                    <p className="text-sm font-medium text-[#0F1B2D] dark:text-white truncate">{asset.name}</p>
                  </div>
                  <span className="text-sm font-medium text-amber-500 shrink-0 whitespace-nowrap">
                    {days === 0 ? "Expires today" : `${days}d left`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming visits */}
      {upcomingWork && upcomingWork.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white mb-3">
            Upcoming Visits
          </h2>
          <div className="space-y-2">
            {upcomingWork.map(wo => (
              <div
                key={wo.id}
                className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50">
                  <Calendar className="h-5 w-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#0F1B2D] dark:text-white">{wo.title}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {wo.scheduled_date ? formatDateShort(wo.scheduled_date) : "TBD"}
                  </p>
                </div>
                <StatusBadge status={wo.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open requests */}
      {openWorkOrders && openWorkOrders.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">
              Active Requests
            </h2>
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
                <div>
                  <p className="font-medium text-[#0F1B2D] dark:text-white">{wo.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{formatDateShort(wo.created_at)}</p>
                </div>
                <StatusBadge status={wo.status} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active projects */}
      {activeProjects && activeProjects.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white mb-3">
            Active Projects
          </h2>
          <div className="space-y-3">
            {activeProjects.map(project => {
              const tasks = (project as any).project_tasks ?? []
              const completed = tasks.filter((t: any) => t.status === "completed").length
              const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0
              return (
                <Card key={project.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-[#0F1B2D] dark:text-white">{project.title}</p>
                      <StatusBadge status={project.status} />
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#C9A96E] transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">
                      {progress}% complete &bull; {completed}/{tasks.length} tasks
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* What we did recently */}
      {lastCompleted && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-0.5">Recently Completed</p>
            <p className="font-medium text-[#0F1B2D] dark:text-white">{lastCompleted.title}</p>
            {lastCompleted.completed_date && (
              <p className="text-sm text-slate-500 mt-0.5">{formatDateShort(lastCompleted.completed_date)}</p>
            )}
          </div>
        </div>
      )}

      {/* Upcoming maintenance */}
      {nextMaintenance && nextMaintenance.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">
              Upcoming Maintenance
            </h2>
            <Link href="/portal/maintenance" className="text-sm text-[#C9A96E] flex items-center gap-1 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {nextMaintenance.map(item => {
              const days = item.next_due ? getDaysUntil(item.next_due) : null
              const isOverdue = days !== null && days < 0
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <p className="font-medium text-[#0F1B2D] dark:text-white">{item.title}</p>
                  <span className={`text-sm font-medium whitespace-nowrap ${
                    isOverdue ? "text-red-500" : days !== null && days <= 14 ? "text-amber-500" : "text-slate-400"
                  }`}>
                    {isOverdue
                      ? `${Math.abs(days!)}d overdue`
                      : days === 0 ? "Today"
                      : days !== null ? `in ${days}d`
                      : "Scheduled"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Your team */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">Your Team</p>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0F1B2D] text-white font-semibold shrink-0">
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

interface SeasonalTip {
  season: string
  title: string
  body: string
}

function getSeasonalTip(month: number, assetCategories: string[], yearBuilt?: number | null): SeasonalTip {
  const hasPool = assetCategories.includes("pool")
  const hasHVAC = assetCategories.includes("hvac")
  const isOlderHome = yearBuilt ? (new Date().getFullYear() - yearBuilt) > 25 : false

  // Winter: Dec(11), Jan(0), Feb(1)
  if (month === 11 || month === 0 || month === 1) {
    if (hasHVAC) return {
      season: "Winter",
      title: "Keep your heating system at peak performance",
      body: "Replace your HVAC filter monthly during heavy heating use and keep all supply vents clear of furniture. A clean filter can reduce energy use by up to 15%.",
    }
    if (isOlderHome) return {
      season: "Winter",
      title: "Protect your pipes this season",
      body: "Homes built before 2000 often have less pipe insulation. Know where your main water shutoff is, and let faucets drip slightly during freezing nights to prevent costly burst pipes.",
    }
    return {
      season: "Winter",
      title: "Winter home protection checklist",
      body: "Check that all exterior hose bibs are capped, weather stripping on doors and windows is intact, and smoke and carbon monoxide detectors have fresh batteries.",
    }
  }

  // Spring: Mar(2), Apr(3), May(4)
  if (month >= 2 && month <= 4) {
    if (hasPool) return {
      season: "Spring",
      title: "Time to open your pool",
      body: "Before the first swim, have a professional inspect the pump, filter, and liner. Balance pH and alkalinity now to avoid algae season. Opening in May saves money vs. rushed June openings.",
    }
    if (hasHVAC) return {
      season: "Spring",
      title: "Schedule your AC tune-up now",
      body: "Book your annual AC service before the summer rush drives up prices and wait times. Technicians are more available in April and May, and a tuned system runs 10-25% more efficiently.",
    }
    return {
      season: "Spring",
      title: "Spring exterior walkthrough",
      body: "Walk the full perimeter and inspect gutters, downspouts, caulking around windows, and the roof after winter stress. Catching small issues now prevents expensive repairs come summer.",
    }
  }

  // Summer: Jun(5), Jul(6), Aug(7)
  if (month >= 5 && month <= 7) {
    if (hasPool) return {
      season: "Summer",
      title: "Stay on top of pool chemistry",
      body: "High temperatures and heavy use deplete sanitizer quickly. Test pool water 2-3 times per week and shock after large gatherings. Keeping chemistry balanced prevents equipment damage.",
    }
    if (hasHVAC) return {
      season: "Summer",
      title: "Maximize cooling efficiency",
      body: "Set ceiling fans counter-clockwise to push cool air down. Keep blinds on south and west-facing windows closed during peak hours. A programmable thermostat that raises temps when you're away can cut AC costs by 10%.",
    }
    return {
      season: "Summer",
      title: "Check your attic and roof",
      body: "Summer heat builds up fastest in attics. Inspect attic ventilation and insulation to keep cooling costs down. Also a good time to walk the roof and check flashing around chimneys and skylights.",
    }
  }

  // Fall: Sep(8), Oct(9), Nov(10)
  if (hasPool) return {
    season: "Fall",
    title: "Winterize your pool before the first freeze",
    body: "If temperatures regularly drop below 40 degrees, your pool needs winterization before season end. Contact your pool service provider by late October to avoid emergency freeze damage.",
  }
  if (hasHVAC) return {
    season: "Fall",
    title: "Prep your heating system before you need it",
    body: "Test your thermostat in heat mode now, before the first cold snap. Schedule a heating inspection in September or October when HVAC companies have more availability and better pricing.",
  }
  return {
    season: "Fall",
    title: "Fall is the best time for exterior prep",
    body: "Clean gutters after the last leaves fall, caulk any gaps around windows and doors, and have your chimney inspected before fireplace season. Small investments in fall prevent large repairs in winter.",
  }
}
