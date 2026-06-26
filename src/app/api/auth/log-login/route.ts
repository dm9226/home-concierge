import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Records a login event after a successful sign-in. Called by the login form;
// captures IP and user-agent server-side (the client can't see the real IP).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    null
  const userAgent = req.headers.get("user-agent")

  const admin = createAdminClient()
  await admin.from("auth_events").insert({
    user_id: user.id,
    event: "login",
    ip,
    user_agent: userAgent,
  })

  return NextResponse.json({ ok: true })
}
