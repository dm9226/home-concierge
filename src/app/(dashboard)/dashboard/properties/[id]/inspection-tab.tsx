"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Camera, ChevronDown, ChevronUp, Flag, Loader2, CheckCircle2,
  AlertTriangle, ClipboardList, Plus, Zap, Droplets, Wind,
  Home, UtensilsCrossed, TriangleRight, Layers, Waves
} from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Section + Item definitions
// ---------------------------------------------------------------------------

type ItemType = "condition" | "equipment" | "data"
type Condition = "good" | "fair" | "poor" | "na"

interface SectionItem {
  key: string
  label: string
  type: ItemType
  assetCategory?: string   // equipment items: pre-fills asset category
  placeholder?: string     // data items: input placeholder
}

interface Section {
  key: string
  label: string
  icon: React.ReactNode
  items: SectionItem[]
}

// --- Inspection layout config (room counts + feature flags) ---
interface InspectionConfig {
  bedrooms?: number
  bathrooms?: number
  pool?: boolean
  fencing?: boolean
  guest_house?: boolean
}

const DEFAULT_CONFIG: Required<InspectionConfig> = {
  bedrooms: 3, bathrooms: 2, pool: false, fencing: false, guest_house: false,
}

// Per-room item templates (repeated for each bedroom / bathroom instance)
const BEDROOM_ITEMS: SectionItem[] = [
  { key: "floors",         label: "Floors",                 type: "condition" },
  { key: "walls_ceilings", label: "Walls & Ceilings",       type: "condition" },
  { key: "doors",          label: "Interior Doors",         type: "condition" },
  { key: "windows",        label: "Windows",                type: "condition" },
  { key: "outlets",        label: "Switches & Receptacles", type: "condition" },
  { key: "lights",         label: "Lights",                 type: "condition" },
]

const BATHROOM_ITEMS: SectionItem[] = [
  { key: "sink",       label: "Sink",                   type: "condition" },
  { key: "toilet",     label: "Toilet",                 type: "condition" },
  { key: "tub_shower", label: "Tub / Shower",           type: "condition" },
  { key: "vent_fan",   label: "Vent Fan",               type: "condition" },
  { key: "caulking",   label: "Caulking / Seals",       type: "condition" },
  { key: "outlets",    label: "Switches & Receptacles", type: "condition" },
  { key: "lights",     label: "Lights",                 type: "condition" },
]

