"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function InvoiceStatusActions({ invoice }: { invoice: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function updateStatus(status: "draft" | "sent" | "paid" | "overdue") {
    setLoading(status)
    try {
      const supabase = createClient()
      const updates = status === "paid"
        ? { status, paid_date: new Date().toISOString() }
        : { status }
      const { error } = await supabase.from("invoices").update(updates).eq("id", invoice.id)
      if (error) throw error
      toast.success(`Invoice marked as ${status}`)
      router.refresh()
    } catch {
      toast.error("Failed to update invoice")
    } finally {
      setLoading(null)
    }
  }

  function statusBadge(s: string) {
    if (s === "paid") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Paid</Badge>
    if (s === "overdue") return <Badge className="bg-red-100 text-red-700 border-red-200">Overdue</Badge>
    if (s === "sent") return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Sent</Badge>
    if (s === "draft") return <Badge className="bg-slate-100 text-slate-700">Draft</Badge>
    return <Badge>{s}</Badge>
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          Status
          {statusBadge(invoice.status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {invoice.status === "draft" && (
          <Button className="w-full" onClick={() => updateStatus("sent")} disabled={!!loading}>
            {loading === "sent" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send to Client
          </Button>
        )}
        {(invoice.status === "sent" || invoice.status === "overdue") && (
          <>
            <Button variant="gold" className="w-full" onClick={() => updateStatus("paid")} disabled={!!loading}>
              {loading === "paid" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Mark as Paid
            </Button>
            {invoice.status === "sent" && (
              <Button variant="outline" className="w-full" onClick={() => updateStatus("overdue")} disabled={!!loading}>
                Mark Overdue
              </Button>
            )}
          </>
        )}
        {invoice.status === "paid" && (
          <p className="text-sm text-emerald-600 font-medium text-center">Invoice paid</p>
        )}
      </CardContent>
    </Card>
  )
}
