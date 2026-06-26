import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Records a client's electronic acceptance of a service agreement.
// Access is verified by reading the row with the user's session client (RLS).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const signerName = typeof body.signer_name === "string" ? body.signer_name.trim() : ""
  if (!signerName) return NextResponse.json({ error: "Type your full name to accept" }, { status: 400 })

  // RLS returns the row only if the user may access this property.
  const { data: agreement } = await supabase
    .from("service_agreements")
    .select("id, status, body")
    .eq("id", id)
    .maybeSingle()
  if (!agreement) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (agreement.status === "accepted") return NextResponse.json({ error: "Already accepted" }, { status: 409 })
  if (agreement.status !== "sent") return NextResponse.json({ error: "Agreement is not available to sign" }, { status: 409 })

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await admin
    .from("service_agreements")
    .update({
      status: "accepted",
      accepted_by: user.id,
      signer_name: signerName,
      accepted_at: now,
      accepted_ip: ip,
      accepted_snapshot: agreement.body,
      updated_at: now,
    })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
