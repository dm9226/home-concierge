"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Images, Upload, Loader2, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, X } from "lucide-react"
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

const REQUIRED_FIELDS = ["name", "category"] as const

interface ScannedItem {
  id: string
  file: File
  previewUrl: string
  status: "pending" | "scanning" | "done" | "error"
  errorMsg?: string
  included: boolean
  expanded: boolean
  // form fields
  name: string
  brand: string
  model: string
  serial_number: string
  category: string
  manufacture_date: string
  install_date: string
  warranty_expiration: string
  warranty_estimated: boolean
  expected_lifespan_years: string
  location_in_home: string
  filter_size: string
  notes: string
}

interface Props {
  propertyId: string
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

function emptyItem(file: File): ScannedItem {
  return {
    id: `${Date.now()}-${Math.random()}`,
    file,
    previewUrl: URL.createObjectURL(file),
    status: "pending",
    included: true,
    expanded: false,
    name: "", brand: "", model: "", serial_number: "",
    category: "", manufacture_date: "", install_date: "",
    warranty_expiration: "", warranty_estimated: false,
    expected_lifespan_years: "", location_in_home: "", filter_size: "", notes: "",
  }
}

function isIncomplete(item: ScannedItem) {
  return !item.name || !item.category
}

export function BulkScanDialog({ propertyId }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<"upload" | "scanning" | "review">("upload")
  const [items, setItems] = useState<ScannedItem[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  function addFiles(files: FileList | File[]) {
    const newItems = Array.from(files)
      .filter(f => f.type.startsWith("image/") || f.name.toLowerCase().endsWith(".heic"))
      .map(emptyItem)
    setItems(prev => [...prev, ...newItems])
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function updateItem(id: string, patch: Partial<ScannedItem>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  function setField(id: string, field: string, value: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }, [])

  async function scanItem(item: ScannedItem): Promise<Partial<ScannedItem>> {
    try {
      const compressed = await compressImage(item.file)
      const data = new FormData()
      data.append("image", compressed, "label.jpg")
      const res = await fetch("/api/admin/scan-asset", { method: "POST", body: data })
      const result = await res.json()

      if (!res.ok || result.error) {
        return { status: "error", errorMsg: result.error ?? `HTTP ${res.status}` }
      }

      return {
        status: "done",
        name: result.name ?? "",
        brand: result.brand ?? "",
        model: result.model ?? "",
        serial_number: result.serial_number ?? "",
        category: result.category ?? "",
        manufacture_date: result.manufacture_date ?? "",
        install_date: result.install_date ?? "",
        warranty_expiration: result.warranty_expiration ?? "",
        warranty_estimated: !!result.warranty_estimated,
        expected_lifespan_years: result.expected_lifespan_years ? String(result.expected_lifespan_years) : "",
        notes: result.notes ?? "",
      }
    } catch (err: any) {
      return { status: "error", errorMsg: err?.message ?? "Network error" }
    }
  }

  async function startScanning() {
    setStage("scanning")
    const pending = items.filter(i => i.status === "pending")
    const CONCURRENCY = 3

    // Mark all as scanning initially
    setItems(prev => prev.map(i => i.status === "pending" ? { ...i, status: "scanning" } : i))

    // Process in batches of CONCURRENCY
    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      const batch = pending.slice(i, i + CONCURRENCY)
      await Promise.all(batch.map(async (item) => {
        const patch = await scanItem(item)
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, ...patch } : it))
      }))
    }

