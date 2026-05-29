import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

  if (userId === user.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Try to delete from auth. For demo/seed users that only exist in public.users
  // this will fail -- that's fine, we still clean up the public row below.
  await admin.auth.admin.deleteUser(userId)

  // Always delete from public.users regardless of auth result.
  // Nullify FK references first so cascades don't block the delete.
  await admin.from("properties").update({ primary_concierge_id: null }).eq("primary_concierge_id", userId)
  await admin.from("work_orders").update({ assigned_to: null }).eq("assigned_to", userId)

  const { error: dbError } = await admin.from("users").delete().eq("id", userId)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
