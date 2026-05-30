import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const FREQUENCY_DAYS: Record<string, number> = {
  monthly: 30,
  quarterly: 91,
  semi_annual: 182,
  annual: 365,
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single()
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Fetch the item (needed to check ownership and calculate next_due)
  const { data: item } = await admin
    .from("maintenance_schedules")
    .select("*, property:properties(client_id)")
    .eq("id", id)
    .single()

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Clients can only update their own property's items
  if (profile.role === "client") {
    const clientId = (item as any).property?.client_id
    if (clientId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const body = await request.json()
  const updates: Record<string, any> = {}

  if (body.completed_date) {
    updates.last_completed = body.completed_date

    // Calculate next_due based on frequency
    const d = new Date(body.completed_date)
    const days = FREQUENCY_DAYS[item.frequency] ?? item.custom_interval_days ?? 30
    d.setDate(d.getDate() + days)
    updates.next_due = d.toISOString().split("T")[0]
  }

  // Only staff can update cost
  if (body.estimated_cost !== undefined && profile.role !== "client") {
    updates.estimated_cost = body.estimated_cost === "" ? null : Number(body.estimated_cost)
  }

  const { data: updated, error } = await admin
    .from("maintenance_schedules")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(updated)
}
