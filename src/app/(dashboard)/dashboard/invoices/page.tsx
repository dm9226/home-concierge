import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { formatCurrency, formatDateShort, getDaysUntil } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, FileText, AlertTriangle } from "lucide-react"

function statusBadge(status: string) {
  if (status === "paid") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Paid</Badge>
  if (status === "overdue") return <Badge className="bg-red-100 text-red-700 border-red-200">Overdue</Badge>
  if (status === "sent") return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Sent</Badge>
  if (status === "draft") return <Badge className="bg-slate-100 text-slate-700">Draft</Badge>
  return <Badge>{status}</Badge>
}

export default async function DashboardInvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") redirect("/portal")

  let query = supabase
    .from("invoices")
    .select("*, property:properties(id, address, city, client:users!properties_client_id_fkey(full_name))")
    .order("created_at", { ascending: false })

  if (profile.role === "concierge") {
    const { data: props } = await supabase.from("properties").select("id").eq("primary_concierge_id", user.id)
    const ids = props?.map(p => p.id) ?? []
    if (ids.length) query = query.in("property_id", ids)
  }

  const { data: invoices } = await query.limit(200)

  const outstanding = invoices?.filter(inv => ["sent", "overdue"].includes(inv.status)) ?? []
  const paid = invoices?.filter(inv => inv.status === "paid") ?? []
  const draft = invoices?.filter(inv => inv.status === "draft") ?? []

  const totalOutstanding = outstanding.reduce((sum, inv) => sum + inv.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-[#0F1B2D] dark:text-white">Invoices</h1>
      </div>

      {outstanding.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {outstanding.length} outstanding · {formatCurrency(totalOutstanding)} total
          </p>
        </div>
      )}

      {draft.length > 0 && (
        <Section title="Drafts" invoices={draft} />
      )}
      {outstanding.length > 0 && (
        <Section title="Outstanding" invoices={outstanding} />
      )}
      {paid.length > 0 && (
        <Section title="Paid" invoices={paid} />
      )}

      {!invoices?.length && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-slate-300 mb-3" />
          <h2 className="font-display text-xl font-semibold text-[#0F1B2D]">No invoices yet</h2>
        </div>
      )}
    </div>
  )
}

function Section({ title, invoices }: { title: string; invoices: any[] }) {
  return (
    <section>
      <h2 className="font-semibold text-[#0F1B2D] dark:text-white mb-3">{title} ({invoices.length})</h2>
      <div className="space-y-2">
        {invoices.map(inv => {
          const property = (inv as any).property
          const client = property?.client
          return (
            <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`}>
              <Card className="hover:shadow-md transition-all">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#0F1B2D] dark:text-white">
                        {inv.invoice_number ?? "Invoice"}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        {client?.full_name} · {property?.address}
                      </p>
                      {inv.due_date && (
                        <p className="text-xs text-slate-400">Due {formatDateShort(inv.due_date)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-[#0F1B2D] dark:text-white">{formatCurrency(inv.total)}</p>
                        {statusBadge(inv.status)}
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
