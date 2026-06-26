import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Serves a property file through an authenticated, short-lived signed URL.
// Access is enforced by querying with the user's session client: RLS only
// returns the row if the user (staff or owning client) may see it.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: file } = await supabase
    .from("property_files")
    .select("file_url, storage_bucket, storage_path")
    .eq("id", id)
    .maybeSingle()

  // No row -> either missing or RLS denied access. Don't distinguish.
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (file.storage_bucket && file.storage_path) {
    const admin = createAdminClient()
    const { data, error } = await admin.storage
      .from(file.storage_bucket)
      .createSignedUrl(file.storage_path, 60)
    if (error || !data) return NextResponse.json({ error: "Could not sign URL" }, { status: 500 })
    return NextResponse.redirect(data.signedUrl)
  }

  // Legacy public file
  if (file.file_url) return NextResponse.redirect(file.file_url)

  return NextResponse.json({ error: "Not found" }, { status: 404 })
}