// Fixed sections, declared once and assembled in walkthrough order below
const SEC_EXTERIOR: Section = {
  key: "exterior", label: "Exterior", icon: <Home className="h-4 w-4" />,
  items: [
    { key: "roof",        label: "Roof Condition",           type: "condition" },
    { key: "gutters",     label: "Gutters & Downspouts",     type: "condition" },
    { key: "siding",      label: "Siding / Exterior Walls",  type: "condition" },
    { key: "windows_ext", label: "Windows & Frames",         type: "condition" },
    { key: "doors_ext",   label: "Doors & Locks",            type: "condition" },
    { key: "driveway",    label: "Driveway / Walkways",      type: "condition" },
    { key: "deck_patio",  label: "Deck / Patio",             type: "condition" },
    { key: "garage_door", label: "Garage Door",              type: "condition" },
    { key: "drainage",    label: "Drainage",                 type: "condition" },
    { key: "foundation",  label: "Foundation (Visible)",     type: "condition" },
  ],
}
const SEC_INTERIOR: Section = {
  key: "interior", label: "Interior (Common Areas)", icon: <Layers className="h-4 w-4" />,
  items: [
    { key: "floors",         label: "Floors",                 type: "condition" },
    { key: "walls_ceilings", label: "Walls & Ceilings",       type: "condition" },
    { key: "doors_int",      label: "Interior Doors",         type: "condition" },
    { key: "windows_int",    label: "Windows (Interior)",     type: "condition" },
    { key: "stairs",         label: "Stairs & Railings",      type: "condition" },
    { key: "smoke_det",      label: "Smoke Detectors",        type: "condition" },
    { key: "co_det",         label: "CO Detectors",           type: "condition" },
  ],
}
const SEC_APPLIANCES: Section = {
  key: "appliances", label: "Kitchen Appliances", icon: <UtensilsCrossed className="h-4 w-4" />,
  items: [
    { key: "refrigerator", label: "Refrigerator",          type: "equipment", assetCategory: "appliance" },
    { key: "oven_range",   label: "Oven / Range",          type: "equipment", assetCategory: "appliance" },
    { key: "dishwasher",   label: "Dishwasher",            type: "equipment", assetCategory: "appliance" },
    { key: "microwave",    label: "Microwave",             type: "equipment", assetCategory: "appliance" },
    { key: "disposal",     label: "Garbage Disposal",      type: "equipment", assetCategory: "appliance" },
    { key: "range_hood",   label: "Range Hood / Vent",     type: "equipment", assetCategory: "appliance" },
    { key: "water_filter", label: "Water Filter System",   type: "equipment", assetCategory: "plumbing" },
  ],
}
const SEC_HVAC: Section = {
  key: "hvac", label: "HVAC", icon: <Wind className="h-4 w-4" />,
  items: [
    { key: "air_handler",    label: "Air Handler / Furnace",     type: "equipment", assetCategory: "hvac" },
    { key: "condenser",      label: "AC Condenser (Outdoor)",    type: "equipment", assetCategory: "hvac" },
    { key: "thermostat",     label: "Thermostat",                type: "condition" },
    { key: "ductwork",       label: "Ductwork (Visible)",        type: "condition" },
    { key: "filter_loc",     label: "Filter Location",           type: "data", placeholder: "e.g. Return vent in hallway" },
    { key: "filter_size",    label: "Filter Size",               type: "data", placeholder: "e.g. 20x25x1" },
    { key: "hvac_location",  label: "System Location",           type: "data", placeholder: "e.g. Attic / Basement / Closet" },
    { key: "fuel_type",      label: "Fuel Type",                 type: "data", placeholder: "e.g. Gas / Electric / Heat Pump" },
  ],
}
const SEC_PLUMBING: Section = {
  key: "plumbing", label: "Plumbing", icon: <Droplets className="h-4 w-4" />,
  items: [
    { key: "water_heater",   label: "Water Heater",              type: "equipment", assetCategory: "plumbing" },
    { key: "sump_pump",      label: "Sump Pump",                 type: "condition" },
    { key: "water_pressure", label: "Water Pressure",            type: "condition" },
    { key: "supply_lines",   label: "Supply Lines (Visible)",    type: "condition" },
    { key: "drain_pipes",    label: "Drain / Waste (Visible)",   type: "condition" },
    { key: "faucets",        label: "Faucets & Fixtures",        type: "condition" },
    { key: "shutoff_loc",    label: "Main Water Shutoff",        type: "data", placeholder: "e.g. Left side of house, near meter" },
    { key: "cleanout_loc",   label: "Cleanout Location",         type: "data", placeholder: "e.g. Basement floor near utility sink" },
    { key: "pipe_material",  label: "Pipe Material",             type: "data", placeholder: "e.g. PEX, Copper, CPVC" },
    { key: "wh_type",        label: "Tank or Tankless",          type: "data", placeholder: "e.g. Tank 50 gal / Tankless" },
  ],
}
const SEC_ELECTRICAL: Section = {
  key: "electrical", label: "Electrical", icon: <Zap className="h-4 w-4" />,
  items: [
    { key: "main_panel",       label: "Main Electrical Panel",    type: "equipment", assetCategory: "electrical" },
    { key: "subpanel",         label: "Subpanel (if present)",    type: "condition" },
    { key: "gfci",             label: "GFCI Outlets",             type: "condition" },
    { key: "wiring_condition", label: "Visible Wiring Condition", type: "condition" },
    { key: "panel_location",   label: "Panel Location",           type: "data", placeholder: "e.g. Garage, side wall" },
    { key: "panel_amperage",   label: "Panel Amperage",           type: "data", placeholder: "e.g. 200A" },
    { key: "disconnect_loc",   label: "Main Disconnect Location", type: "data", placeholder: "e.g. Outside next to meter" },
    { key: "wiring_type",      label: "Wiring Type (Visible)",    type: "data", placeholder: "e.g. Romex, Conduit, Knob-and-tube" },
  ],
}
const SEC_ATTIC: Section = {
  key: "attic", label: "Attic", icon: <TriangleRight className="h-4 w-4" />,
  items: [
    { key: "attic_access",      label: "Attic Access Location",  type: "data",      placeholder: "e.g. Hallway ceiling hatch" },
    { key: "attic_insulation",  label: "Insulation",             type: "condition" },
    { key: "attic_ventilation", label: "Ventilation",            type: "condition" },
    { key: "attic_moisture",    label: "Moisture / Water Signs", type: "condition" },
    { key: "attic_framing",     label: "Structural Framing",     type: "condition" },
    { key: "attic_pests",       label: "Pest Evidence",          type: "condition" },
  ],
}
const SEC_CRAWL: Section = {
  key: "crawl_space", label: "Crawl Space", icon: <Layers className="h-4 w-4" />,
  items: [
    { key: "crawl_access",      label: "Access Location",            type: "data",      placeholder: "e.g. East side of house exterior" },
    { key: "crawl_insulation",  label: "Insulation / Encapsulation", type: "condition" },
    { key: "crawl_ventilation", label: "Ventilation",                type: "condition" },
    { key: "crawl_moisture",    label: "Moisture Signs",             type: "condition" },
    { key: "crawl_framing",     label: "Structural Framing",         type: "condition" },
    { key: "crawl_pests",       label: "Pest Evidence",              type: "condition" },
  ],
}
const SEC_POOL: Section = {
  key: "pool", label: "Pool / Spa", icon: <Waves className="h-4 w-4" />,
  items: [
    { key: "pool_surface",  label: "Pool Surface / Finish",   type: "condition" },
    { key: "pool_deck",     label: "Deck / Coping",           type: "condition" },
    { key: "pool_pump",     label: "Pump & Filter",           type: "equipment", assetCategory: "pool" },
    { key: "pool_heater",   label: "Heater",                  type: "equipment", assetCategory: "pool" },
    { key: "pool_safety",   label: "Safety Barrier / Gate",   type: "condition" },
    { key: "pool_water",    label: "Water Clarity",           type: "condition" },
  ],
}
const SEC_FENCING: Section = {
  key: "fencing", label: "Fencing & Gates", icon: <Home className="h-4 w-4" />,
  items: [
    { key: "fence_condition", label: "Fence Condition", type: "condition" },
    { key: "fence_gates",     label: "Gates & Latches", type: "condition" },
    { key: "fence_material",  label: "Material",        type: "data", placeholder: "e.g. Wood, Block, Wrought iron" },
  ],
}
const SEC_GUEST_HOUSE: Section = {
  key: "guest_house", label: "Guest House / Casita", icon: <Home className="h-4 w-4" />,
  items: [
    { key: "gh_exterior",  label: "Exterior Condition",      type: "condition" },
    { key: "gh_interior",  label: "Interior Condition",      type: "condition" },
    { key: "gh_kitchen",   label: "Kitchenette / Appliances", type: "condition" },
    { key: "gh_bath",      label: "Bathroom",                type: "condition" },
    { key: "gh_hvac",      label: "HVAC / Mechanical",       type: "condition" },
  ],
}

