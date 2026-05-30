import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const maxDuration = 25

const RENTCAST_KEY = process.env.RENTCAST_API_KEY
const FREE_LIMIT   = 50
const WARN_AT      = 45

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

async function getUsageCount(admin: ReturnType<typeof createAdminClient>): Promise<number> {
  const { data } = await admin
    .from("api_usage")
    .select("count")
    .eq("service", "rentcast")
    .eq("period", currentPeriod())
    .single()
  return data?.count ?? 0
}

async function incrementUsage(admin: ReturnType<typeof createAdminClient>): Promise<number> {
  const period = currentPeriod()
  await admin.rpc("increment_api_usage", { p_service: "rentcast", p_period: period })
  const { data } = await admin
    .from("api_usage")
    .select("count")
    .eq("service", "rentcast")
    .eq("period", period)
    .single()
  return data?.count ?? 1
}

function rentcastHeaders() {
  return { "X-Api-Key": RENTCAST_KEY!, "Content-Type": "application/json" }
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: rentcastHeaders(), next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { searchParams } = request.nextUrl

  if (searchParams.get("usage_only") === "1") {
    const count = await getUsageCount(admin)
    return NextResponse.json({ count, limit: FREE_LIMIT, warn_at: WARN_AT })
  }

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

  const currentCount = await getUsageCount(admin)
  if (currentCount >= WARN_AT && searchParams.get("confirmed") !== "1") {
    return NextResponse.json({
      usage_warning: true,
      count: currentCount,
      limit: FREE_LIMIT,
      over_free_tier: currentCount >= FREE_LIMIT,
    }, { status: 402 })
  }

  const address = `${street}, ${city}, ${state} ${zip}`
  const encodedAddress = encodeURIComponent(address)

  // Fire all calls in parallel -- AVM and market calls are best-effort
  const [propResult, avmValueResult, avmRentResult, marketResult] = await Promise.allSettled([
    fetchJson(`https://api.rentcast.io/v1/properties?address=${encodedAddress}&limit=1`),
    fetchJson(`https://api.rentcast.io/v1/avm/value?address=${encodedAddress}`),
    fetchJson(`https://api.rentcast.io/v1/avm/rent?address=${encodedAddress}`),
    fetchJson(`https://api.rentcast.io/v1/markets?zipCode=${encodeURIComponent(zip)}&dataType=Sale&historyRange=3`),
  ])

  if (propResult.status === "rejected") {
    return NextResponse.json({ error: `Lookup failed: ${propResult.reason}` }, { status: 502 })
  }

  const raw = propResult.value
  const p = Array.isArray(raw) ? raw[0] : raw
  if (!p) return NextResponse.json({ error: "Property not found" }, { status: 404 })

  const newCount = await incrementUsage(admin)

  const avm    = avmValueResult.status === "fulfilled" ? avmValueResult.value : null
  const rent   = avmRentResult.status  === "fulfilled" ? avmRentResult.value  : null
  const market = marketResult.status   === "fulfilled" ? marketResult.value   : null

  const typeMap: Record<string, "single_family" | "townhome" | "condo"> = {
    "Single Family":  "single_family",
    "Townhouse":      "townhome",
    "Condo/Townhome": "condo",
    "Condo":          "condo",
    "Apartment":      "condo",
    "Multi Family":   "single_family",
  }
  const property_type = typeMap[p.propertyType ?? ""] ?? "single_family"

  let lot_size: string | null = null
  if (p.lotSize) {
    const acres = p.lotSize / 43560
    lot_size = acres >= 0.1
      ? `${acres.toFixed(2)} acres`
      : `${Number(p.lotSize).toLocaleString()} sq ft`
  }

  const f = p.features ?? {}

  // Build notes lines from features + financial info
  const noteLines: string[] = []

  // Physical features
  const physical: string[] = []
  if (p.bedrooms)          physical.push(`${p.bedrooms} bed`)
  if (p.bathrooms)         physical.push(`${p.bathrooms} bath`)
  if (f.floorCount)        physical.push(`${f.floorCount} ${f.floorCount === 1 ? "story" : "stories"}`)
  if (f.architectureType)  physical.push(f.architectureType)
  if (f.garage && f.garageSpaces) physical.push(`${f.garageSpaces}-car ${(f.garageType ?? "garage").toLowerCase()}`)
  else if (f.garage)       physical.push("garage")
  if (f.pool)              physical.push("pool")
  if (physical.length)     noteLines.push(physical.join(", "))

  // Construction
  const construction: string[] = []
  if (f.exteriorType)      construction.push(`${f.exteriorType} exterior`)
  if (f.roofType)          construction.push(`${f.roofType} roof`)
  if (f.foundationType)    construction.push(`${f.foundationType} foundation`)
  if (construction.length) noteLines.push(construction.join(", "))

  // Systems
  const systems: string[] = []
  if (f.heatingType)       systems.push(`${f.heatingType} heat`)
  if (f.coolingType)       systems.push(`${f.coolingType} A/C`)
  if (f.fireplace)         systems.push("fireplace")
  if (systems.length)      noteLines.push(systems.join(", "))

  // Owner on record
  const ownerNames: string[] = p.owner?.names ?? []
  if (ownerNames.length)   noteLines.push(`Owner on record: ${ownerNames.join(", ")}`)

  // HOA
  if (p.hoa?.fee)          noteLines.push(`HOA: $${Number(p.hoa.fee).toLocaleString()}/mo`)

  // Property taxes (most recent year)
  const taxYears = Object.keys(p.propertyTaxes ?? {}).sort().reverse()
  if (taxYears.length) {
    const latestTax = p.propertyTaxes[taxYears[0]]
    if (latestTax?.total) noteLines.push(`Property tax (${taxYears[0]}): $${Number(latestTax.total).toLocaleString()}/yr`)
  }

  // Price history (up to 4 events)
  const historyEntries = Object.entries(p.history ?? {})
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 4)
  if (historyEntries.length > 1) {
    const histLines = historyEntries.map(([date, evt]: [string, any]) => {
      const year = new Date(date).getFullYear()
      const price = evt.price ? `$${Number(evt.price).toLocaleString()}` : ""
      const event = evt.event ?? ""
      return `${year}: ${event}${price ? " " + price : ""}`.trim()
    })
    noteLines.push(`History: ${histLines.join(" | ")}`)
  }

  return NextResponse.json({
    // Core fields
    year_built:       p.yearBuilt      ?? null,
    square_footage:   p.squareFootage  ?? null,
    lot_size,
    property_type,
    latitude:         p.latitude       ?? null,
    longitude:        p.longitude      ?? null,
    address_matched:  p.formattedAddress ?? null,
    county:           p.county         ?? null,

    // Sale data
    beds:             p.bedrooms       ?? null,
    baths:            p.bathrooms      ?? null,
    last_sale_price:  p.lastSalePrice  ?? null,
    last_sale_date:   p.lastSaleDate   ?? null,

    // AVM (best-effort)
    estimated_value:  avm?.price       ?? avm?.value ?? null,
    estimated_rent:   rent?.rent       ?? rent?.price ?? null,

    // Financial
    annual_tax:       taxYears.length ? (p.propertyTaxes[taxYears[0]]?.total ?? null) : null,
    hoa_fee:          p.hoa?.fee       ?? null,

    // Pre-formatted notes lines
    notes_lines:      noteLines,

    // Market stats for the zip code (raw -- stored as JSONB)
    market_data: market ?? null,

    // Usage
    usage_count:      newCount,
    usage_limit:      FREE_LIMIT,
    usage_remaining:  Math.max(0, FREE_LIMIT - newCount),
  })
}
