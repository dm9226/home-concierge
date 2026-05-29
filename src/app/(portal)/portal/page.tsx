import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { HealthScoreGauge } from "@/components/health-score-gauge"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDateShort, getDaysUntil } from "@/lib/utils"
import {
  AlertTriangle, Calendar, Wrench, ArrowRight, Phone,
  Mail, Clock, ChevronRight, Home
} from "lucide-react"

export default async function PortalHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")

  // Get client's properties
  const { data: properties } = await supabase
    .from("properties")
    .select(`
      *,
    `)
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

  // Use first property for the main view
  const property = properties[0]
  const propertyId = property.id

  const [
    { data: upcomingWork },
    { data: openWorkOrders },
    { data: recentCompleted },
    { data: nextMaintenance },
    { data: activeProjects },
    { data: unpaidInvoices },
  ] = await Promise.all([
    supabase
      .from("work_orders")
      .select("*")
      .eq("property_id", propertyId)
      .eq("status", "scheduled")
      .gte("scheduled_date", new Date().toISOString())
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
      .from("work_orders")
      .select("*")
      .eq("property_id", propertyId)
      .eq("status", "completed")
      .order("completed_date", { ascending: false })
      .limit(3),
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
  ])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <p className="font-display text-lg font-semibold text-white">{property.address}</p>
            <p className="text-sm text-white/80">{property.city}, {property.state}</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-slate-500">Home Health Score</p>
            <HealthScoreGauge
              score={property.health_score}
              size="md"
              showLabel
              className="mt-1"
            />
          </div>

          <div className="flex flex-col items-end gap-3">
            <Link
              href="/portal/service/emergency"
              className="flex items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-700 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              Emergency
            </Link>
            <Link
              href="/portal/service/new"
              className="flex items-center justify-center gap-2 rounded-full border border-[#0F1B2D] px-4 py-2 text-sm font-medium text-[#0F1B2D] hover:bg-[#0F1B2D]/5 transition-colors"
            >
              <Wrench className="h-4 w-4" />
              Request Service
            </Link>
          </div>
        </div>
      </div>

      {/* Unpaid invoices alert */}
      {unpaidInvoices && unpaidInvoices.length > 0 && (
        <Link href="/portal/invoices">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between hover:border-amber-300 transition-colors">
            <div>
              <p className="font-semibold text-amber-800">
                {unpaidInvoices.length} invoice{unpaidInvoices.length > 1 ? "s" : ""} awaiting payment
              </p>
              <p className="text-sm text-amber-700">
                Total: {formatCurrency(unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0))}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-amber-600" />
          </div>
        </Link>
      )}

      {/* Contact team */}
      <Card>
        <CardContent className="pt-5">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">Your Team</p>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0F1B2D] text-white font-semibold">
              CC
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#0F1B2D] dark:text-white">Carefree Casa</p>
              <p className="text-sm text-slate-500">Home Management Team</p>
            </div>
            <Link
              href="/portal/messages"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <Mail className="h-4 w-4 text-slate-600" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming visits */}
      {upcomingWork && upcomingWork.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">
              Upcoming Visits
            </h2>
          </div>
          <div className="space-y-2">
            {upcomingWork.map((wo) => (
              <div
                key={wo.id}
                className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50">
                  <Calendar className="h-5 w-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#0F1B2D] dark:text-white">{wo.title}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
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
            <Link href="/portal/service" className="text-sm text-[#C9A96E] flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {openWorkOrders.map((wo) => (
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
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">
              Active Projects
            </h2>
          </div>
          <div className="space-y-3">
            {activeProjects.map((project) => {
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
                        className="h-full rounded-full bg-[#C9A96E]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">{progress}% complete &bull; {completed}/{tasks.length} tasks</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Next maintenance */}
      {nextMaintenance && nextMaintenance.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">
              Upcoming Maintenance
            </h2>
            <Link href="/portal/maintenance" className="text-sm text-[#C9A96E] flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {nextMaintenance.map((item) => {
              const days = item.next_due ? getDaysUntil(item.next_due) : null
              const isOverdue = days !== null && days < 0
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <p className="font-medium text-[#0F1B2D] dark:text-white">{item.title}</p>
                  <span className={`text-sm font-medium ${isOverdue ? "text-red-500" : days && days <= 14 ? "text-amber-500" : "text-slate-400"}`}>
                    {isOverdue
                      ? `${Math.abs(days!)}d overdue`
                      : days !== null
                      ? days === 0
                        ? "Today"
                        : `in ${days}d`
                      : "Scheduled"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
