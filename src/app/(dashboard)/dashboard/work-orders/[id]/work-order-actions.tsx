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
  const [isOnDemand, setIsOnDemand] = useState<boolean>(!!workOrder.is_on_demand)
  const [isHandyman, setIsHandyman] = useState<boolean>(!!workOrder.is_handyman)

  async function toggleOnDemand(val: boolean) {
    setIsOnDemand(val)
    const supabase = createClient()
    await supabase.from("work_orders").update({ is_on_demand: val, ...(val ? {} : { is_handyman: false }) }).eq("id", workOrder.id)
    if (!val) setIsHandyman(false)
    router.refresh()
  }

  async function toggleHandyman(val: boolean) {
    setIsHandyman(val)
    const supabase = createClient()
    await supabase.from("work_orders").update({ is_handyman: val }).eq("id", workOrder.id)
    router.refresh()
  }

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
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1A2320]"
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
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1A2320]"
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

        {/* On-demand flag -- affects call counter for Proactive+ clients */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isOnDemand}
              onChange={e => toggleOnDemand(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-[#0E7C67]"
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">On-Demand Service Call</span>
          </label>
          <p className="mt-1 text-xs text-slate-400 ml-6">Counts against included on-demand calls for Proactive+ clients</p>

          {isOnDemand && (
            <div className="mt-3 ml-6">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isHandyman}
                  onChange={e => toggleHandyman(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-[#0E7C67]"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">Handyman request</span>
              </label>
              <p className="mt-1 text-xs text-slate-400 ml-6">Overage rate once 4 included calls are used: handyman $100, other $200</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
