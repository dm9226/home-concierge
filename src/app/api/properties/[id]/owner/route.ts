import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function getStaffUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") return null
  return { user, admin }
}

// POST: add an owner
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await getStaffUser()
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { user_id } = await request.json()
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 })

  // Insert into junction table
  const { error } = await ctx.admin
    .from("property_owners")
    .insert({ property_id: id, user_id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also set client_id if property has no primary contact yet
  await ctx.admin
    .from("properties")
    .update({ client_id: user_id })
    .eq("id", id)
    .is("client_id", null)

  return NextResponse.json({ ok: true })
}
