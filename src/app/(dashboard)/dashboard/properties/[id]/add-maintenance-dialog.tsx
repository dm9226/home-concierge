"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"

const CATEGORIES = [
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "appliance", label: "Appliances" },
  { value: "roofing", label: "Roofing" },
  { value: "exterior", label: "Exterior" },
  { value: "pool", label: "Pool" },
  { value: "landscaping", label: "Landscaping" },
  { value: "smart_home", label: "Smart Home" },
  { value: "security", label: "Security" },
  { value: "other", label: "Other" },
]

const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annual", label: "Every 6 months" },
  { value: "annual", label: "Annual" },
  { value: "custom", label: "Custom interval" },
]

const SEASONS = [
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "fall", label: "Fall" },
  { value: "winter", label: "Winter" },
]

const EMPTY = {
  title: "", description: "", category: "", frequency: "",
  custom_interval_days: "", season: "", next_due: "",
  estimated_cost: "", notes: "",
}

export function AddMaintenanceItemDialog({ propertyId }: { propertyId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function reset() {
    setForm(EMPTY)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.category || !form.frequency) {
      setError("Title, category, and frequency are required.")
      return
    }
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/properties/${propertyId}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to save")
      }
      setOpen(false)
      reset()
      router.refresh()
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Maintenance Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g. Clean dryer vent"
              required
            />
          </div>

          {/* Category + Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Frequency *</Label>
              <Select value={form.frequency} onValueChange={v => set("frequency", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom interval -- only when frequency = custom */}
          {form.frequency === "custom" && (
            <div className="space-y-1.5">
              <Label htmlFor="interval">Repeat Every (days)</Label>
              <Input
                id="interval"
                type="number"
                min="1"
                value={form.custom_interval_days}
                onChange={e => set("custom_interval_days", e.target.value)}
                placeholder="e.g. 45"
              />
            </div>
          )}

          {/* Season + Next Due */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Season <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Select value={form.season} onValueChange={v => set("season", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Any season" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any season</SelectItem>
                  {SEASONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="next_due">Next Due <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input
                id="next_due"
                type="date"
                value={form.next_due}
                onChange={e => set("next_due", e.target.value)}
              />
            </div>
          </div>

          {/* Estimated cost */}
          <div className="space-y-1.5">
            <Label htmlFor="cost">Estimated Cost <span className="text-slate-400 font-normal">(optional)</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={form.estimated_cost}
                onChange={e => set("estimated_cost", e.target.value)}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="What needs to be done and why..."
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E] font-semibold gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving..." : "Add to Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
