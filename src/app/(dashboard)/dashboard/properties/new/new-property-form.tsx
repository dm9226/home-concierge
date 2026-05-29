"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY

export function NewPropertyForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    address: "",
    city: "",
    state: "GA",
    zip: "",
    property_type: "single_family" as "single_family" | "townhome" | "condo",
    year_built: "",
    square_footage: "",
    lot_size: "",
    monthly_retainer_amount: "1500",
    notes: "",
  })

  const [placesReady, setPlacesReady] = useState(false)
  const [looking, setLooking] = useState(false)
  const [lookupStatus, setLookupStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const addressRef = useRef<HTMLInputElement>(null)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setLookupStatus(null)
  }

  // Initialize Google Places Autocomplete once the script loads
  useEffect(() => {
    if (!placesReady || !addressRef.current || !(window as any).google) return
    const ac = new (window as any).google.maps.places.Autocomplete(addressRef.current, {
      types: ["address"],
      componentRestrictions: { country: "us" },
      fields: ["address_components"],
    })
    ac.addListener("place_changed", () => {
      const place = ac.getPlace()
      if (!place?.address_components) return

      let streetNumber = "", route = "", city = "", state = "", zip = ""
      for (const comp of place.address_components as any[]) {
        const t = comp.types[0]
        if (t === "street_number")              streetNumber = comp.long_name
        if (t === "route")                      route        = comp.long_name
        if (t === "locality")                   city         = comp.long_name
        if (t === "administrative_area_level_1") state       = comp.short_name
        if (t === "postal_code")                zip          = comp.long_name
      }
      setForm(f => ({
        ...f,
        address: `${streetNumber} ${route}`.trim(),
        city,
        state,
        zip,
      }))
      setLookupStatus(null)
    })
  }, [placesReady])

  async function lookupProperty() {
    if (!form.address || !form.city || !form.state || !form.zip) {
      setLookupStatus({ type: "error", msg: "Fill in the full address first" })
      return
    }
    setLooking(true)
    setLookupStatus(null)

    const params = new URLSearchParams({
      street: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
    })
    const res = await fetch(`/api/property-lookup?${params}`)
    const data = await res.json()
    setLooking(false)

    if (!res.ok) {
      setLookupStatus({ type: "error", msg: data.error ?? "Lookup failed" })
      return
    }

    const extras: string[] = []
    if (data.beds)         extras.push(`${data.beds} bed`)
    if (data.baths)        extras.push(`${data.baths} bath`)
    if (data.stories)      extras.push(`${data.stories} ${data.stories === 1 ? "story" : "stories"}`)
    if (data.garage)       extras.push(`${data.garage} garage`)
    if (data.roof)         extras.push(`${data.roof} roof`)
    if (data.construction) extras.push(`${data.construction} construction`)

    setForm(f => ({
      ...f,
      year_built:     data.year_built      ? String(data.year_built)     : f.year_built,
      square_footage: data.square_footage  ? String(data.square_footage) : f.square_footage,
      lot_size:       data.lot_size        ?? f.lot_size,
      property_type:  data.property_type   ?? f.property_type,
      notes: extras.length ? extras.join(", ") + (f.notes ? "\n" + f.notes : "") : f.notes,
    }))

    const summary: string[] = []
    if (data.year_built)     summary.push(`built ${data.year_built}`)
    if (data.square_footage) summary.push(`${data.square_footage.toLocaleString()} sq ft`)
    if (data.estimated_value) summary.push(`~$${(data.estimated_value / 1000).toFixed(0)}k estimated value`)
    setLookupStatus({ type: "success", msg: summary.length ? summary.join(" · ") : "Property found -- review fields below" })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error } = await supabase
      .from("properties")
      .insert({
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        property_type: form.property_type,
        year_built: form.year_built ? parseInt(form.year_built) : null,
        square_footage: form.square_footage ? parseInt(form.square_footage) : null,
        lot_size: form.lot_size || null,
        monthly_retainer_amount: parseFloat(form.monthly_retainer_amount),
        notes: form.notes || null,
        status: "active",
        onboarding_status: "not_started",
      })
      .select("id")
      .single()

    setLoading(false)
    if (error) { setError(error.message); return }
    router.push(`/dashboard/properties/${data.id}`)
  }

  const canLookup = !!(form.address && form.city && form.state && form.zip)

  return (
    <>
      {GOOGLE_KEY && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places`}
          strategy="afterInteractive"
          onLoad={() => setPlacesReady(true)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[#0F1B2D] dark:text-white">Address</h2>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canLookup || looking}
                onClick={lookupProperty}
                className="gap-1.5 text-xs h-8"
              >
                {looking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-[#C9A96E]" />
                )}
                {looking ? "Looking up..." : "Look up property"}
              </Button>
            </div>

            {lookupStatus && (
              <div className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
                lookupStatus.type === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}>
                {lookupStatus.type === "success"
                  ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                {lookupStatus.msg}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                ref={addressRef}
                placeholder="123 Peachtree Rd NE"
                value={form.address}
                onChange={e => set("address", e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Atlanta"
                  value={form.city}
                  onChange={e => set("city", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  placeholder="30305"
                  value={form.zip}
                  onChange={e => set("zip", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={e => set("state", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Property Type</Label>
                <Select value={form.property_type} onValueChange={v => set("property_type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_family">Single Family</SelectItem>
                    <SelectItem value="townhome">Townhome</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="font-semibold text-[#0F1B2D] dark:text-white">Details</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="year_built">Year Built</Label>
                <Input
                  id="year_built"
                  type="number"
                  placeholder="2005"
                  value={form.year_built}
                  onChange={e => set("year_built", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="square_footage">Sq Ft</Label>
                <Input
                  id="square_footage"
                  type="number"
                  placeholder="3200"
                  value={form.square_footage}
                  onChange={e => set("square_footage", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lot_size">Lot Size</Label>
                <Input
                  id="lot_size"
                  placeholder="0.25 acres"
                  value={form.lot_size}
                  onChange={e => set("lot_size", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="retainer">Monthly Retainer ($)</Label>
              <Input
                id="retainer"
                type="number"
                value={form.monthly_retainer_amount}
                onChange={e => set("monthly_retainer_amount", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any initial notes about this property..."
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f] font-semibold"
          >
            {loading ? "Creating..." : "Create Property"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  )
}
