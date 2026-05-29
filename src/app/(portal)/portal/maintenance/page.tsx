import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { formatDateShort, getDaysUntil } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, CheckCircle, Clock } from "lucide-react"

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Every 6 months",
  annual: "Annual",
  custom: "Custom schedule",
}

function StatusChip({ days }: { days: number | null }) {
  if (days === null) return <span className="text-xs text-slate-400">Scheduled</span>
  if (days < 0) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
      <AlertTriangle className="h-3 w-3" />
      {Math.abs(days)}d overdue
    </span>
  )
  if (days === 0) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      Due today
    </span>
  )
  if (days <= 14) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      <Clock className="h-3 w-3" />
      In {days}d
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
      <CheckCircle className="h-3 w-3" />
      In {days}d
    </span>
  )
}

export default async function MaintenancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: properties } = await supabase
    .from("properties")
    .select("id")
    .eq("client_id", user.id)
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
              <MaintenanceCard key={item.id} item={item} />
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
              <MaintenanceCard key={item.id} item={item} />
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
              <MaintenanceCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {!schedules?.length && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle className="h-12 w-12 text-slate-300 mb-3" />
          <h2 className="font-display text-xl font-semibold text-[#0F1B2D]">No maintenance scheduled</h2>
          <p className="mt-2 text-slate-500">Your maintenance schedule will appear here once your concierge sets it up.</p>
        </div>
      )}
    </div>
  )
}

function MaintenanceCard({ item }: { item: any }) {
  const days = item.next_due ? getDaysUntil(item.next_due) : null

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[#0F1B2D] dark:text-white">{item.title}</p>
            {item.description && (
              <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              {item.frequency && (
                <span className="text-xs text-slate-400">{FREQUENCY_LABELS[item.frequency] ?? item.frequency}</span>
              )}
              {item.next_due && (
                <span className="text-xs text-slate-400">{formatDateShort(item.next_due)}</span>
              )}
            </div>
          </div>
          <StatusChip days={days} />
        </div>
      </CardContent>
    </Card>
  )
}