// Build the ordered section list for a given property config. Walkthrough order:
// outside -> common interior -> bedrooms -> bathrooms -> kitchen -> mechanicals
// -> attic/crawl -> outdoor extras.
function buildSections(config: InspectionConfig): Section[] {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const sections: Section[] = [SEC_EXTERIOR, SEC_INTERIOR]

  for (let i = 1; i <= cfg.bedrooms; i++) {
    sections.push({
      key: `bedroom_${i}`,
      label: cfg.bedrooms === 1 ? "Bedroom" : `Bedroom ${i}`,
      icon: <Home className="h-4 w-4" />,
      items: BEDROOM_ITEMS,
    })
  }
  for (let i = 1; i <= cfg.bathrooms; i++) {
    sections.push({
      key: `bathroom_${i}`,
      label: cfg.bathrooms === 1 ? "Bathroom" : `Bathroom ${i}`,
      icon: <Droplets className="h-4 w-4" />,
      items: BATHROOM_ITEMS,
    })
  }

  sections.push(SEC_APPLIANCES, SEC_HVAC, SEC_PLUMBING, SEC_ELECTRICAL, SEC_ATTIC, SEC_CRAWL)

  if (cfg.pool) sections.push(SEC_POOL)
  if (cfg.fencing) sections.push(SEC_FENCING)
  if (cfg.guest_house) sections.push(SEC_GUEST_HOUSE)

  return sections
}

