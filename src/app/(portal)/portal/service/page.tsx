import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { formatDateShort } from "@/lib/utils"
import { getUserPropertyIds } from "@/lib/get-user-properties"
import { Wrench, Plus, AlertTriangle, Clock, CheckCircle } from "lucide-react"

export default async function ServicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const ids = await getUserPropertyIds(supabase, user.id)
  if (!ids.length) redirect("/portal")
  const { data: properties } = await supabase.from("properties").select("id").in("id", ids).eq("status", "active").limit(1)
  if (!properties || properties.length === 0) redirect("/portal")

  const propertyId = properties[0].id

  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })

  const open = workOrders?.filter(wo => !["completed", "cancelled"].includes(wo.status)) ?? []
  const completed = workOrders?.filter(wo => wo.status === "completed") ?? []
  const cancelled = workOrders?.filter(wo => wo.status === "cancelled") ?? []

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-[#0F1B2D] dark:text-white">Service Requests</h1>
        <div className="flex gap-2">
          <Link href="/portal/service/emergency">
            <Button variant="destructive" size="sm" className="gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Emergency
            </Button>
          </Link>
          <Link href="/portal/service/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Request
            </Button>
          </Link>
        </div>
      </div>

      {/* Active */}
      {open.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold text-[#0F1B2D] dark:text-white">Active ({open.length})</h2>
          </div>
          <div className="space-y-2">
            {open.map(wo => (
              <Link
                key={wo.id}
                href={`/portal/service/${wo.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#0F1B2D] dark:text-white truncate">{wo.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Submitted {formatDateShort(wo.created_at)}
                    {wo.scheduled_date && ` Â· Scheduled ${formatDateShort(wo.scheduled_date)}`}
                  </p>
                </div>
                <StatusBadge status={wo.status} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <h2 className="font-semibold text-[#0F1B2D] dark:text-white">Completed ({completed.length})</h2>
          </div>
          <div className="space-y-2">
            {completed.map(wo => (
              <Link
                key={wo.id}
                href={`/portal/service/${wo.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 opacity-80"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#0F1B2D] dark:text-white truncate">{wo.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Completed {wo.completed_date ? formatDateShort(wo.completed_date) : formatDateShort(wo.created_at)}
                  </p>
                </div>
                <StatusBadge status={wo.status} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {workOrders?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Wrench className="h-12 w-12 text-slate-300 mb-3" />
          <h2 className="font-display text-xl font-semibold text-[#0F1B2D]">No service requests yet</h2>
          <p className="mt-2 text-slate-500 max-w-xs">Submit a request and our team will coordinate everything.</p>
          <Link href="/portal/service/new" className="mt-4">
            <Button>Request Service</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
