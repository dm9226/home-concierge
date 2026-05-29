import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 20

const RENTCAST_KEY = process.env.RENTCAST_API_KEY

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = request.nextUrl
  const street = searchParams.get("street")?.trim()
  const city   = searchParams.get("city")?.trim()
  const state  = searchParams.get("state")?.trim()
  const zip    = searchParams.get("zip")?.trim()

  if (!street || !city || !state || !zip) {
    return NextResponse.json({ error: "street, city, state, and zip are required" }, { status: 400 })
  }

  if (!RENTCAST_KEY) {
    return NextResponse.json({ error: "RENTCAST_API_KEY not configured" }, { status: 503 })
  }

  const address = `${street}, ${city}, ${state} ${zip}`
  const url = new URL("https://api.rentcast.io/v1/properties")
  url.searchParams.set("address", address)
  url.searchParams.set("limit", "1")

  const res = await fetch(url.toString(), {
    headers: { "X-Api-Key": RENTCAST_KEY },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    const body = await res.text()
    return NextResponse.json({ error: `Rentcast ${res.status}: ${body}` }, { status: 502 })
  }

  const data = await res.json()
  const p = Array.isArray(data) ? data[0] : data
  if (!p) return NextResponse.json({ error: "Property not found" }, { status: 404 })

  const typeMap: Record<string, "single_family" | "townhome" | "condo"> = {
    "Single Family":   "single_family",
    "Townhouse":       "townhome",
    "Condo/Townhome":  "condo",
    "Condo":           "condo",
    "Apartment":       "condo",
    "Multi Family":    "single_family",
  }
  const property_type = typeMap[p.propertyType ?? ""] ?? "single_family"

  let lot_size: string | null = null
  if (p.lotSize) {
    const acres = p.lotSize / 43560
    lot_size = acres >= 0.1
      ? `${acres.toFixed(2)} acres`
      : `${Number(p.lotSize).toLocaleString()} sq ft`
  }

  return NextResponse.json({
    year_built:      p.yearBuilt      ?? null,
    square_footage:  p.squareFootage  ?? null,
    lot_size,
    property_type,
    beds:            p.bedrooms       ?? null,
    baths:           p.bathrooms      ?? null,
    last_sale_price: p.lastSalePrice  ?? null,
    last_sale_date:  p.lastSaleDate   ?? null,
    zestimate:       null,
    address_matched: p.formattedAddress ?? null,
  })
}
