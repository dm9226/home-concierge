import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import { LogIn, History, Monitor } from "lucide-react"

const TABLE_LABELS: Record<string, string> = {
  properties: "Property", property_onboarding: "Property Info", assets: "Inventory item",
  work_orders: "Work order", maintenance_schedules: "Maintenance", projects: "Project",
  invoices: "Invoice", recurring_services: "Recurring service", property_files: "File",
  recommendations: "Recommendation", service_agreements: "Membership agreement",
  vendors: "Vendor", users: "User", property_inspections: "Inspection",
}

const ACTION_STYLE: Record<string, string> = {
  insert: "bg-emerald-100 text-emerald-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
}

export default async function AuditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") redirect("/dashboard")

  const [{ data: logins }, { data: changes }] = await Promise.all([
    admin.from("auth_events").select("*, user:users(full_name, email)").order("created_at", { ascending: false }).limit(50),
    admin.from("audit_logs").select("*, user:users(full_name, email)").order("created_at", { ascending: false }).limit(100),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#0F1B2D] dark:text-white">Audit Log</h1>
        <p className="mt-1 text-sm text-slate-500">Sign-in activity and a record of changes made across the platform.</p>
      </div>

      {/* Logins */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><LogIn className="h-4 w-4 text-[#0E7C67]" /> Recent Sign-ins</CardTitle>
        </CardHeader>
        <CardContent>
          {(!logins || logins.length === 0) ? (
            <p className="text-sm text-slate-400 py-4 text-center">No sign-ins recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {logins.map(e => (
                <div key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0F1B2D] dark:text-white truncate">
                      {(e as any).user?.full_name ?? "Unknown user"}
                      <span className="ml-2 text-xs font-normal text-slate-400">{(e as any).user?.email}</span>
                    </p>
                    {e.ip && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Monitor className="h-3 w-3" /> {e.ip}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{formatDate(e.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Changes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4 text-[#0E7C67]" /> Recent Changes</CardTitle>
        </CardHeader>
        <CardContent>
          {(!changes || changes.length === 0) ? (
            <p className="text-sm text-slate-400 py-4 text-center">No changes recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {changes.map(c => {
                const fields = c.changes && typeof c.changes === "object" ? Object.keys(c.changes as object) : []
                return (
                  <div key={c.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${ACTION_STYLE[c.action] ?? "bg-slate-100 text-slate-600"}`}>{c.action}</span>
                        <span className="text-sm font-medium text-[#0F1B2D] dark:text-white">{TABLE_LABELS[c.table_name] ?? c.table_name}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {(c as any).user?.full_name ?? "System"}
                        {fields.length > 0 && <span> · changed {fields.join(", ")}</span>}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{formatDate(c.created_at)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
