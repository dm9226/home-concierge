import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
  "video/mp4", "video/quicktime", "video/webm",
]
const MAX_SIZE = 100 * 1024 * 1024 // 100 MB

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await request.formData()
  const file = form.get("file") as File | null
  const bucket = form.get("bucket") as string | null
  const pathPrefix = (form.get("path") as string | null) ?? ""

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })
  if (!bucket) return NextResponse.json({ error: "No bucket" }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 100 MB)" }, { status: 400 })
  }

  const ext = file.name.split(".").pop() ?? "bin"
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const filePath = pathPrefix ? `${pathPrefix}/${unique}.${ext}` : `${unique}.${ext}`

  const admin = createAdminClient()
  const { error } = await admin.storage
    .from(bucket)
    .upload(filePath, file, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from(bucket).getPublicUrl(filePath)

  return NextResponse.json({ url: publicUrl })
}
