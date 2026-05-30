import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function fetchStreetView(location: string, key: string): Promise<ArrayBuffer | null> {
  const meta = await fetch(
    `https://maps.googleapis.com/maps/api/streetview/metadata?location=${location}&key=${key}`
  )
  const metaJson = await meta.json()
  if (metaJson.status !== "OK") return null

  const img = await fetch(
    `https://maps.googleapis.com/maps/api/streetview?size=1200x480&location=${location}&fov=85&pitch=5&key=${key}`
  )
  if (!img.ok) return null
  return img.arrayBuffer()
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const key = process.env.GOOGLE_MAPS_KEY
  if (!key) return NextResponse.json({ error: "GOOGLE_MAPS_KEY not set" }, { status: 500 })

  const { data: properties } = await admin
    .from("properties")
    .select("id, address, city, state, zip, latitude, longitude")
    .is("cover_photo_url", null)

  if (!properties?.length) {
    return NextResponse.json({ message: "No properties need updating", updated: 0 })
  }

  const results = { updated: 0, skipped: 0, failed: 0 }

  for (const property of properties) {
    try {
      const location = property.latitude && property.longitude
        ? `${property.latitude},${property.longitude}`
        : encodeURIComponent(`${property.address}, ${property.city}, ${property.state} ${property.zip}`)

      const buffer = await fetchStreetView(location, key)
      if (!buffer) { results.skipped++; continue }

      const filePath = `covers/${property.id}/street-view.jpg`
      const { error: uploadErr } = await admin.storage
        .from("property-media")
        .upload(filePath, buffer, { contentType: "image/jpeg", upsert: true })

      if (uploadErr) { results.failed++; continue }

      const { data: { publicUrl } } = admin.storage.from("property-media").getPublicUrl(filePath)
      await admin.from("properties").update({ cover_photo_url: publicUrl }).eq("id", property.id)
      results.updated++
    } catch {
      results.failed++
    }
  }

  return NextResponse.json({ ...results, total: properties.length })
}
