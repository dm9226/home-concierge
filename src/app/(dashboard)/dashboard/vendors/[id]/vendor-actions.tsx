"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Trash2 } from "lucide-react"
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

interface Vendor {
  id: string
  company_name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  website: string | null
  specialty_categories: string[] | null
  license_number: string | null
  insurance_expiration: string | null
  rating: number | null
  status: "preferred" | "approved" | "probationary" | "blacklisted"
  notes: string | null
}

export function VendorActions({ vendor }: { vendor: Vendor }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    company_name: vendor.company_name,
    contact_name: vendor.contact_name ?? "",
    phone: vendor.phone ?? "",
    email: vendor.email ?? "",
    website: vendor.website ?? "",
    license_number: vendor.license_number ?? "",
    insurance_expiration: vendor.insurance_expiration ?? "",
    rating: vendor.rating != null ? String(vendor.rating) : "",
    status: vendor.status,
    notes: vendor.notes ?? "",
  })
  const [specialties, setSpecialties] = useState<string[]>(vendor.specialty_categories ?? [])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleSpecialty(s: string) {
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_name.trim()) {
      setError("Company name is required.")
      return
    }
    const ratingNum = form.rating ? parseFloat(form.rating) : null
    if (ratingNum != null && (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5)) {
      setError("Rating must be between 0 and 5.")
      return
    }
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from("vendors").update({
      company_name: form.company_name.trim(),
      contact_name: form.contact_name || null,
      phone: form.phone || null,
      email: form.email || null,
      website: form.website || null,
      specialty_categories: specialties.length ? specialties : null,
      license_number: form.license_number || null,
      insurance_expiration: form.insurance_expiration || null,
      rating: ratingNum,
      status: form.status,
      notes: form.notes || null,
    }).eq("id", vendor.id)

    setSaving(false)
    if (error) { setError(error.message); return }

    setEditOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from("vendors").delete().eq("id", vendor.id)

    setDeleting(false)
    if (error) { setError(error.message); return }

    router.push("/dashboard/vendors")
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      {/* Edit */}
      <Dialog open={editOpen} onOpenChange={v => { setEditOpen(v); if (!v) setError(null) }}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Edit Vendor</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input id="company_name" value={form.company_name} onChange={e => set("company_name", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input id="contact_name" value={form.contact_name} onChange={e => set("contact_name", e.target.value)} />
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
                <Input id="phone" type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <Input id="website" type="url" value={form.website} onChange={e => set("website", e.target.value)} placeholder="e.g. https://desertair.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="license_number">License #</Label>
                <Input id="license_number" value={form.license_number} onChange={e => set("license_number", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="insurance_expiration">Insurance Expires</Label>
                <Input id="insurance_expiration" type="date" value={form.insurance_expiration} onChange={e => set("insurance_expiration", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rating">Rating (0-5)</Label>
                <Input id="rating" type="number" step="0.1" min="0" max="5" value={form.rating} onChange={e => set("rating", e.target.value)} placeholder="e.g. 4.5" />
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
                        ? "border-[#C9A96E] bg-amber-50 text-[#0F1B2D]"
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
              <Textarea id="notes" value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f]">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={deleteOpen} onOpenChange={v => { setDeleteOpen(v); if (!v) setError(null) }}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Remove {vendor.company_name}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the vendor. Past work orders and projects stay intact but will no longer be linked to this vendor. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleDelete} disabled={deleting} className="bg-red-600 text-white hover:bg-red-700">
              {deleting ? "Removing..." : "Remove Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
