import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const ACTION_TO_STATUS: Record<string, "approved" | "deferred" | "declined"> = {
  approve: "approved",
  defer: "deferred",
  decline: "declined",
}

// Client responds to a recommendation (approve / defer / decline).
// Access is verified by reading the row with the user's session client (RLS),
// then the status is written with the admin client.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const status = ACTION_TO_STATUS[body.action]
  if (!status) return NextResponse.json({ error: "Invalid action" }, { status: 400 })

  // RLS returns the row only if this user may access the property.
  const { data: rec } = await supabase
    .from("recommendations")
    .select("id, status")
    .eq("id", id)
    .maybeSingle()
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Only pending or deferred items can be (re)decided by the client.
  if (!["pending", "deferred"].includes(rec.status)) {
    return NextResponse.json({ error: "Already resolved" }, { status: 409 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("recommendations")
    .update({ status, client_responded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, status })
}
