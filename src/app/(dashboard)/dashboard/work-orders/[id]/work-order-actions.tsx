"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

type WOStatus = "submitted" | "approved" | "scheduled" | "in_progress" | "completed" | "cancelled"
const TRANSITIONS: Record<string, { label: string; nextStatus: WOStatus; variant: "default" | "gold" | "outline" }[]> = {
  submitted: [
    { label: "Approve", nextStatus: "approved", variant: "default" },
  ],
  approved: [
    { label: "Mark In Progress", nextStatus: "in_progress", variant: "default" },
  ],
  in_progress: [
    { label: "Schedule", nextStatus: "scheduled", variant: "gold" },
    { label: "Mark Complete", nextStatus: "completed", variant: "default" },
  ],
  scheduled: [
    { label: "Mark In Progress", nextStatus: "in_progress", variant: "default" },
    { label: "Mark Complete", nextStatus: "completed", variant: "gold" },
  ],
}

export function WorkOrderActions({ workOrder }: { workOrder: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [scheduledDate, setScheduledDate] = useState<string>(workOrder.scheduled_date?.split("T")[0] ?? "")
  const [actualCost, setActualCost] = useState<string>(workOrder.actual_cost?.toString() ?? "")

  const transitions = TRANSITIONS[workOrder.status] ?? []

  async function updateStatus(nextStatus: WOStatus) {
    setLoading(nextStatus)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("work_orders").update({
        status: nextStatus,
        ...(nextStatus === "scheduled" && scheduledDate ? { scheduled_date: scheduledDate } : {}),
        ...(nextStatus === "completed" ? { completed_date: new Date().toISOString(), ...(actualCost ? { actual_cost: parseFloat(actualCost) } : {}) } : {}),
      }).eq("id", workOrder.id)
      if (error) throw error
      toast.success(`Status updated to ${nextStatus.replace("_", " ")}`)
      router.refresh()
    } catch {
      toast.error("Failed to update status")
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workOrder.status === "scheduled" || workOrder.status === "approved" ? (
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Scheduled Date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0F1B2D]"
            />
          </div>
        ) : null}

        {workOrder.status === "in_progress" || workOrder.status === "scheduled" ? (
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Actual Cost ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={actualCost}
              onChange={e => setActualCost(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0F1B2D]"
            />
          </div>
        ) : null}

        {transitions.length > 0 && (
          <div className="space-y-2">
            {transitions.map(t => (
              <Button
                key={t.nextStatus}
                variant={t.variant}
                className="w-full"
                onClick={() => updateStatus(t.nextStatus)}
                disabled={!!loading}
              >
                {loading === t.nextStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t.label}
              </Button>
            ))}
          </div>
        )}

        {(["submitted", "approved", "in_progress", "scheduled"] as WOStatus[]).includes(workOrder.status) && (
          <Button
            variant="outline"
            className="w-full text-slate-500"
            onClick={() => updateStatus("cancelled")}
            disabled={!!loading}
          >
            Cancel Request
          </Button>
        )}

        {workOrder.status === "completed" && (
          <p className="text-sm text-emerald-600 font-medium text-center">Work order completed</p>
        )}
      </CardContent>
    </Card>
  )
}