    setStage("review")
  }

  async function handleSave() {
    const toSave = items.filter(i => i.included)
    if (toSave.length === 0) return

    setSaving(true)
    setSaveError(null)
    const supabase = createClient()

    const rows = toSave.map(item => ({
      property_id: propertyId,
      name: item.name || "Unknown",
      brand: item.brand || null,
      model: item.model || null,
      serial_number: item.serial_number || null,
      category: (item.category || "other") as any,
      manufacture_date: item.manufacture_date || null,
      install_date: item.install_date || null,
      warranty_expiration: item.warranty_expiration || null,
      expected_lifespan_years: item.expected_lifespan_years ? parseInt(item.expected_lifespan_years) : null,
      location_in_home: item.location_in_home || null,
      filter_size: item.filter_size || null,
      notes: item.notes || null,
      status: "active" as const,
    }))

    const { error } = await supabase.from("assets").insert(rows)
    setSaving(false)

    if (error) {
      setSaveError(error.message)
      return
    }

    setOpen(false)
    // Redirect to inventory tab so they can see the new items
    router.push(window.location.pathname + "?tab=inventory")
    router.refresh()
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      // cleanup preview URLs
      items.forEach(i => URL.revokeObjectURL(i.previewUrl))
      setItems([])
      setStage("upload")
      setSaveError(null)
    }
  }

  const includedCount = items.filter(i => i.included).length
  const incompleteCount = items.filter(i => i.included && isIncomplete(i)).length
  const errorCount = items.filter(i => i.status === "error").length
  const scannedCount = items.filter(i => i.status === "done" || i.status === "error").length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Images className="h-4 w-4" /> Bulk Import
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-display text-xl">Bulk Inventory Import</DialogTitle>
        </DialogHeader>

        {/* STAGE: UPLOAD */}
        {stage === "upload" && (
          <div className="flex flex-col gap-4 overflow-y-auto">
            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors py-10",
                isDragging
                  ? "border-[#0E7C67] bg-amber-50/60"
                  : "border-slate-200 hover:border-[#0E7C67] hover:bg-amber-50/30"
              )}
            >
              <Upload className="h-10 w-10 text-[#0E7C67]" />
              <div className="text-center">
                <p className="font-medium text-[#1A2320]">Drop appliance label photos here</p>
                <p className="text-xs text-slate-400 mt-1">or click to browse -- JPEG, PNG, HEIC accepted</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic"
              multiple
              className="hidden"
              onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = "" }}
            />

            {/* Thumbnail grid */}
            {items.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {items.map(item => (
                  <div key={item.id} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-100">
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/40 px-1.5 py-1">
                      <p className="text-white text-[10px] truncate">{item.file.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-1 shrink-0">
              <p className="text-sm text-slate-500">
                {items.length === 0 ? "No photos selected" : `${items.length} photo${items.length === 1 ? "" : "s"} selected`}
              </p>
              <Button
                onClick={startScanning}
                disabled={items.length === 0}
                className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E] gap-1.5"
              >
                Scan {items.length > 0 ? `${items.length} ` : ""}Photo{items.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        )}

        {/* STAGE: SCANNING */}
        {stage === "scanning" && (
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Scanning labels...</span>
                <span className="font-medium text-[#1A2320]">{scannedCount} / {items.length}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-[#0E7C67] transition-all duration-300"
                  style={{ width: `${items.length ? (scannedCount / items.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {items.map(item => (
                <div key={item.id} className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-100">
                  <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                    {item.status === "scanning" && (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    )}
                    {item.status === "done" && (
                      <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    )}
                    {item.status === "error" && (
                      <XCircle className="h-6 w-6 text-red-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STAGE: REVIEW */}
        {stage === "review" && (
          <div className="flex flex-col gap-4 min-h-0">
            {/* Summary bar */}
            <div className="flex flex-wrap gap-2 text-xs shrink-0">
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 font-medium">
                {items.filter(i => i.status === "done").length} scanned
              </span>
              {errorCount > 0 && (
                <span className="rounded-full bg-red-100 text-red-800 px-2.5 py-1 font-medium">
                  {errorCount} failed
                </span>
              )}
              {incompleteCount > 0 && (
                <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 font-medium">
                  {incompleteCount} need review
                </span>
              )}
            </div>

            {/* Scrollable card list */}
            <div className="overflow-y-auto space-y-3 pr-1">
              {items.map(item => {
                const incomplete = isIncomplete(item)
                const failed = item.status === "error"

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-xl border bg-white overflow-hidden",
                      !item.included && "opacity-50",
                      failed ? "border-red-200" : incomplete ? "border-amber-200" : "border-slate-200"
                    )}
                  >
                    {/* Card header row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={item.included}
                        onChange={e => updateItem(item.id, { included: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 accent-[#0E7C67] shrink-0"
                      />

                      {/* Thumbnail */}
                      <img
                        src={item.previewUrl}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover shrink-0 border border-slate-200"
                      />

                      {/* Name + badges */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-[#1A2320] truncate">
                          {item.name || <span className="text-slate-400 italic">Unnamed</span>}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.brand && `${item.brand} `}{item.model || ""}
                        </p>
                      </div>

                      {/* Alert badges */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {failed && (
                          <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                            <XCircle className="h-3 w-3" /> Scan failed
                          </span>
                        )}
                        {!failed && incomplete && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            <AlertTriangle className="h-3 w-3" /> Review
                          </span>
                        )}
                        {!failed && !incomplete && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}

                        {/* Expand toggle */}
                        <button
                          type="button"
                          onClick={() => updateItem(item.id, { expanded: !item.expanded })}
                          className="ml-1 rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        >
                          {item.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded edit form */}
                    {item.expanded && (
                      <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                        {failed && item.errorMsg && (
                          <p className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                            Scan error: {item.errorMsg} -- fill in manually or uncheck to skip.
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Item Name *</Label>
                            <Input
                              value={item.name}
                              onChange={e => setField(item.id, "name", e.target.value)}
                              placeholder="e.g. Central Air Handler"
                              className="h-8 text-sm"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Category *</Label>
                            <Select value={item.category} onValueChange={v => setField(item.id, "category", v)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Brand</Label>
                            <Input value={item.brand} onChange={e => setField(item.id, "brand", e.target.value)} placeholder="e.g. Lennox" className="h-8 text-sm" />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Model Number</Label>
                            <Input value={item.model} onChange={e => setField(item.id, "model", e.target.value)} placeholder="e.g. CBX32MV-036" className="h-8 text-sm" />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Serial Number</Label>
                            <Input value={item.serial_number} onChange={e => setField(item.id, "serial_number", e.target.value)} placeholder="e.g. 5812A12345" className="h-8 text-sm" />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Location in Home</Label>
                            <Input value={item.location_in_home} onChange={e => setField(item.id, "location_in_home", e.target.value)} placeholder="e.g. Basement" className="h-8 text-sm" />
                          </div>
                          {item.category === "hvac" && (
                            <div className="space-y-1">
                              <Label className="text-xs">Filter Size</Label>
                              <Input value={item.filter_size} onChange={e => setField(item.id, "filter_size", e.target.value)} placeholder="e.g. 20x25x1" className="h-8 text-sm" />
                            </div>
                          )}

                          <div className="space-y-1">
                            <Label className="text-xs">Manufacture Date</Label>
                            <Input type="date" value={item.manufacture_date} onChange={e => setField(item.id, "manufacture_date", e.target.value)} className="h-8 text-sm" />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Install Date</Label>
                            <Input type="date" value={item.install_date} onChange={e => setField(item.id, "install_date", e.target.value)} className="h-8 text-sm" />
                          </div>

                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">
                              Warranty Expires
                              {item.warranty_estimated && (
                                <span className="ml-2 font-normal text-amber-600">(estimated -- update if you have paperwork)</span>
                              )}
                            </Label>
                            <Input
                              type="date"
                              value={item.warranty_expiration}
                              onChange={e => { setField(item.id, "warranty_expiration", e.target.value); updateItem(item.id, { warranty_estimated: false }) }}
                              className="h-8 text-sm"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Expected Lifespan (yrs)</Label>
                            <Input type="number" value={item.expected_lifespan_years} onChange={e => setField(item.id, "expected_lifespan_years", e.target.value)} placeholder="e.g. 15" className="h-8 text-sm" />
                          </div>

                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Notes</Label>
                            <Textarea value={item.notes} onChange={e => setField(item.id, "notes", e.target.value)} placeholder="BTU rating, voltage, refrigerant type..." rows={2} className="text-sm resize-none" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-100 pt-3">
              {saveError && (
                <p className="mb-2 text-sm text-red-600">{saveError}</p>
              )}
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">
                  {includedCount} item{includedCount === 1 ? "" : "s"} selected to save
                  {incompleteCount > 0 && (
                    <span className="ml-1.5 text-amber-600">({incompleteCount} incomplete)</span>
                  )}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || includedCount === 0}
                    className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E]"
                  >
                    {saving ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Saving...</>
                    ) : (
                      `Save ${includedCount} Item${includedCount === 1 ? "" : "s"} to Inventory`
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
