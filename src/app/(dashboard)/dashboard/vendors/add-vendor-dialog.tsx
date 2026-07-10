"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const SPECIALTIES = [
  "HVAC", "Plumbing", "Electrical", "Appliance Repair", "Roofing",
  "Exterior", "Pool", "Landscaping", "Smart Home", "Security",
  "Handyman", "Cleaning", "Pest Control", "General Contractor",
]

const STATUSES = [
  { value: "preferred", label: "Preferred" },
  { value: "approved", label: "Approved" },
  { value: "probationary", label: "Probationary" },
  { value: "blacklisted", label: "Blacklisted" },
]

const EMPTY = {
  company_name: "", contact_name: "", phone: "", email: "", website: "",
  license_number: "", insurance_expiration: "", status: "approved", notes: "",
}

export function AddVendorDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [specialties, setSpecialties] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleSpecialty(s: string) {
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_name.trim()) {
      setError("Company name is required.")
      return
    }
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from("vendors").insert({
      company_name: form.company_name.trim(),
      contact_name: form.contact_name || null,
      phone: form.phone || null,
      email: form.email || null,
      website: form.website || null,
      specialty_categories: specialties.length ? specialties : null,
      license_number: form.license_number || null,
      insurance_expiration: form.insurance_expiration || null,
      status: form.status as "preferred" | "approved" | "probationary" | "blacklisted",
      notes: form.notes || null,
    })

    setSaving(false)
    if (error) { setError(error.message); return }

    setOpen(false)
    setForm(EMPTY)
    setSpecialties([])
    router.refresh()
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setForm(EMPTY)
      setSpecialties([])
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E] gap-1.5">
          <Plus className="h-4 w-4" /> Add Vendor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Vendor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input id="company_name" value={form.company_name} onChange={e => set("company_name", e.target.value)} placeholder="e.g. Desert Air HVAC" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input id="contact_name" value={form.contact_name} onChange={e => set("contact_name", e.target.value)} placeholder="e.g. Mike Reyes" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="e.g. (480) 555-0142" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="e.g. dispatch@desertair.com" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" value={form.website} onChange={e => set("website", e.target.value)} placeholder="e.g. https://desertair.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="license_number">License #</Label>
              <Input id="license_number" value={form.license_number} onChange={e => set("license_number", e.target.value)} placeholder="e.g. ROC 123456" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="insurance_expiration">Insurance Expires</Label>
              <Input id="insurance_expiration" type="date" value={form.insurance_expiration} onChange={e => set("insurance_expiration", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Specialties</Label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialty(s)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    specialties.includes(s)
                      ? "border-[#0E7C67] bg-amber-50 text-[#1A2320]"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Pricing, availability, who referred them, quality of past work..." rows={2} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E]">
              {saving ? "Saving..." : "Add Vendor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
