import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { BarChart3, TrendingUp, Wrench, DollarSign, Home, Star } from "lucide-react"

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()

  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") redirect("/portal")

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const thisYearStart = new Date(now.getFullYear(), 0, 1).toISOString()

  const [
    { data: workOrders },
    { data: invoices },
    { data: properties },
    { data: vendors },
  ] = await Promise.all([
    admin.from("work_orders").select("status, priority, created_at, actual_cost, completed_date"),
    admin.from("invoices").select("status, total, paid_date, created_at"),
    admin.from("properties").select("id, status, health_score, fee_amount, billing_period"),
    admin.from("vendors").select("id, vendor_scorecards(average_satisfaction_rating, total_jobs)"),
  ])

  const activeProperties = properties?.filter(p => p.status === "active") ?? []
  const totalProperties = activeProperties.length

  // Health metrics only count properties with a completed inspection
  const activePropIds = activeProperties.map(p => p.id)
  const { data: rptAssessedRows } = activePropIds.length
    ? await admin
        .from("property_inspections")
        .select("property_id")
        .eq("status", "complete")
        .in("property_id", activePropIds)
    : { data: [] }
  const assessedSet = new Set((rptAssessedRows ?? []).map(r => r.property_id))
  const assessedProperties = activeProperties.filter(p => assessedSet.has(p.id) && p.health_score)

  const annualizedFees = activeProperties.reduce((sum, p) => {
    const multiplier = p.billing_period === "annually" ? 1 : p.billing_period === "quarterly" ? 4 : 12
    return sum + (p.fee_amount ?? 0) * multiplier
  }, 0)
  const avgHealthScore = assessedProperties.length
    ? Math.round(assessedProperties.reduce((sum, p) => sum + (p.health_score ?? 0), 0) / assessedProperties.length)
    : null

  const completedWOs = workOrders?.filter(wo => wo.status === "completed") ?? []
  const completedThisMonth = completedWOs.filter(wo => wo.completed_date && wo.completed_date >= thirtyDaysAgo).length
  const totalRevenue = invoices?.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + inv.total, 0) ?? 0
  const revenueThisYear = invoices?.filter(inv => inv.status === "paid" && inv.paid_date && inv.paid_date >= thisYearStart).reduce((sum, inv) => sum + inv.total, 0) ?? 0
  const outstandingAmount = invoices?.filter(inv => ["sent", "overdue"].includes(inv.status)).reduce((sum, inv) => sum + inv.total, 0) ?? 0

  const avgVendorRating = vendors?.length
    ? (() => {
        const rated = vendors.flatMap(v => (v as any).vendor_scorecards ?? []).filter((sc: any) => sc.average_satisfaction_rating)
        return rated.length ? (rated.reduce((s: number, sc: any) => s + sc.average_satisfaction_rating, 0) / rated.length).toFixed(1) : "--"
      })()
    : "--"

  const priorityBreakdown = {
    emergency: workOrders?.filter(wo => wo.priority === "emergency").length ?? 0,
    high: workOrders?.filter(wo => wo.priority === "high").length ?? 0,
    normal: workOrders?.filter(wo => wo.priority === "normal").length ?? 0,
    low: workOrders?.filter(wo => wo.priority === "low").length ?? 0,
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-[#1A2320] dark:text-white">Reports</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Home className="h-5 w-5" />} label="Active Properties" value={totalProperties.toString()} />
        <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Avg Health Score" value={avgHealthScore !== null ? avgHealthScore.toString() : "--"} sub={avgHealthScore !== null ? "out of 100" : "awaiting inspections"} />
        <KpiCard icon={<Wrench className="h-5 w-5" />} label="Completed This Month" value={completedThisMonth.toString()} sub="work orders" />
        <KpiCard icon={<Star className="h-5 w-5" />} label="Avg Vendor Rating" value={avgVendorRating.toString()} sub="out of 5" />
      </div>

      {/* Revenue */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-[#0E7C67]" /> Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Collected</p>
              <p className="text-2xl font-bold text-[#1A2320] dark:text-white">{formatCurrency(totalRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">This Year</p>
              <p className="text-2xl font-bold text-[#1A2320] dark:text-white">{formatCurrency(revenueThisYear)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Outstanding</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(outstandingAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Annualized Fees</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(annualizedFees)}</p>
              <p className="text-xs text-slate-400 mt-0.5">{totalProperties} active properties</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work order breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-[#0E7C67]" /> Work Orders by Priority</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(priorityBreakdown).map(([priority, count]) => {
              const total = Object.values(priorityBreakdown).reduce((a, b) => a + b, 0)
              const pct = total ? Math.round((count / total) * 100) : 0
              const color = priority === "emergency" ? "bg-red-500" : priority === "high" ? "bg-orange-400" : priority === "normal" ? "bg-amber-400" : "bg-emerald-400"
              return (
                <div key={priority}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-[#1A2320] dark:text-white font-medium">{priority}</span>
                    <span className="text-slate-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Health score distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Home className="h-5 w-5 text-[#0E7C67]" /> Health Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Excellent (80-100)", min: 80, max: 100, color: "bg-emerald-500" },
              { label: "Good (60-79)", min: 60, max: 79, color: "bg-amber-400" },
              { label: "Needs Attention (<60)", min: 0, max: 59, color: "bg-red-400" },
            ].map(band => {
              const count = assessedProperties.filter(p => p.health_score && p.health_score >= band.min && p.health_score <= band.max).length
              const total = assessedProperties.length || 1
              const pct = Math.round((count / total) * 100)
              return (
                <div key={band.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#1A2320] dark:text-white font-medium">{band.label}</span>
                    <span className="text-slate-500">{count} properties</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={`h-full rounded-full ${band.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="text-[#0E7C67] mb-2">{icon}</div>
        <p className="text-2xl font-bold text-[#1A2320] dark:text-white">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </CardContent>
    </Card>
  )
}
