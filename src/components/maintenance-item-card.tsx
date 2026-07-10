"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, Pencil, X, Check, Loader2, Clock, AlertTriangle } from "lucide-react"
import { formatCurrency, formatDateShort, getDaysUntil } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface MaintenanceItem {
  id: string
  title: string
  description: string | null
  frequency: string
  season: string | null
  next_due: string | null
  last_completed: string | null
  estimated_cost: number | null
}

const FREQ_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Every 6 months",
  annual: "Annual",
  custom: "Custom",
}

export function MaintenanceItemCard({
  item: initial,
  canEditCost = false,
}: {
  item: MaintenanceItem
  canEditCost?: boolean
}) {
  const [item, setItem] = useState(initial)
  const [completing, setCompleting] = useState(false)
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().split("T")[0])
  const [saving, setSaving] = useState(false)

  const [editingCost, setEditingCost] = useState(false)
  const [costInput, setCostInput] = useState(item.estimated_cost != null ? String(item.estimated_cost) : "")
  const [savingCost, setSavingCost] = useState(false)

  const daysUntil = item.next_due ? getDaysUntil(item.next_due) : null
  const isOverdue = daysUntil !== null && daysUntil < 0
  const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 14

  async function handleComplete() {
    setSaving(true)
    try {
      const res = await fetch(`/api/maintenance/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed_date: completedDate }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
      const updated = await res.json()
      setItem(updated)
      setCompleting(false)
      toast.success("Marked complete")
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveCost() {
    setSavingCost(true)
    try {
      const res = await fetch(`/api/maintenance/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimated_cost: costInput }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
      const updated = await res.json()
      setItem(updated)
      setEditingCost(false)
      toast.success("Cost updated")
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong")
    } finally {
      setSavingCost(false)
    }
  }

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-3",
      isOverdue
        ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
        : isDueSoon
        ? "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20"
        : "border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900"
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#1A2320] dark:text-white">{item.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="capitalize">{FREQ_LABELS[item.frequency] ?? item.frequency}</span>
            {item.season && <span className="capitalize">{item.season}</span>}
            {/* Cost display / edit */}
            {canEditCost ? (
              editingCost ? (
                <span className="flex items-center gap-1">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    value={costInput}
                    onChange={e => setCostInput(e.target.value)}
                    className="w-20 rounded border border-slate-300 px-1.5 py-0.5 text-xs text-[#1A2320] dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    placeholder="0"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveCost}
                    disabled={savingCost}
                    className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                  >
                    {savingCost ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  </button>
                  <button onClick={() => { setEditingCost(false); setCostInput(item.estimated_cost != null ? String(item.estimated_cost) : "") }} className="text-slate-400 hover:text-slate-600">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setEditingCost(true)}
                  className="flex items-center gap-1 rounded px-1 -mx-1 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group"
                >
                  <span>{item.estimated_cost != null ? formatCurrency(item.estimated_cost) : <span className="text-slate-400 italic">no cost set</span>}</span>
                  <Pencil className="h-2.5 w-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )
            ) : (
              item.estimated_cost != null && <span>{formatCurrency(item.estimated_cost)}</span>
            )}
          </div>
        </div>

        {/* Due date */}
        <div className="text-right shrink-0">
          <p className={cn(
            "text-sm font-semibold",
            isOverdue ? "text-red-600" : isDueSoon ? "text-amber-600" : "text-slate-600 dark:text-slate-400"
          )}>
            {item.next_due ? formatDateShort(item.next_due) : "Not scheduled"}
          </p>
          <p className={cn(
            "text-xs",
            isOverdue ? "text-red-500" : isDueSoon ? "text-amber-500" : "text-slate-400"
          )}>
            {isOverdue
              ? `${Math.abs(daysUntil!)}d overdue`
              : daysUntil === 0 ? "Due today"
              : daysUntil !== null ? `in ${daysUntil}d`
              : ""}
          </p>
        </div>
      </div>

      {/* Last completed */}
      {item.last_completed && (
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Last completed {formatDateShort(item.last_completed)}
        </p>
      )}

      {/* Complete form */}
      {completing ? (
        <div className="flex items-center gap-2 pt-1">
          <label className="text-xs text-slate-500 shrink-0">Completed on</label>
          <input
            type="date"
            value={completedDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={e => setCompletedDate(e.target.value)}
            className="flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-[#1A2320] dark:bg-slate-800 dark:border-slate-600 dark:text-white"
          />
          <button
            onClick={handleComplete}
            disabled={saving}
            className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Confirm
          </button>
          <button
            onClick={() => setCompleting(false)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setCompleting(true); setCompletedDate(new Date().toISOString().split("T")[0]) }}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#1A2320] dark:hover:text-white transition-colors"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Mark complete
        </button>
      )}
    </div>
  )
}
