"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Camera, Loader2, Sparkles, CheckCircle2 } from "lucide-react"

const CATEGORIES = [
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "appliance", label: "Appliance" },
  { value: "roofing", label: "Roofing" },
  { value: "exterior", label: "Exterior" },
  { value: "pool", label: "Pool" },
  { value: "landscaping", label: "Landscaping" },
  { value: "smart_home", label: "Smart Home" },
  { value: "security", label: "Security" },
  { value: "other", label: "Other" },
]

interface Props {
  propertyId: string
}

const EMPTY = {
  name: "", brand: "", model: "", serial_number: "",
  category: "", install_date: "", warranty_expiration: "",
  expected_lifespan_years: "", location_in_home: "", notes: "",
}

export function AddAssetDialog({ propertyId }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setScanning(true)
    setScanned(false)
    setScanError(null)

    const data = new FormData()
    data.append("image", file)

    const res = await fetch("/api/admin/scan-asset", { method: "POST", body: data })
    const result = await res.json()
    setScanning(false)

    if (!res.ok || result.error) {
      setScanError("Could not read the label. Fill in the details manually.")
      return
    }

    setForm(f => ({
      ...f,
      name: result.name ?? f.name,
      brand: result.brand ?? f.brand,
      model: result.model ?? f.model,
      serial_number: result.serial_number ?? f.serial_number,
      category: result.category ?? f.category,
      install_date: result.install_date ?? f.install_date,
      warranty_expiration: result.warranty_expiration ?? f.warranty_expiration,
      expected_lifespan_years: result.expected_lifespan_years ? String(result.expected_lifespan_years) : f.expected_lifespan_years,
      notes: result.notes ?? f.notes,
    }))
    setScanned(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.category) {
      setError("Name and category are required.")
      return
    }
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from("assets").insert({
      property_id: propertyId,
      name: form.name,
      brand: form.brand || null,
      model: form.model || null,
      serial_number: form.serial_number || null,
      category: form.category as any,
      install_date: form.install_date || null,
      warranty_expiration: form.warranty_expiration || null,
      expected_lifespan_years: form.expected_lifespan_years ? parseInt(form.expected_lifespan_years) : null,
      location_in_home: form.location_in_home || null,
      notes: form.notes || null,
      status: "active",
    })

    setSaving(false)
    if (error) { setError(error.message); return }

    setOpen(false)
    setForm(EMPTY)
    setPreview(null)
    setScanned(false)
    router.refresh()
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) { setForm(EMPTY); setPreview(null); setScanned(false); setScanError(null); setError(null) }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f] gap-1.5">
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Inventory Item</DialogTitle>
        </DialogHeader>

        {/* Scan section */}
        <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-4 text-center space-y-3">
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Label" className="mx-auto max-h-40 rounded-lg object-contain" />
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                  <div className="text-center text-white">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm font-medium">Analyzing label...</p>
                  </div>
                </div>
              )}
              {scanned && (
                <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-xs font-medium text-white">
                  <CheckCircle2 className="h-3 w-3" /> Details extracted
                </div>
              )}
            </div>
          ) : (
            <div className="py-2">
              <Sparkles className="h-8 w-8 text-[#C9A96E] mx-auto mb-2" />
              <p className="text-sm font-medium text-[#0F1B2D] dark:text-white">Scan a label to auto-fill</p>
              <p className="text-xs text-slate-500 mt-0.5">Take a photo of the serial number plate or data label</p>
            </div>
          )}

          {scanError && <p className="text-xs text-amber-600">{scanError}</p>}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => fileRef.current?.click()}
            disabled={scanning}
          >
            <Camera className="h-4 w-4" />
            {preview ? "Scan a different label" : "Take Photo / Upload Image"}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">Item Name *</Label>
              <Input id="name" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Central Air Handler" required />
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => set("category", v)} required>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" value={form.brand} onChange={e => set("brand", e.target.value)} placeholder="e.g. Lennox" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">Model Number</Label>
              <Input id="model" value={form.model} onChange={e => set("model", e.target.value)} placeholder="e.g. CBX32MV-036" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serial">Serial Number</Label>
              <Input id="serial" value={form.serial_number} onChange={e => set("serial_number", e.target.value)} placeholder="e.g. 5812A12345" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="install_date">Install Date</Label>
              <Input id="install_date" type="date" value={form.install_date} onChange={e => set("install_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="warranty">Warranty Expires</Label>
              <Input id="warranty" type="date" value={form.warranty_expiration} onChange={e => set("warranty_expiration", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lifespan">Expected Lifespan (years)</Label>
              <Input id="lifespan" type="number" value={form.expected_lifespan_years} onChange={e => set("expected_lifespan_years", e.target.value)} placeholder="e.g. 15" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location in Home</Label>
              <Input id="location" value={form.location_in_home} onChange={e => set("location_in_home", e.target.value)} placeholder="e.g. Basement, Utility Room" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="BTU rating, voltage, capacity, refrigerant type..." rows={2} />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f]">
              {saving ? "Saving..." : "Save to Inventory"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
