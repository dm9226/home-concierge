import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { title, description, category, frequency, custom_interval_days, season, next_due, estimated_cost, notes } = body

  if (!title || !category || !frequency) {
    return NextResponse.json({ error: "Title, category, and frequency are required" }, { status: 400 })
  }

  const { data, error } = await admin
    .from("maintenance_schedules")
    .insert({
      property_id: propertyId,
      title,
      description: description || null,
      category,
      frequency,
      custom_interval_days: frequency === "custom" && custom_interval_days ? parseInt(custom_interval_days) : null,
      season: season || null,
      next_due: next_due || null,
      estimated_cost: estimated_cost !== "" && estimated_cost != null ? parseFloat(estimated_cost) : null,
      notes: notes || null,
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
