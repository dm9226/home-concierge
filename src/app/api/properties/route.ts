import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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
  return NextResponse.json({ id: data.id })
}
