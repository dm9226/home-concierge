import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { userId, full_name, phone, role } = await request.json()

  if (!userId || !full_name || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { full_name, role },
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const { error: dbError } = await admin
    .from("users")
    .update({ full_name, phone: phone || null, role })
    .eq("id", userId)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
