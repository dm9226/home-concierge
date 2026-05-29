import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 20

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY
const RAPIDAPI_HOST = "zllw-working-api.p.rapidapi.com"

async function zllwGet(path: string, params: Record<string, string>) {
  const url = new URL(`https://${RAPIDAPI_HOST}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key":  RAPIDAPI_KEY!,
      "X-RapidAPI-Host": RAPIDAPI_HOST,
    },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`${path} returned ${res.status}`)
  return res.json()
}

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

  if (!RAPIDAPI_KEY) {
    return NextResponse.json({ error: "RAPIDAPI_KEY not configured" }, { status: 503 })
  }

  const address = `${street}, ${city}, ${state} ${zip}`

  // --- 1. Find the property ---
  let searchJson: any
  try {
    searchJson = await zllwGet("/search/byaddress", { location: address })
  } catch (e: any) {
    return NextResponse.json({ error: `Search failed: ${e.message}` }, { status: 502 })
  }

  // Results may be nested under different keys depending on API version
  const results: any[] =
    searchJson?.props ??
    searchJson?.results ??
    searchJson?.data?.results ??
    searchJson?.data ??
    []

  if (!results.length) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 })
  }

  const p = results[0]
  const zpid: string | null = p?.zpid ? String(p.zpid) : null

  // Map homeType to our enum
  const typeMap: Record<string, "single_family" | "townhome" | "condo"> = {
    SINGLE_FAMILY: "single_family",
    TOWNHOUSE:     "townhome",
    CONDO:         "condo",
    APARTMENT:     "condo",
    MULTI_FAMILY:  "single_family",
  }
  const property_type = typeMap[p?.homeType ?? ""] ?? "single_family"

  // Lot size
  let lot_size: string | null = null
  if (p?.lotAreaValue && p?.lotAreaUnit) {
    const unit = String(p.lotAreaUnit).toLowerCase()
    lot_size = unit.includes("acre")
      ? `${p.lotAreaValue} acres`
      : `${Number(p.lotAreaValue).toLocaleString()} sq ft`
  } else if (p?.lotSize) {
    lot_size = `${Number(p.lotSize).toLocaleString()} sq ft`
  }

  // --- 2. Fetch price/sale history (best-effort) ---
  let lastSalePrice: number | null = null
  let lastSaleDate:  string | null = null

  if (zpid) {
    try {
      const histJson = await zllwGet("/pricehistory", { zpid })
      const events: any[] =
        histJson?.priceHistory ??
        histJson?.data?.priceHistory ??
        histJson?.results ??
        []

      // Find the most recent "Sold" event
      const soldEvents = events.filter(
        (e: any) => (e.event ?? e.priceChangeReason ?? "").toLowerCase().includes("sold")
      )
      if (soldEvents.length) {
        const latest = soldEvents[0]
        lastSalePrice = latest.price ?? latest.amount ?? null
        lastSaleDate  = latest.date ?? latest.priceChangeDate ?? null
      }
    } catch {
      // pricehistory is best-effort, don't fail the whole request
    }
  }

  return NextResponse.json({
    year_built:      p?.yearBuilt     ?? null,
    square_footage:  p?.livingArea    ?? null,
    lot_size,
    property_type,
    beds:            p?.beds          ?? p?.bedrooms          ?? null,
    baths:           p?.baths         ?? p?.bathrooms         ?? null,
    zestimate:       p?.zestimate     ?? p?.price             ?? null,
    last_sale_price: lastSalePrice,
    last_sale_date:  lastSaleDate,
    address_matched: p?.address       ?? p?.streetAddress     ?? null,
  })
}
