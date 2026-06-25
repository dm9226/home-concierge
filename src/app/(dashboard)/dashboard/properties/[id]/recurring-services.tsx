"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus, Pencil, Trash2, Loader2, CalendarClock, Phone, KeyRound,
  Building2, RotateCw,
} from "lucide-react"

// The seven service types from the source checklist, plus an escape hatch.
const SERVICE_TYPES = [
  "Pest Control", "HVAC / AC Service", "Water Tank Service", "Landscaping",
  "Gutters", "Cleaning", "Pool", "Other",
]

const FREQUENCIES = [
  "Weekly", "Bi-weekly", "Monthly", "Quarterly", "Semi-annual", "Annual", "As needed",
]

interface ServiceRow {
  id: string
  vendor_id: string | null
  service_type: string
  company_name: string | null
  frequency: string | null
  access_needed: string | null
  schedule: string | null
  phone: string | null
  notes: string | null
}

interface VendorOption {
  id: string
  company_name: string
  phone: string | null
}

const EMPTY = {
  service_type: "", vendor_id: "", company_name: "", frequency: "",
  access_needed: "", schedule: "", phone: "", notes: "",
}

export function RecurringServices({ propertyId }: { propertyId: string }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<ServiceRow[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [editingId, setEditingId] = useState<string | "new" | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: svc }, { data: vnd }] = await Promise.all([
        supabase
          .from("recurring_services")
          .select("id, vendor_id, service_type, company_name, frequency, access_needed, schedule, phone, notes")
          .eq("property_id", propertyId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("vendors")
          .select("id, company_name, phone")
          .neq("status", "blacklisted")
          .order("company_name", { ascending: true }),
      ])
      setServices(svc ?? [])
      setVendors(vnd ?? [])
      setLoading(false)
    }
    load()
  }, [propertyId])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function openAdd() {
    setForm(EMPTY)
    setError(null)
    setEditingId("new")
  }

  function openEdit(s: ServiceRow) {
    setForm({
      service_type: s.service_type,
      vendor_id: s.vendor_id ?? "",
      company_name: s.company_name ?? "",
      frequency: s.frequency ?? "",
      access_needed: s.access_needed ?? "",
      schedule: s.schedule ?? "",
      phone: s.phone ?? "",
      notes: s.notes ?? "",
    })
    setError(null)
    setEditingId(s.id)
  }

  function pickVendor(vendorId: string) {
    if (vendorId === "none") {
      setForm(f => ({ ...f, vendor_id: "" }))
      return
    }
    const v = vendors.find(x => x.id === vendorId)
    setForm(f => ({
      ...f,
      vendor_id: vendorId,
      company_name: v?.company_name ?? f.company_name,
      phone: f.phone || v?.phone || "",
    }))
  }

  async function save() {
    if (!form.service_type) { setError("Pick a service type."); return }
    setSaving(true)
    setError(null)

    const payload = {
      property_id: propertyId,
      vendor_id: form.vendor_id || null,
      service_type: form.service_type,
      company_name: form.company_name || null,
      frequency: form.frequency || null,
      access_needed: form.access_needed || null,
      schedule: form.schedule || null,
      phone: form.phone || null,
      notes: form.notes || null,
    }

    if (editingId === "new") {
      const { data, error } = await supabase.from("recurring_services").insert(payload).select().single()
      setSaving(false)
      if (error) { setError(error.message); return }
      if (data) setServices(prev => [...prev, data as ServiceRow])
    } else if (editingId) {
      const { data, error } = await supabase.from("recurring_services").update(payload).eq("id", editingId).select().single()
      setSaving(false)
      if (error) { setError(error.message); return }
      if (data) setServices(prev => prev.map(s => s.id === editingId ? (data as ServiceRow) : s))
    }
    setEditingId(null)
    setForm(EMPTY)
  }

  async function remove(id: string) {
    const prev = services
    setServices(s => s.filter(x => x.id !== id))
    const { error } = await supabase.from("recurring_services").delete().eq("id", id)
    if (error) setServices(prev)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">Recurring Services</h3>
          <p className="text-sm text-slate-500">Standing service providers: who comes, how often, and what access they need.</p>
        </div>
        {editingId === null && (
          <Button size="sm" onClick={openAdd} className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f] gap-1.5">
            <Plus className="h-4 w-4" /> Add Service
          </Button>
        )}
      </div>

      {/* Add / edit form */}
      {editingId !== null && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Service Type *</Label>
              <Select value={form.service_type} onValueChange={v => set("service_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={form.frequency || undefined} onValueChange={v => set("frequency", v)}>
                <SelectTrigger><SelectValue placeholder="How often..." /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {vendors.length > 0 && (
              <div className="col-span-2 space-y-1.5">
                <Label>Vendor (optional)</Label>
                <Select value={form.vendor_id || "none"} onValueChange={pickVendor}>
                  <SelectTrigger><SelectValue placeholder="Link to a vendor..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked vendor</SelectItem>
                    {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="company_name">Company</Label>
              <Input id="company_name" value={form.company_name} onChange={e => set("company_name", e.target.value)} placeholder="e.g. ABC Pools" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="e.g. (480) 555-0199" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule">Scheduled Day / Time</Label>
              <Input id="schedule" value={form.schedule} onChange={e => set("schedule", e.target.value)} placeholder="e.g. 2nd Tuesday, mornings" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="access_needed">Access Needed</Label>
              <Input id="access_needed" value={form.access_needed} onChange={e => set("access_needed", e.target.value)} placeholder="e.g. Gate code, side yard" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} placeholder="Anything the concierge should know" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setEditingId(null); setForm(EMPTY) }}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f] gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId === "new" ? "Add Service" : "Save Changes"}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {services.length === 0 && editingId === null ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <RotateCw className="h-12 w-12 text-slate-300 mb-3" />
          <p className="font-medium text-slate-500">No recurring services yet</p>
          <p className="text-sm text-slate-400 mt-1">Add the pool, pest control, landscaping, and other standing providers for this home.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {services.map(s => (
            <div key={s.id} className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-[#0F1B2D] dark:text-white">{s.service_type}</p>
                  {(s.company_name || s.frequency) && (
                    <p className="text-sm text-slate-500">
                      {s.company_name}{s.company_name && s.frequency ? " · " : ""}{s.frequency}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(s)} className="rounded p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => remove(s.id)} className="rounded p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50" title="Remove">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                {s.schedule && (
                  <div className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5 shrink-0" />{s.schedule}</div>
                )}
                {s.access_needed && (
                  <div className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5 shrink-0" />{s.access_needed}</div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0" />{s.phone}</div>
                )}
                {s.vendor_id && (
                  <div className="flex items-center gap-1.5 text-[#C9A96E]"><Building2 className="h-3.5 w-3.5 shrink-0" />Linked vendor</div>
                )}
              </div>

              {s.notes && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{s.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
