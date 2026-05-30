import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function fetchMapboxSatelliteAndStore(
  propertyId: string,
  address: string,
  city: string,
  state: string,
  zip: string,
  lat?: number | null,
  lon?: number | null,
  admin: ReturnType<typeof createAdminClient> = createAdminClient(),
): Promise<string | null> {
  const token = process.env.MAPBOX_TOKEN
  if (!token) return null

  try {
    let lng = lon
    let latitude = lat

    // Geocode if coordinates not provided
    if (!latitude || !lng) {
      const query = encodeURIComponent(`${address}, ${city}, ${state} ${zip}`)
      const geoRes = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?types=address&limit=1&access_token=${token}`
      )
      if (!geoRes.ok) return null
      const geo = await geoRes.json()
      const coords = geo.features?.[0]?.center
      if (!coords) return null
      ;[lng, latitude] = coords
    }

    // Fetch satellite image (zoom 18 = ~house-level detail)
    const imgRes = await fetch(
      `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${lng},${latitude},18,0/1200x480?access_token=${token}`
    )
    if (!imgRes.ok) return null

    const buffer = await imgRes.arrayBuffer()
    const filePath = `covers/${propertyId}/aerial.jpg`

    const { error: uploadErr } = await admin.storage
      .from("property-media")
      .upload(filePath, buffer, { contentType: "image/jpeg", upsert: true })

    if (uploadErr) return null

    const { data: { publicUrl } } = admin.storage.from("property-media").getPublicUrl(filePath)
    return publicUrl
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()

  const { data, error } = await admin
    .from("properties")
    .insert({
      address:          body.address,
      city:             body.city,
      state:            body.state,
      zip:              body.zip,
      property_type:    body.property_type,
      year_built:       body.year_built     ?? null,
      square_footage:   body.square_footage ?? null,
      lot_size:         body.lot_size       ?? null,
      fee_amount:       body.fee_amount,
      billing_period:   body.billing_period,
      notes:            body.notes          ?? null,
      latitude:         body.latitude       ?? null,
      longitude:        body.longitude      ?? null,
      market_data:      body.market_data    ?? null,
      status:           "active",
      onboarding_status: "not_started",
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Seed standard maintenance schedule (non-fatal)
  try { await admin.rpc("create_standard_maintenance_schedule", { p_property_id: data.id }) } catch (_) {}

  // Auto-fetch Mapbox satellite image and store as cover photo (non-fatal)
  const coverUrl = await fetchMapboxSatelliteAndStore(
    data.id,
    body.address,
    body.city,
    body.state,
    body.zip,
    body.latitude,
    body.longitude,
    admin,
  )
  if (coverUrl) {
    await admin.from("properties").update({ cover_photo_url: coverUrl }).eq("id", data.id)
  }

  return NextResponse.json({ id: data.id })
}
