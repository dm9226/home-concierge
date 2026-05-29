"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
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

    if (error) {
      setError(error.message)
      return
    }

    router.push(`/dashboard/properties/${data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-[#0F1B2D] dark:text-white">Address</h2>
          <div className="space-y-1.5">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              placeholder="123 Peachtree Rd NE"
              value={form.address}
              onChange={e => set("address", e.target.value)}
              required
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
  )
}
