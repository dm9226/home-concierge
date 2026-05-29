import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { formatCurrency, formatDateShort, getDaysUntil } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, ChevronRight, AlertTriangle } from "lucide-react"

function InvoiceStatusBadge({ status, dueDate }: { status: string; dueDate: string | null }) {
  const isOverdue = status === "overdue" || (status === "sent" && dueDate && getDaysUntil(dueDate) !== null && getDaysUntil(dueDate)! < 0)

  if (isOverdue) return <Badge className="bg-red-100 text-red-700 border-red-200">Overdue</Badge>
  if (status === "sent") return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Due</Badge>
  if (status === "paid") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Paid</Badge>
  if (status === "draft") return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Draft</Badge>
  return <Badge>{status}</Badge>
}

export default async function InvoicesPage() {
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

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("property_id", properties[0].id)
    .order("created_at", { ascending: false })

  const unpaid = invoices?.filter(inv => ["sent", "overdue"].includes(inv.status)) ?? []
  const paid = invoices?.filter(inv => inv.status === "paid") ?? []

  const totalOwed = unpaid.reduce((sum, inv) => sum + inv.total, 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-display text-2xl font-semibold text-[#0F1B2D] dark:text-white">Invoices</h1>

      {unpaid.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {unpaid.length} invoice{unpaid.length > 1 ? "s" : ""} awaiting payment
              </p>
              <p className="text-amber-700 dark:text-amber-500 text-lg font-bold mt-1">{formatCurrency(totalOwed)}</p>
            </div>
          </div>
        </div>
      )}

      {unpaid.length > 0 && (
        <section>
          <h2 className="font-semibold text-[#0F1B2D] dark:text-white mb-3">Awaiting Payment</h2>
          <div className="space-y-2">
            {unpaid.map(inv => (
              <InvoiceRow key={inv.id} invoice={inv} />
            ))}
          </div>
        </section>
      )}

      {paid.length > 0 && (
        <section>
          <h2 className="font-semibold text-[#0F1B2D] dark:text-white mb-3">Paid</h2>
          <div className="space-y-2">
            {paid.map(inv => (
              <InvoiceRow key={inv.id} invoice={inv} />
            ))}
          </div>
        </section>
      )}

      {!invoices?.length && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-slate-300 mb-3" />
          <h2 className="font-display text-xl font-semibold text-[#0F1B2D]">No invoices yet</h2>
          <p className="mt-2 text-slate-500">Invoices from your concierge will appear here.</p>
        </div>
      )}
    </div>
  )
}

function InvoiceRow({ invoice }: { invoice: any }) {
  return (
    <Link href={`/portal/invoices/${invoice.id}`}>
      <Card className="hover:shadow-md transition-all">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#0F1B2D] dark:text-white truncate">
                {invoice.invoice_number ?? "Invoice"}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                {invoice.due_date ? `Due ${formatDateShort(invoice.due_date)}` : formatDateShort(invoice.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold text-[#0F1B2D] dark:text-white">{formatCurrency(invoice.total)}</p>
                <InvoiceStatusBadge status={invoice.status} dueDate={invoice.due_date} />
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
