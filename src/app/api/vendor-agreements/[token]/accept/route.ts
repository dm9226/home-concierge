import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Public endpoint: a vendor executes their agreement via the tokenized link.
// No login -- the unguessable token is the credential. Looked up via service role.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: ag } = await admin
    .from("vendor_agreements")
    .select("id, status, body")
    .eq("access_token", token)
    .maybeSingle()

  if (!ag) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (ag.status === "accepted") return NextResponse.json({ error: "Already executed" }, { status: 409 })
  if (ag.status !== "sent") return NextResponse.json({ error: "This agreement is not available to sign" }, { status: 409 })

  const body = await req.json().catch(() => ({}))
  const signerName = typeof body.signer_name === "string" ? body.signer_name.trim() : ""
  const signerTitle = typeof body.signer_title === "string" ? body.signer_title.trim() : ""
  const signerEmail = typeof body.signer_email === "string" ? body.signer_email.trim() : ""
  if (!signerName) return NextResponse.json({ error: "Enter your full name to execute the agreement" }, { status: 400 })

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"

  const now = new Date().toISOString()
  const { error } = await admin
    .from("vendor_agreements")
    .update({
      status: "accepted",
      signer_name: signerName,
      signer_title: signerTitle || null,
      signer_email: signerEmail || null,
      accepted_at: now,
      accepted_ip: ip,
      accepted_snapshot: ag.body,
      updated_at: now,
    })
    .eq("id", ag.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
