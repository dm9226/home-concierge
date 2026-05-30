import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getDaysUntil } from "@/lib/utils"
import { getUserPropertyIds } from "@/lib/get-user-properties"
import { AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { MaintenanceItemCard } from "@/components/maintenance-item-card"

export default async function MaintenancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const ids = await getUserPropertyIds(supabase, user.id)
  if (!ids.length) redirect("/portal")

  const { data: properties } = await supabase
    .from("properties")
    .select("id")
    .in("id", ids)
    .eq("status", "active")
    .limit(1)

  if (!properties || properties.length === 0) redirect("/portal")

  const { data: schedules } = await supabase
    .from("maintenance_schedules")
    .select("*")
    .eq("property_id", properties[0].id)
    .eq("is_active", true)
    .order("next_due", { ascending: true })

  const overdue = schedules?.filter(s => s.next_due && getDaysUntil(s.next_due) !== null && getDaysUntil(s.next_due)! < 0) ?? []
  const upcoming = schedules?.filter(s => {
    const d = s.next_due ? getDaysUntil(s.next_due) : null
    return d !== null && d >= 0 && d <= 30
  }) ?? []
  const future = schedules?.filter(s => {
    const d = s.next_due ? getDaysUntil(s.next_due) : null
    return d === null || d > 30
  }) ?? []

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-display text-2xl font-semibold text-[#0F1B2D] dark:text-white">Maintenance Schedule</h1>

      {overdue.length > 0 && (
        <section>
          <h2 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Overdue ({overdue.length})
          </h2>
          <div className="space-y-2">
            {overdue.map(item => (
              <MaintenanceItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="font-semibold text-amber-600 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Due Soon ({upcoming.length})
          </h2>
          <div className="space-y-2">
            {upcoming.map(item => (
              <MaintenanceItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {future.length > 0 && (
        <section>
          <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            Upcoming ({future.length})
          </h2>
          <div className="space-y-2">
            {future.map(item => (
              <MaintenanceItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {!schedules?.length && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle className="h-12 w-12 text-slate-300 mb-3" />
          <h2 className="font-display text-xl font-semibold text-[#0F1B2D]">No maintenance scheduled</h2>
          <p className="mt-2 text-slate-500">Your maintenance schedule will appear here once your team sets it up.</p>
        </div>
      )}
    </div>
  )
}
