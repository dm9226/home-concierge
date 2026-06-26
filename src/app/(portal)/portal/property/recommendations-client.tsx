"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle2, Clock, XCircle, Wrench } from "lucide-react"

type RecStatus = "pending" | "approved" | "deferred" | "declined" | "completed"

interface Rec {
  id: string
  title: string
  description: string | null
  rec_type: "repair" | "preventative" | "monitor"
  priority: "emergency" | "high" | "normal" | "low"
  status: RecStatus
  estimated_cost: number | null
}

function money(n: number | null) {
  if (n == null) return null
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
}

const TYPE_LABELS: Record<Rec["rec_type"], string> = {
  repair: "Repair", preventative: "Preventative", monitor: "Monitor",
}

export function RecommendationsClient({ recommendations }: { recommendations: Rec[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function respond(id: string, action: "approve" | "defer" | "decline") {
    setBusy(id)
    setError(null)
    const res = await fetch(`/api/recommendations/${id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    setBusy(null)
    if (!res.ok) {
      const r = await res.json().catch(() => ({}))
      setError(r.error ?? "Something went wrong")
      return
    }
    router.refresh()
  }

  const pending = recommendations.filter(r => r.status === "pending" || r.status === "deferred")
  const approved = recommendations.filter(r => r.status === "approved")
  const completed = recommendations.filter(r => r.status === "completed")

  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle2 className="h-12 w-12 text-slate-300 mb-3" />
        <p className="font-medium text-slate-500">No open recommendations</p>
        <p className="text-sm text-slate-400 mt-1">When your team recommends work, it will appear here for your approval.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Needs your decision */}
      {pending.length > 0 && (
        <div>
          <h2 className="font-semibold text-[#0F1B2D] dark:text-white mb-3">Needs Your Decision ({pending.length})</h2>
          <div className="space-y-3">
            {pending.map(r => (
              <Card key={r.id} className={r.priority === "high" ? "border-amber-200" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#0F1B2D] dark:text-white">{r.title}</span>
                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 uppercase">{TYPE_LABELS[r.rec_type]}</span>
                    {r.status === "deferred" && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 uppercase">Deferred</span>}
                  </div>
                  {r.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5">{r.description}</p>}
                  {r.estimated_cost != null && <p className="text-sm text-slate-500 mt-1.5">Estimated: {money(r.estimated_cost)}</p>}

                  <div className="flex gap-2 mt-3">
                    <Button size="sm" disabled={busy === r.id} onClick={() => respond(r.id, "approve")} className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f] gap-1.5">
                      {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Approve
                    </Button>
                    {r.status !== "deferred" && (
                      <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => respond(r.id, "defer")} className="gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Defer
                      </Button>
                    )}
                    <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => respond(r.id, "decline")} className="gap-1.5 text-slate-500">
                      <XCircle className="h-3.5 w-3.5" /> Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Approved / in progress */}
      {approved.length > 0 && (
        <div>
          <h2 className="font-semibold text-[#0F1B2D] dark:text-white mb-3 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-blue-500" /> Approved ({approved.length})
          </h2>
          <div className="space-y-2">
            {approved.map(r => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                <span className="text-sm text-[#0F1B2D] dark:text-white">{r.title}</span>
                {r.estimated_cost != null && <span className="text-xs text-slate-400">{money(r.estimated_cost)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="font-semibold text-[#0F1B2D] dark:text-white mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Completed ({completed.length})
          </h2>
          <div className="space-y-2">
            {completed.map(r => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                <span className="text-sm text-slate-500 line-through">{r.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
