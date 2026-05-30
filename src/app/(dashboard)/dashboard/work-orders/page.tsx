import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { StatusBadge, PriorityBadge } from "@/components/status-badge"
import { formatDateShort } from "@/lib/utils"
import { AlertTriangle, Wrench } from "lucide-react"

export default async function WorkOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()

  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") redirect("/portal")

  // Scope to active properties only -- archived/cancelled properties are excluded
  const propQuery = admin.from("properties").select("id").eq("status", "active")
  if (profile.role === "concierge") propQuery.eq("primary_concierge_id", user.id)
  const { data: activeProps } = await propQuery
  const activePropertyIds = activeProps?.map(p => p.id) ?? []

  const { data: workOrders } = activePropertyIds.length
    ? await admin
        .from("work_orders")
        .select("*, property:properties(address, city)")
        .in("property_id", activePropertyIds)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] }

  const emergency = workOrders?.filter(wo => wo.priority === "emergency" && wo.status !== "completed") ?? []
  const active = workOrders?.filter(wo => !["completed", "cancelled"].includes(wo.status) && wo.priority !== "emergency") ?? []
  const completed = workOrders?.filter(wo => wo.status === "completed").slice(0, 20) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-[#0F1B2D] dark:text-white">Work Orders</h1>
      </div>

      {emergency.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h2 className="font-semibold text-red-600">Emergencies ({emergency.length})</h2>
          </div>
          <div className="space-y-2">
            {emergency.map(wo => <WorkOrderRow key={wo.id} wo={wo} />)}
          </div>
        </section>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="font-semibold text-[#0F1B2D] dark:text-white mb-3">Active ({active.length})</h2>
          <div className="space-y-2">
            {active.map(wo => <WorkOrderRow key={wo.id} wo={wo} />)}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="font-semibold text-slate-500 mb-3">Recent Completions</h2>
          <div className="space-y-2">
            {completed.map(wo => <WorkOrderRow key={wo.id} wo={wo} />)}
          </div>
        </section>
      )}

      {!workOrders?.length && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Wrench className="h-12 w-12 text-slate-300 mb-3" />
          <h2 className="font-display text-xl font-semibold text-[#0F1B2D]">No work orders</h2>
        </div>
      )}
    </div>
  )
}

function WorkOrderRow({ wo }: { wo: any }) {
  const property = (wo as any).property
  return (
    <Link
      href={`/dashboard/work-orders/${wo.id}`}
      className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[#0F1B2D] dark:text-white truncate">{wo.title}</p>
        <p className="text-sm text-slate-500 mt-0.5">
          {property ? `${property.address}, ${property.city}` : ""}
          {wo.scheduled_date ? ` · ${formatDateShort(wo.scheduled_date)}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 ml-3">
        <PriorityBadge priority={wo.priority} />
        <StatusBadge status={wo.status} />
      </div>
    </Link>
  )
}
