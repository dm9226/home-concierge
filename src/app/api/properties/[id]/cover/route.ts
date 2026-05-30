import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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

  if (profile.role === "client") {
    const { data: property } = await admin
      .from("properties")
      .select("client_id")
      .eq("id", id)
      .single()
    if (!property || property.client_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const { cover_photo_url } = await request.json()

  const { error } = await admin
    .from("properties")
    .update({ cover_photo_url })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cover_photo_url })
}
