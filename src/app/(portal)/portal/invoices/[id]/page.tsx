import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { formatCurrency, formatDateShort } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import type { Json } from "@/types/database"

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single()

  if (!invoice) notFound()

  const { data: property } = await supabase
    .from("properties")
    .select("id, address, city, state")
    .eq("id", invoice.property_id)
    .eq("client_id", user.id)
    .single()

  if (!property) redirect("/portal/invoices")

  const additionalCharges = invoice.additional_charges as Array<{ description: string; amount: number }> | null ?? []
  const isArray = Array.isArray(additionalCharges)

  const statusColor =
    invoice.status === "paid" ? "bg-emerald-100 text-emerald-700"
    : invoice.status === "overdue" ? "bg-red-100 text-red-700"
    : "bg-amber-100 text-amber-700"

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/portal/invoices" className="flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </Link>
        <h1 className="font-display text-xl font-semibold text-[#0F1B2D] dark:text-white flex-1">
          {invoice.invoice_number}
        </h1>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusColor}`}>
          {invoice.status}
        </span>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          {/* Header info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Period</p>
              <p className="text-sm font-medium text-[#0F1B2D] dark:text-white">
                {formatDateShort(invoice.period_start)} -- {formatDateShort(invoice.period_end)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Due date</p>
              <p className="text-sm font-medium text-[#0F1B2D] dark:text-white">{formatDateShort(invoice.due_date)}</p>
            </div>
            {invoice.paid_date && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Paid</p>
                <p className="text-sm font-medium text-emerald-600">{formatDateShort(invoice.paid_date)}</p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-300">Management fee</span>
              <span className="font-medium text-[#0F1B2D] dark:text-white">{formatCurrency(invoice.fee_amount)}</span>
            </div>
            {isArray && additionalCharges.map((charge, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">{charge.description}</span>
                <span className="font-medium text-[#0F1B2D] dark:text-white">{formatCurrency(charge.amount)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="flex justify-between font-semibold text-base">
              <span className="text-[#0F1B2D] dark:text-white">Total</span>
              <span className="text-[#0F1B2D] dark:text-white">{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {invoice.notes && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Payment instructions for unpaid */}
      {["sent", "overdue"].includes(invoice.status) && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="font-semibold text-[#0F1B2D] dark:text-white mb-1">Payment Instructions</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Please contact our team to arrange payment by check, ACH transfer, or credit card.
          </p>
        </div>
      )}
    </div>
  )
}
