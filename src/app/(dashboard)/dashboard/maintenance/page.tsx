import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatDateShort, getDaysUntil } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Clock } from "lucide-react"

export default async function MaintenanceDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()

  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") redirect("/portal")

  let propertyIds: string[] | null = null
  if (profile.role === "concierge") {
    const { data: props } = await admin
      .from("properties")
      .select("id")
      .eq("primary_concierge_id", user.id)
    propertyIds = props?.map(p => p.id) ?? []
  }

  let query = admin
    .from("maintenance_schedules")
    .select("*, property:properties(id, address, city)")
    .eq("is_active", true)
    .order("next_due", { ascending: true })

  if (propertyIds) {
    if (propertyIds.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle className="h-12 w-12 text-slate-300 mb-3" />
          <h2 className="font-display text-xl">No maintenance items</h2>
        </div>
      )
    }
    query = query.in("property_id", propertyIds)
  }

  const { data: schedules } = await query.limit(200)

  const overdue = schedules?.filter(s => {
    const d = s.next_due ? getDaysUntil(s.next_due) : null
    return d !== null && d < 0
  }) ?? []

  const dueSoon = schedules?.filter(s => {
    const d = s.next_due ? getDaysUntil(s.next_due) : null
    return d !== null && d >= 0 && d <= 14
  }) ?? []

  const upcoming = schedules?.filter(s => {
    const d = s.next_due ? getDaysUntil(s.next_due) : null
    return d === null || d > 14
  }) ?? []

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-[#1A2320] dark:text-white">Maintenance</h1>

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-red-500" />} label="Overdue" value={overdue.length} color="red" />
        <StatCard icon={<Clock className="h-5 w-5 text-amber-500" />} label="Due in 14 days" value={dueSoon.length} color="amber" />
        <StatCard icon={<CheckCircle className="h-5 w-5 text-emerald-500" />} label="On track" value={upcoming.length} color="emerald" />
      </div>

      {overdue.length > 0 && (
        <Section title="Overdue" color="red" items={overdue} />
      )}
      {dueSoon.length > 0 && (
        <Section title="Due in 14 days" color="amber" items={dueSoon} />
      )}
      {upcoming.length > 0 && (
        <Section title="Upcoming" color="slate" items={upcoming} />
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const bg = color === "red" ? "bg-red-50 border-red-200" : color === "amber" ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-1">{icon}</div>
      <p className="text-2xl font-bold text-[#1A2320] dark:text-white">{value}</p>
      <p className="text-xs text-slate-600">{label}</p>
    </div>
  )
}

function Section({ title, color, items }: { title: string; color: string; items: any[] }) {
  const titleColor = color === "red" ? "text-red-600" : color === "amber" ? "text-amber-600" : "text-[#1A2320] dark:text-white"
  return (
    <section>
      <h2 className={`font-semibold mb-3 ${titleColor}`}>{title} ({items.length})</h2>
      <div className="space-y-2">
        {items.map(item => {
          const property = (item as any).property
          const days = item.next_due ? getDaysUntil(item.next_due) : null
          return (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <p className="font-medium text-[#1A2320] dark:text-white">{item.title}</p>
                {property && (
                  <Link href={`/dashboard/properties/${property.id}`} className="text-sm text-[#0E7C67] hover:underline">
                    {property.address}, {property.city}
                  </Link>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                {item.next_due && (
                  <span className="text-xs text-slate-500">{formatDateShort(item.next_due)}</span>
                )}
                {days !== null && (
                  <span className={`text-sm font-medium ${days < 0 ? "text-red-600" : days <= 14 ? "text-amber-600" : "text-emerald-600"}`}>
                    {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `in ${days}d`}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
