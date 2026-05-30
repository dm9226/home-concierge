import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function fetchStreetViewAndStore(
  propertyId: string,
  address: string,
  city: string,
  state: string,
  zip: string,
  lat?: number | null,
  lon?: number | null,
  admin: ReturnType<typeof createAdminClient> = createAdminClient(),
): Promise<string | null> {
  const key = process.env.GOOGLE_MAPS_KEY
  if (!key) return null

  const location = lat && lon
    ? `${lat},${lon}`
    : encodeURIComponent(`${address}, ${city}, ${state} ${zip}`)

  try {
    // Check metadata first -- avoids storing a gray "no imagery" image
    const metaRes = await fetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata?location=${location}&key=${key}`
    )
    const meta = await metaRes.json()
    if (meta.status !== "OK") return null

    const imgRes = await fetch(
      `https://maps.googleapis.com/maps/api/streetview?size=1200x480&location=${location}&fov=85&pitch=5&key=${key}`
    )
    if (!imgRes.ok) return null

    const buffer = await imgRes.arrayBuffer()
    const filePath = `covers/${propertyId}/street-view.jpg`

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

  // Auto-fetch Google Street View and store as cover photo (non-fatal)
  const coverUrl = await fetchStreetViewAndStore(
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