const CONDITION_LABELS: Record<Condition, string> = {
  good: "Good", fair: "Fair", poor: "Poor", na: "N/A"
}
const CONDITION_COLORS: Record<Condition, string> = {
  good: "bg-emerald-100 text-emerald-800 border-emerald-300",
  fair: "bg-amber-100 text-amber-800 border-amber-300",
  poor: "bg-red-100 text-red-800 border-red-300",
  na:   "bg-slate-100 text-slate-600 border-slate-300",
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Finding {
  id?: string
  condition?: Condition
  value?: string
  notes?: string
  flagged: boolean
  aiAssessed: boolean
}

type FindingsMap = Record<string, Finding>  // key: "section.item_key"

interface Inspection {
  id: string
  type: string
  status: string
  inspection_date: string
  config: InspectionConfig
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
      canvas.width = width; canvas.height = height
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => resolve(blob!), "image/jpeg", 0.85)
    }
    img.src = url
  })
}

function findingKey(section: string, itemKey: string) {
  return `${section}.${itemKey}`
}

function sectionProgress(section: Section, findings: FindingsMap) {
  const assessed = section.items.filter(item => {
    const f = findings[findingKey(section.key, item.key)]
    if (item.type === "data") return !!(f?.value)
    return !!(f?.condition)
  }).length
  return { assessed, total: section.items.length }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConditionButtons({ value, onChange }: { value?: Condition; onChange: (c: Condition) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {(["good", "fair", "poor", "na"] as Condition[]).map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors",
            value === c
              ? CONDITION_COLORS[c]
              : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
          )}
        >
          {CONDITION_LABELS[c]}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  propertyId: string
  userId: string
  defaultBedrooms?: number | null
  defaultBathrooms?: number | null
}

export function InspectionTab({ propertyId, userId, defaultBedrooms, defaultBathrooms }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [findings, setFindings] = useState<FindingsMap>({})
  const [scanning, setScanning] = useState<Record<string, boolean>>({})
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["exterior"]))
  const [starting, setStarting] = useState(false)
  const [completing, setCompleting] = useState(false)

  // Setup step (shown before a new inspection is created)
  const [setupFor, setSetupFor] = useState<"initial" | "quarterly" | null>(null)
  const [setupConfig, setSetupConfig] = useState<Required<InspectionConfig>>(DEFAULT_CONFIG)
  const [lastConfig, setLastConfig] = useState<InspectionConfig | null>(null)

  const sections = useMemo(
    () => buildSections(inspection?.config ?? {}),
    [inspection]
  )

  const fileInputRef = useRef<HTMLInputElement>(null)
  const activeScanRef = useRef<{ section: string; item: SectionItem } | null>(null)
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // --- Load ---
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: insp } = await supabase
        .from("property_inspections")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!insp) { setLoading(false); return }

      const { data: rawFindings } = await supabase
        .from("inspection_findings")
        .select("*")
        .eq("inspection_id", insp.id)

      const map: FindingsMap = {}
      for (const f of rawFindings ?? []) {
        map[findingKey(f.section, f.item_key)] = {
          id: f.id,
          condition: f.condition ?? undefined,
          value: f.value ?? undefined,
          notes: f.notes ?? undefined,
          flagged: f.flagged,
          aiAssessed: f.ai_assessed,
        }
      }

      const cfg = (insp.config ?? {}) as InspectionConfig
      setInspection({ ...insp, config: cfg })
      setLastConfig(cfg)
      setFindings(map)
      setLoading(false)
    }
    load()
  }, [propertyId])

  // --- Open the setup step for a new inspection ---
  // Precedence: prior walkthrough config (human-verified on-site) > property
  // record counts > defaults.
  function openSetup(type: "initial" | "quarterly") {
    const fromProperty: InspectionConfig = {}
    if (typeof defaultBedrooms === "number") fromProperty.bedrooms = defaultBedrooms
    if (typeof defaultBathrooms === "number") fromProperty.bathrooms = defaultBathrooms
    setSetupConfig({ ...DEFAULT_CONFIG, ...fromProperty, ...(lastConfig ?? {}) })
    setSetupFor(type)
  }

  // --- Start inspection (after setup is confirmed) ---
  async function startInspection() {
    if (!setupFor) return
    setStarting(true)
    const { data, error } = await supabase
      .from("property_inspections")
      .insert({ property_id: propertyId, inspector_id: userId, type: setupFor, config: setupConfig })
      .select()
      .single()
    setStarting(false)
    if (error || !data) return
    setInspection({ ...data, config: (data.config ?? {}) as InspectionConfig })
    setLastConfig(setupConfig)
    setFindings({})
    setSetupFor(null)
    setOpenSections(new Set(["exterior"]))
  }

  // --- Save finding (debounced for text, immediate for condition) ---
  function scheduleSave(key: string, finding: Finding, immediate = false) {
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key])
    const delay = immediate ? 0 : 600
    saveTimers.current[key] = setTimeout(() => persistFinding(key, finding), delay)
  }

  async function persistFinding(key: string, finding: Finding) {
    if (!inspection) return
    const [section, ...rest] = key.split(".")
    const itemKey = rest.join(".")
    const section_obj = sections.find(s => s.key === section)
    const item = section_obj?.items.find(i => i.key === itemKey)
    if (!item) return

    const row = {
      inspection_id: inspection.id,
      section,
      item_key: itemKey,
      item_label: item.label,
      condition: finding.condition ?? null,
      value: finding.value ?? null,
      notes: finding.notes ?? null,
      flagged: finding.flagged,
      ai_assessed: finding.aiAssessed,
    }

    if (finding.id) {
      await supabase.from("inspection_findings").update(row).eq("id", finding.id)
    } else {
      const { data } = await supabase.from("inspection_findings").upsert(row, {
        onConflict: "inspection_id,section,item_key",
      }).select().single()
      if (data) {
        setFindings(prev => ({
          ...prev,
          [key]: { ...prev[key], id: data.id },
        }))
      }
    }
  }

  function updateFinding(section: string, itemKey: string, patch: Partial<Finding>, immediate = false) {
    const key = findingKey(section, itemKey)
    setFindings(prev => {
      const existing = prev[key]
      const base: Finding = existing
        ? { ...existing }
        : { flagged: false, aiAssessed: false }
      const updated: Finding = { ...base, ...patch }
      scheduleSave(key, updated, immediate)
      return { ...prev, [key]: updated }
    })
  }

  // --- Photo scan (condition/data items) ---
  function triggerScan(section: Section, item: SectionItem) {
    activeScanRef.current = { section: section.key, item }
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !activeScanRef.current) return
    const { section, item } = activeScanRef.current
    const key = findingKey(section, item.key)

    setScanning(prev => ({ ...prev, [key]: true }))

    const compressed = await compressImage(file)
    const formData = new FormData()
    formData.append("image", compressed, "photo.jpg")
    formData.append("item_label", item.label)
    formData.append("section", section)

    // Equipment items: use scan-asset to create inventory record
    if (item.type === "equipment") {
      formData.set("image", compressed, "label.jpg")
      const res = await fetch("/api/admin/scan-asset", { method: "POST", body: formData })
      const result = await res.json()
      setScanning(prev => ({ ...prev, [key]: false }))

      if (!res.ok || result.error) {
        // Fall back to condition scan if label scan fails
        updateFinding(section, item.key, {
          notes: "Label scan failed -- fill in manually",
          flagged: false,
          aiAssessed: false,
        }, true)
        return
      }

      // Create the asset record
      const assetRow = {
        property_id: propertyId,
        name: result.name || item.label,
        brand: result.brand || null,
        model: result.model || null,
        serial_number: result.serial_number || null,
        category: (result.category || item.assetCategory || "other") as any,
        manufacture_date: result.manufacture_date || null,
        install_date: result.install_date || null,
        warranty_expiration: result.warranty_expiration || null,
        expected_lifespan_years: result.expected_lifespan_years || null,
        notes: result.notes || null,
        status: "active" as const,
      }
      const { data: asset } = await supabase.from("assets").insert(assetRow).select().single()

      const assetName = asset?.name || result.name || item.label
      const specSummary = [result.brand, result.model].filter(Boolean).join(" ")
      updateFinding(section, item.key, {
        condition: "good",
        notes: `Asset created: ${assetName}${specSummary ? ` (${specSummary})` : ""}${result.notes ? ` -- ${result.notes}` : ""}`,
        aiAssessed: true,
        flagged: false,
      }, true)
      return
    }

    // Condition / data items: call scan-inspection-photo
    formData.append("item_type", item.type)
    const res = await fetch("/api/admin/scan-inspection-photo", { method: "POST", body: formData })
    const result = await res.json()
    setScanning(prev => ({ ...prev, [key]: false }))

    if (!res.ok || result.error) {
      updateFinding(section, item.key, { notes: "Could not analyze photo -- add notes manually", aiAssessed: false }, true)
      return
    }

    if (item.type === "data") {
      updateFinding(section, item.key, {
        value: result.value || "",
        notes: result.notes || "",
        aiAssessed: true,
        flagged: !!result.flagged,
      }, true)
    } else {
      updateFinding(section, item.key, {
        condition: result.condition as Condition || undefined,
        notes: result.notes || "",
        aiAssessed: true,
        flagged: !!result.flagged,
      }, true)
    }
  }

  // --- Complete inspection ---
  async function completeInspection() {
    if (!inspection) return
    setCompleting(true)
    await supabase
      .from("property_inspections")
      .update({ status: "complete" })
      .eq("id", inspection.id)
    setInspection(prev => prev ? { ...prev, status: "complete" } : null)
    setCompleting(false)
    router.refresh()
  }

  // --- Progress summary ---
  const totalAssessed = sections.reduce((sum, s) => sum + sectionProgress(s, findings).assessed, 0)
  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0)
  const flaggedCount = Object.values(findings).filter(f => f.flagged).length

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  // --- Setup step (configure the walkthrough before it's created) ---
  if (setupFor) {
    const previewCount = buildSections(setupConfig).reduce((n, s) => n + s.items.length, 0)
    return (
      <div className="max-w-md mx-auto py-8 space-y-6">
        <div className="text-center">
          <p className="font-display text-lg font-semibold text-[#1A2320] dark:text-white capitalize">
            Set up {setupFor} inspection
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Tell us about the home so the walkthrough only shows what's actually there.
          </p>
        </div>

        {/* Room counters */}
        <div className="space-y-3">
          {([
            { key: "bedrooms", label: "Bedrooms" },
            { key: "bathrooms", label: "Bathrooms" },
          ] as const).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <span className="text-sm font-medium text-[#1A2320] dark:text-white">{label}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSetupConfig(c => ({ ...c, [key]: Math.max(0, c[key] - 1) }))}
                  className="h-8 w-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  disabled={setupConfig[key] <= 0}
                >
                  -
                </button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">{setupConfig[key]}</span>
                <button
                  type="button"
                  onClick={() => setSetupConfig(c => ({ ...c, [key]: Math.min(12, c[key] + 1) }))}
                  className="h-8 w-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Feature toggles */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">This property also has</p>
          {([
            { key: "pool", label: "Pool / Spa" },
            { key: "fencing", label: "Fencing & Gates" },
            { key: "guest_house", label: "Guest House / Casita" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSetupConfig(c => ({ ...c, [key]: !c[key] }))}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border p-3 text-sm font-medium transition-colors",
                setupConfig[key]
                  ? "border-[#0E7C67] bg-amber-50 text-[#1A2320]"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              )}
            >
              {label}
              <span className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border",
                setupConfig[key] ? "border-[#0E7C67] bg-[#0E7C67] text-white" : "border-slate-300"
              )}>
                {setupConfig[key] && <CheckCircle2 className="h-3.5 w-3.5" />}
              </span>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400">{previewCount} items in this walkthrough</p>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSetupFor(null)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={startInspection}
            disabled={starting}
            className="flex-1 bg-[#0E7C67] text-white hover:bg-[#0A5F4E] gap-2"
          >
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
            Begin Walkthrough
          </Button>
        </div>
      </div>
    )
  }

  // --- No inspection yet ---
  if (!inspection) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
          <ClipboardList className="h-10 w-10 text-slate-400" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold text-[#1A2320] dark:text-white">No inspection on file</p>
          <p className="mt-1 text-sm text-slate-500 max-w-sm">Start the initial walkthrough to document every system, appliance, and condition in the home.</p>
        </div>
        <Button
          onClick={() => openSetup("initial")}
          className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E] gap-2"
        >
          <Plus className="h-4 w-4" />
          Start Initial Inspection
        </Button>
      </div>
    )
  }

  // --- Inspection in progress / complete ---
  return (
    <div className="space-y-4">
      {/* Hidden file input shared across all items */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-[#1A2320] dark:text-white capitalize">
              {inspection.type} Inspection
            </h3>
            <span className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              inspection.status === "complete"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            )}>
              {inspection.status === "complete" ? "Complete" : "In Progress"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date(inspection.inspection_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            {" -- "}
            <span className="font-medium text-[#1A2320] dark:text-white">{totalAssessed}/{totalItems}</span> items assessed
            {flaggedCount > 0 && (
              <span className="ml-2 text-red-600 font-medium">{flaggedCount} flagged</span>
            )}
          </p>
        </div>
        {inspection.status === "in_progress" && (
          <Button
            size="sm"
            onClick={completeInspection}
            disabled={completing}
            className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E] gap-1.5"
          >
            {completing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Mark Complete
          </Button>
        )}
      </div>

      {/* Overall progress bar */}
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full bg-[#0E7C67] transition-all duration-300"
          style={{ width: `${totalItems > 0 ? (totalAssessed / totalItems) * 100 : 0}%` }}
        />
      </div>

      {/* Sections */}
      {sections.map(section => {
        const { assessed, total } = sectionProgress(section, findings)
        const isOpen = openSections.has(section.key)
        const sectionFlags = section.items.filter(i => findings[findingKey(section.key, i.key)]?.flagged).length
        const complete = assessed === total

        return (
          <div key={section.key} className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Section header */}
            <button
              type="button"
              onClick={() => {
                setOpenSections(prev => {
                  const next = new Set(prev)
                  next.has(section.key) ? next.delete(section.key) : next.add(section.key)
                  return next
                })
              }}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-slate-500">{section.icon}</span>
                <span className="font-semibold text-sm text-[#1A2320] dark:text-white">{section.label}</span>
                {sectionFlags > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-red-600 font-medium">
                    <AlertTriangle className="h-3 w-3" />{sectionFlags}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs font-semibold",
                  complete ? "text-emerald-600" : assessed > 0 ? "text-amber-600" : "text-slate-400"
                )}>
                  {assessed}/{total}
                  {complete && <CheckCircle2 className="inline ml-1 h-3 w-3" />}
                </span>
                {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </div>
            </button>

            {/* Section items */}
            {isOpen && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
                {section.items.map(item => {
                  const key = findingKey(section.key, item.key)
                  const finding = findings[key] ?? { flagged: false, aiAssessed: false }
                  const isScanning = scanning[key]
                  const isEquipment = item.type === "equipment"
                  const isData = item.type === "data"
                  const isDone = isData ? !!finding.value : !!finding.condition

                  return (
                    <div key={item.key} className={cn(
                      "p-4 bg-white dark:bg-slate-900",
                      finding.flagged && "bg-red-50/50 dark:bg-red-950/10"
                    )}>
                      {/* Item header row */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {isDone && !finding.flagged && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          )}
                          {finding.flagged && (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          )}
                          <span className="text-sm font-medium text-[#1A2320] dark:text-white">{item.label}</span>
                          {finding.aiAssessed && (
                            <span className="rounded bg-[#0E7C67]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#0E7C67]">AI</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Flag toggle */}
                          <button
                            type="button"
                            onClick={() => updateFinding(section.key, item.key, { ...finding, flagged: !finding.flagged }, true)}
                            className={cn(
                              "rounded p-1 transition-colors",
                              finding.flagged ? "text-red-500" : "text-slate-300 hover:text-slate-500"
                            )}
                            title="Flag for report"
                          >
                            <Flag className="h-3.5 w-3.5" />
                          </button>

                          {/* Scan button */}
                          <button
                            type="button"
                            onClick={() => triggerScan(section, item)}
                            disabled={isScanning}
                            className={cn(
                              "flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                              isEquipment
                                ? "border-[#0E7C67]/40 bg-amber-50 text-[#0E7C67] hover:bg-amber-100"
                                : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                            )}
                          >
                            {isScanning
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Camera className="h-3 w-3" />
                            }
                            {isEquipment ? "Scan Label" : "Photo"}
                          </button>
                        </div>
                      </div>

                      {/* Condition buttons (condition + equipment items) */}
                      {!isData && (
                        <div className="mb-2">
                          <ConditionButtons
                            value={finding.condition}
                            onChange={c => updateFinding(section.key, item.key, { ...finding, condition: c }, true)}
                          />
                        </div>
                      )}

                      {/* Data value field */}
                      {isData && (
                        <input
                          type="text"
                          value={finding.value ?? ""}
                          onChange={e => updateFinding(section.key, item.key, { ...finding, value: e.target.value })}
                          placeholder={item.placeholder}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0E7C67] mb-2"
                        />
                      )}

                      {/* Notes */}
                      <textarea
                        value={finding.notes ?? ""}
                        onChange={e => updateFinding(section.key, item.key, { ...finding, notes: e.target.value })}
                        placeholder={isEquipment && finding.notes?.startsWith("Asset created")
                          ? undefined
                          : "Notes (optional)"}
                        rows={finding.notes && finding.notes.length > 60 ? 2 : 1}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0E7C67] resize-none"
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* New inspection button (for completed inspections) */}
      {inspection.status === "complete" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openSetup("quarterly")}
          className="w-full gap-2"
        >
          <Plus className="h-4 w-4" /> Start Quarterly Inspection
        </Button>
      )}
    </div>
  )
}
