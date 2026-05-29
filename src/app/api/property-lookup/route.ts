import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 15

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

  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (!rapidApiKey) {
    return NextResponse.json({ error: "RAPIDAPI_KEY not configured" }, { status: 503 })
  }

  const address = `${street}, ${city}, ${state} ${zip}`

  const res = await fetch(
    `https://zillow56.p.rapidapi.com/search?location=${encodeURIComponent(address)}&output=json`,
    {
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "zillow56.p.rapidapi.com",
      },
      next: { revalidate: 0 },
    }
  )

  if (!res.ok) {
    return NextResponse.json({ error: `Zillow lookup failed (${res.status})` }, { status: 502 })
  }

  const json = await res.json()

  // Zillow56 returns results array -- take the first match
  const results: any[] = json.results ?? json.props ?? []
  if (!results.length) {
    return NextResponse.json({ error: "No property found for that address" }, { status: 404 })
  }

  const p = results[0]

  // Map homeType to our enum
  const typeMap: Record<string, "single_family" | "townhome" | "condo"> = {
    SINGLE_FAMILY: "single_family",
    TOWNHOUSE:     "townhome",
    CONDO:         "condo",
    APARTMENT:     "condo",
  }
  const property_type = typeMap[p.homeType] ?? "single_family"

  // Lot size: Zillow returns lotAreaValue + lotAreaUnit
  let lot_size: string | null = null
  if (p.lotAreaValue && p.lotAreaUnit) {
    const unit = String(p.lotAreaUnit).toLowerCase()
    if (unit.includes("acre")) lot_size = `${p.lotAreaValue} acres`
    else lot_size = `${Number(p.lotAreaValue).toLocaleString()} sq ft`
  } else if (p.lotSize) {
    lot_size = `${Number(p.lotSize).toLocaleString()} sq ft`
  }

  return NextResponse.json({
    year_built:      p.yearBuilt      ?? null,
    square_footage:  p.livingArea     ?? null,
    lot_size,
    property_type,
    beds:            p.beds           ?? null,
    baths:           p.baths          ?? null,
    zestimate:       p.zestimate      ?? p.price ?? null,
    address_matched: p.address?.streetAddress ?? null,
  })
}
