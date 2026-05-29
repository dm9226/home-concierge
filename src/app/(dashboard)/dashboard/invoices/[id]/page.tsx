import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { formatCurrency, formatDateShort } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { InvoiceStatusActions } from "./invoice-status-actions"

export default async function DashboardInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") redirect("/portal")

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, property:properties(id, address, city, client:users!properties_client_id_fkey(full_name, email))")
    .eq("id", id)
    .single()

  if (!invoice) notFound()

  const property = (invoice as any).property
  const client = property?.client
  const additionalCharges = (invoice.additional_charges as Array<{ description: string; amount: number }> | null) ?? []

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/invoices" className="flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </Link>
        <h1 className="font-display text-xl font-semibold text-[#0F1B2D] dark:text-white flex-1">
          {invoice.invoice_number}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Client</p>
              <p className="font-medium text-[#0F1B2D] dark:text-white">{client?.full_name}</p>
              {property && (
                <Link href={`/dashboard/properties/${property.id}`} className="text-sm text-[#C9A96E] hover:underline">
                  {property.address}, {property.city}
                </Link>
              )}
            </div>
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
          </CardContent>
        </Card>

        <InvoiceStatusActions invoice={invoice} />
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-300">Monthly retainer</span>
              <span className="font-medium text-[#0F1B2D] dark:text-white">{formatCurrency(invoice.retainer_amount)}</span>
            </div>
            {Array.isArray(additionalCharges) && additionalCharges.map((charge, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">{charge.description}</span>
                <span className="font-medium text-[#0F1B2D] dark:text-white">{formatCurrency(charge.amount)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
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
    </div>
  )
}
