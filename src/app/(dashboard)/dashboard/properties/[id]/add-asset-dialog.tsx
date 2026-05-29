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
import { Plus, Camera, Upload, Loader2, Sparkles, CheckCircle2, PenLine } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"choose" | "scan" | "manual">("choose")
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

  function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const MAX = 1200
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX }
          else { width = Math.round(width * MAX / height); height = MAX }
        }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height)
        canvas.toBlob(blob => resolve(blob!), "image/jpeg", 0.85)
      }
      img.src = url
    })
  }

  async function processImage(file: File) {
    setPreview(URL.createObjectURL(file))
    setScanning(true)
    setScanned(false)
    setScanError(null)

    const compressed = await compressImage(file)
    const data = new FormData()
    data.append("image", compressed, "label.jpg")

    const res = await fetch("/api/admin/scan-asset", { method: "POST", body: data })
    const result = await res.json()
    setScanning(false)

    if (!res.ok || result.error) {
      setScanError(`Scan failed (${res.status}): ${result.error ?? "unknown error"}`)
      setMode("manual")
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
    setMode("manual")
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
    setMode("choose")
    router.refresh()
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setForm(EMPTY)
      setPreview(null)
      setScanned(false)
      setScanError(null)
      setError(null)
      setMode("choose")
    }
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

        {/* Mode: choose */}
        {mode === "choose" && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-500">How do you want to add this item?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("scan")}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 p-6 text-center hover:border-[#C9A96E] hover:bg-amber-50/50 transition-colors"
              >
                <Sparkles className="h-8 w-8 text-[#C9A96E]" />
                <div>
                  <p className="font-semibold text-[#0F1B2D] text-sm">Scan Label</p>
                  <p className="text-xs text-slate-400 mt-0.5">Photo auto-fills details</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 p-6 text-center hover:border-[#C9A96E] hover:bg-amber-50/50 transition-colors"
              >
                <PenLine className="h-8 w-8 text-slate-400" />
                <div>
                  <p className="font-semibold text-[#0F1B2D] text-sm">Enter Manually</p>
                  <p className="text-xs text-slate-400 mt-0.5">Type the details yourself</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Mode: scan */}
        {mode === "scan" && (
          <div className="space-y-4 py-2">
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Label" className="mx-auto max-h-48 rounded-xl object-contain w-full" />
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                    <div className="text-center text-white">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm font-medium">Analyzing label...</p>
                    </div>
                  </div>
                )}
                {scanned && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white shadow">
                    <CheckCircle2 className="h-3 w-3" /> Details extracted
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 py-10">
                <Sparkles className="h-10 w-10 text-[#C9A96E]" />
                <div className="text-center">
                  <p className="font-medium text-[#0F1B2D]">Take a photo of the label</p>
                  <p className="text-xs text-slate-400 mt-0.5">Serial number plate, data tag, or nameplate</p>
                </div>
              </div>
            )}

            {scanError && (
              <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">{scanError}</p>
            )}

            {/* Hidden file inputs -- one for camera, one for gallery */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) processImage(f) }}
            />
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) processImage(f) }}
            />

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => cameraRef.current?.click()}
                disabled={scanning}
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => uploadRef.current?.click()}
                disabled={scanning}
              >
                <Upload className="h-4 w-4" />
                Upload Image
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-slate-200" />
              <span className="text-xs text-slate-400">or</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-slate-500"
              onClick={() => setMode("manual")}
            >
              Enter details manually instead
            </Button>
          </div>
        )}

        {/* Mode: manual (form) -- shown after scan too */}
        {mode === "manual" && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {scanned && preview && (
              <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <img src={preview} alt="Label" className="h-12 w-12 rounded object-cover shrink-0" />
                <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Details extracted from label -- review and confirm
                </div>
              </div>
            )}

            {scanError && (
              <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">{scanError}</p>
            )}

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
                <Label htmlFor="location">Location in Home</Label>
                <Input id="location" value={form.location_in_home} onChange={e => set("location_in_home", e.target.value)} placeholder="e.g. Basement" />
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
                <Label htmlFor="lifespan">Expected Lifespan (yrs)</Label>
                <Input id="lifespan" type="number" value={form.expected_lifespan_years} onChange={e => set("expected_lifespan_years", e.target.value)} placeholder="e.g. 15" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="BTU rating, voltage, refrigerant type..." rows={2} />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-between gap-3 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode("choose")} className="text-slate-400">
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f]">
                  {saving ? "Saving..." : "Save to Inventory"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
