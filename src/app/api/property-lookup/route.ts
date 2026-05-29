import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const maxDuration = 20

const RENTCAST_KEY  = process.env.RENTCAST_API_KEY
const FREE_LIMIT    = 50
const WARN_AT       = 45

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
  // Use rpc to atomically increment; falls back to insert+select if row doesn't exist
  await admin.rpc("increment_api_usage", { p_service: "rentcast", p_period: period })
  const { data } = await admin
    .from("api_usage")
    .select("count")
    .eq("service", "rentcast")
    .eq("period", period)
    .single()
  return data?.count ?? 1
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { searchParams } = request.nextUrl

  // Usage-only check (called by the form before showing the lookup button)
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

  // Pre-flight usage check -- if at/over limit, require confirmed=1
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

  const raw = await res.json()
  const p = Array.isArray(raw) ? raw[0] : raw
  if (!p) return NextResponse.json({ error: "Property not found" }, { status: 404 })

  // Track usage after confirmed successful response
  const newCount = await incrementUsage(admin)

  // Check Rentcast rate limit headers if available
  const headerRemaining = res.headers.get("X-Plan-Remaining") ?? res.headers.get("X-RateLimit-Remaining")

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

  // Build human-readable extras from features
  const features: string[] = []
  if (p.bedrooms)          features.push(`${p.bedrooms} bed`)
  if (p.bathrooms)         features.push(`${p.bathrooms} bath`)
  if (f.floorCount)        features.push(`${f.floorCount} ${f.floorCount === 1 ? "story" : "stories"}`)
  if (f.garage && f.garageSpaces) features.push(`${f.garageSpaces}-car ${(f.garageType ?? "garage").toLowerCase()}`)
  else if (f.garage)       features.push("garage")
  if (f.pool)              features.push("pool")
  if (f.exteriorType)      features.push(`${f.exteriorType.toLowerCase()} exterior`)
  if (f.roofType)          features.push(`${f.roofType.toLowerCase()} roof`)
  if (f.heatingType)       features.push(`${f.heatingType.toLowerCase()} heat`)
  if (f.coolingType)       features.push(`${f.coolingType.toLowerCase()} A/C`)
  if (f.fireplace)         features.push("fireplace")
  if (f.foundationType)    features.push(`${f.foundationType.toLowerCase()} foundation`)

  return NextResponse.json({
    year_built:        p.yearBuilt       ?? null,
    square_footage:    p.squareFootage   ?? null,
    lot_size,
    property_type,
    beds:              p.bedrooms        ?? null,
    baths:             p.bathrooms       ?? null,
    last_sale_price:   p.lastSalePrice   ?? null,
    last_sale_date:    p.lastSaleDate    ?? null,
    address_matched:   p.formattedAddress ?? null,
    features,
    // Raw feature fields for display
    stories:           f.floorCount      ?? null,
    garage:            f.garage ? (f.garageSpaces ? `${f.garageSpaces}-car ${f.garageType ?? ""}`.trim() : "yes") : null,
    pool:              f.pool            ?? null,
    exterior:          f.exteriorType    ?? null,
    roof:              f.roofType        ?? null,
    heating:           f.heatingType     ?? null,
    cooling:           f.coolingType     ?? null,
    fireplace:         f.fireplace       ?? null,
    foundation:        f.foundationType  ?? null,
    // Usage info
    usage_count:       newCount,
    usage_limit:       FREE_LIMIT,
    usage_remaining:   headerRemaining ? parseInt(headerRemaining) : Math.max(0, FREE_LIMIT - newCount),
  })
}
