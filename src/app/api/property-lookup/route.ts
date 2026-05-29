import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
    return NextResponse.json({ error: "street, city, state, and zip are all required" }, { status: 400 })
  }

  const token = process.env.ESTATED_API_KEY
  if (!token) {
    return NextResponse.json({ error: "Property lookup is not configured (missing ESTATED_API_KEY)" }, { status: 503 })
  }

  const url = new URL("https://apis.estated.com/v4/property")
  url.searchParams.set("token", token)
  url.searchParams.set("street", street)
  url.searchParams.set("city", city)
  url.searchParams.set("state", state)
  url.searchParams.set("zip", zip)

  let json: any
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 0 } })
    json = await res.json()
  } catch {
    return NextResponse.json({ error: "Could not reach Estated API" }, { status: 502 })
  }

  const data = json?.data
  if (!data || json?.status?.code === "0x02") {
    return NextResponse.json({ error: "Property not found" }, { status: 404 })
  }

  const structure = data.structure ?? {}
  const lot       = data.lot ?? {}
  const valuation = data.valuation ?? {}

  // Map Estated structure type to our enum
  const rawType = (structure.type ?? "").toLowerCase()
  let property_type: "single_family" | "townhome" | "condo" = "single_family"
  if (rawType.includes("condo")) property_type = "condo"
  else if (rawType.includes("town")) property_type = "townhome"

  // Format lot size
  let lot_size: string | null = null
  if (lot.area_acres) lot_size = `${lot.area_acres} acres`
  else if (lot.area_sq_ft) lot_size = `${lot.area_sq_ft.toLocaleString()} sq ft`

  return NextResponse.json({
    year_built:       structure.year_built        ?? null,
    square_footage:   structure.living_square_feet ?? null,
    lot_size,
    property_type,
    beds:             structure.beds_count         ?? null,
    baths:            structure.baths              ?? null,
    stories:          structure.stories            ?? null,
    garage:           structure.garage_type        ?? null,
    roof:             structure.roof_material_type ?? null,
    construction:     structure.construction_type  ?? null,
    estimated_value:  valuation.value              ?? null,
  })
}
