"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDateShort } from "@/lib/utils"
import { Plus, Loader2, Sparkles, Trash2, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"

type RecStatus = "pending" | "approved" | "deferred" | "declined" | "completed"
type RecType = "repair" | "preventative" | "monitor"

interface Rec {
  id: string
  finding_id: string | null
  title: string
  description: string | null
  rec_type: RecType
  priority: "emergency" | "high" | "normal" | "low"
  status: RecStatus
  estimated_cost: number | null
  client_responded_at: string | null
  created_at: string
}

const STATUS_GROUPS: { status: RecStatus; label: string; tone: string }[] = [
  { status: "pending",   label: "Pending Client Decision", tone: "text-amber-600" },
  { status: "approved",  label: "Approved",                tone: "text-blue-600" },
  { status: "deferred",  label: "Deferred / Monitoring",   tone: "text-slate-500" },
  { status: "completed", label: "Completed",               tone: "text-emerald-600" },
  { status: "declined",  label: "Declined",                tone: "text-slate-400" },
]

const TYPE_LABELS: Record<RecType, string> = {
  repair: "Repair", preventative: "Preventative", monitor: "Monitor",
}
const STATUS_LABELS: Record<RecStatus, string> = {
  pending: "Pending", approved: "Approved", deferred: "Deferred", declined: "Declined", completed: "Completed",
}

const EMPTY = { title: "", description: "", rec_type: "repair" as RecType, priority: "normal", estimated_cost: "" }

export function RecommendationsTab({ propertyId, userId }: { propertyId: string; userId: string }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [recs, setRecs] = useState<Rec[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from("recommendations")
        .select("id, finding_id, title, description, rec_type, priority, status, estimated_cost, client_responded_at, created_at")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
      setRecs(data ?? [])
      setLoading(false)
    }
    load()
  }, [propertyId])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function addRec() {
    if (!form.title.trim()) { setError("Title is required."); return }
    setSaving(true)
    setError(null)
    const { data, error } = await supabase.from("recommendations").insert({
      property_id: propertyId,
      created_by: userId,
      title: form.title.trim(),
      description: form.description || null,
      rec_type: form.rec_type,
      priority: form.priority as Rec["priority"],
      estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
    }).select().single()
    setSaving(false)
    if (error) { setError(error.message); return }
    if (data) setRecs(prev => [data as Rec, ...prev])
    setForm(EMPTY)
    setAdding(false)
  }

  async function generateFromInspection() {
    setGenerating(true)
    setError(null)

    const { data: insp } = await supabase
      .from("property_inspections")
      .select("id")
      .eq("property_id", propertyId)
      .eq("status", "complete")
      .order("inspection_date", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!insp) { setGenerating(false); setError("No completed inspection to generate from."); return }

    const { data: findings } = await supabase
      .from("inspection_findings")
      .select("id, item_label, section, condition, notes, flagged")
      .eq("inspection_id", insp.id)

    const flagged = (findings ?? []).filter(f => f.flagged || f.condition === "poor")
    const existingFindingIds = new Set(recs.map(r => r.finding_id).filter(Boolean))
    const toCreate = flagged.filter(f => !existingFindingIds.has(f.id))

    if (toCreate.length === 0) { setGenerating(false); setError("No new flagged items to add."); return }

    const rows = toCreate.map(f => ({
      property_id: propertyId,
      inspection_id: insp.id,
      finding_id: f.id,
      created_by: userId,
      title: f.item_label,
      description: f.notes || null,
      rec_type: (f.condition === "poor" ? "repair" : "monitor") as RecType,
      priority: (f.condition === "poor" ? "high" : "normal") as Rec["priority"],
    }))

    const { data, error } = await supabase.from("recommendations").insert(rows).select()
    setGenerating(false)
    if (error) { setError(error.message); return }
    if (data) setRecs(prev => [...(data as Rec[]), ...prev])
  }

  async function changeStatus(id: string, status: RecStatus) {
    setRecs(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    await supabase.from("recommendations").update({ status, updated_at: new Date().toISOString() }).eq("id", id)
  }

  async function remove(id: string) {
    const prev = recs
    setRecs(r => r.filter(x => x.id !== id))
    const { error } = await supabase.from("recommendations").delete().eq("id", id)
    if (error) setRecs(prev)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">Recommendations</h3>
          <p className="text-sm text-slate-500">What the team recommends, and where each item stands with the client.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={generateFromInspection} disabled={generating} className="gap-1.5">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            From Inspection
          </Button>
          {!adding && (
            <Button size="sm" onClick={() => { setAdding(true); setError(null) }} className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f] gap-1.5">
              <Plus className="h-4 w-4" /> Add
            </Button>
          )}
        </div>
      </div>

      {error && <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">{error}</p>}

      {adding && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Replace aging water heater" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={2} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Why, and what's involved" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.rec_type} onValueChange={v => set("rec_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as RecType[]).map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["high", "normal", "low"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost">Est. Cost</Label>
              <Input id="cost" type="number" value={form.estimated_cost} onChange={e => set("estimated_cost", e.target.value)} placeholder="$" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setAdding(false); setForm(EMPTY) }}>Cancel</Button>
            <Button onClick={addRec} disabled={saving} className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f]">
              {saving ? "Adding..." : "Add Recommendation"}
            </Button>
          </div>
        </div>
      )}

      {recs.length === 0 && !adding ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-12 w-12 text-slate-300 mb-3" />
          <p className="font-medium text-slate-500">No recommendations yet</p>
          <p className="text-sm text-slate-400 mt-1">Add items manually or generate them from the latest inspection's flagged findings.</p>
        </div>
      ) : (
        STATUS_GROUPS.map(group => {
          const items = recs.filter(r => r.status === group.status)
          if (items.length === 0) return null
          return (
            <div key={group.status}>
              <h4 className={cn("text-xs font-semibold uppercase tracking-wider mb-2", group.tone)}>
                {group.label} ({items.length})
              </h4>
              <div className="space-y-2">
                {items.map(r => (
                  <div key={r.id} className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-[#0F1B2D] dark:text-white">{r.title}</span>
                          <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 uppercase">{TYPE_LABELS[r.rec_type]}</span>
                          {r.priority === "high" && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 uppercase">High</span>}
                        </div>
                        {r.description && <p className="text-xs text-slate-500 mt-1">{r.description}</p>}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                          {r.estimated_cost != null && <span>{formatCurrency(r.estimated_cost)}</span>}
                          {r.client_responded_at && <span>Client responded {formatDateShort(r.client_responded_at)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Select value={r.status} onValueChange={v => changeStatus(r.id, v as RecStatus)}>
                          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(STATUS_LABELS) as RecStatus[]).map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <button onClick={() => remove(r.id)} className="rounded p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
