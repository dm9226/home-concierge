import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// DELETE: remove an owner
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { error } = await admin
    .from("property_owners")
    .delete()
    .eq("property_id", id)
    .eq("user_id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If removed user was the primary contact, promote next owner or clear
  const { data: property } = await admin
    .from("properties")
    .select("client_id")
    .eq("id", id)
    .single()

  if (property?.client_id === userId) {
    const { data: remaining } = await admin
      .from("property_owners")
      .select("user_id")
      .eq("property_id", id)
      .order("created_at", { ascending: true })
      .limit(1)

    await admin
      .from("properties")
      .update({ client_id: remaining?.[0]?.user_id ?? null })
      .eq("id", id)
  }

  return NextResponse.json({ ok: true })
}
