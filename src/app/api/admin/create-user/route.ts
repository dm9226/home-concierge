import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { email, full_name, role, phone } = await request.json()

  if (!email || !full_name || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Explicitly write all fields to public.users so the role is correct
  // regardless of how the Supabase trigger sets defaults.
  if (data.user) {
    await admin.from("users").update({
      full_name,
      role,
      ...(phone ? { phone } : {}),
    }).eq("id", data.user.id)
  }

  return NextResponse.json({ success: true, userId: data.user?.id })
}
