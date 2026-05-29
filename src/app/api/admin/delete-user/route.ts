import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const params = request.nextUrl.searchParams
  const userId   = params.get("userId")
  const reassignTo = params.get("reassignTo")

  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  if (userId === user.id) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 })
  if (!reassignTo) return NextResponse.json({ error: "Select a team member to reassign work to before deleting" }, { status: 400 })
  if (reassignTo === userId) return NextResponse.json({ error: "Reassign target cannot be the same user" }, { status: 400 })

  const admin = createAdminClient()

  // Nullable FK references
  await admin.from("properties").update({ primary_concierge_id: null }).eq("primary_concierge_id", userId)
  await admin.from("work_orders").update({ assigned_to: null }).eq("assigned_to", userId)

  // NOT NULL FK references -- reassign to selected team member
  await admin.from("work_orders").update({ requested_by: reassignTo }).eq("requested_by", userId)
  await admin.from("messages").update({ sender_id: reassignTo }).eq("sender_id", userId)
  await admin.from("messages").update({ recipient_id: reassignTo }).eq("recipient_id", userId)

  // Remove from auth (best-effort -- seed users may not have an auth row)
  await admin.auth.admin.deleteUser(userId)

  // Always remove from public.users
  const { error: dbError } = await admin.from("users").delete().eq("id", userId)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
