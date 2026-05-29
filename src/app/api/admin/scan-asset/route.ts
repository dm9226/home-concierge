import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Anthropic from "@anthropic-ai/sdk"

export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
  }

  const formData = await request.formData()
  const file = formData.get("image") as File | null
  if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString("base64")
  const mediaType = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp"

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: `You are analyzing a photo of an appliance label, nameplate, or data plate to extract information for a home inventory system.

Extract every piece of information visible and return ONLY a JSON object with these fields (omit any field you cannot confidently read):

{
  "name": "descriptive name e.g. Central Air Handler, Gas Water Heater, Dishwasher",
  "brand": "manufacturer/brand name",
  "model": "model number",
  "serial_number": "serial number",
  "category": one of: "hvac", "plumbing", "electrical", "appliance", "roofing", "exterior", "pool", "landscaping", "smart_home", "security", "other",
  "install_date": "YYYY-MM-DD if manufacture or install date is visible, else null",
  "warranty_expiration": "YYYY-MM-DD if warranty expiration is visible, else null",
  "expected_lifespan_years": estimated lifespan as integer based on equipment type, or null,
  "notes": "any other useful details from the label such as BTU rating, voltage, capacity, refrigerant type, etc."
}

Return only valid JSON, no markdown, no explanation.`,
          },
        ],
      },
    ],
  })

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : ""

  // Extract JSON object from response regardless of surrounding text or code fences
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  const cleaned = jsonMatch ? jsonMatch[0] : raw

  try {
    const parsed = JSON.parse(cleaned)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: `Parse failed. Claude returned: ${raw.slice(0, 200)}` }, { status: 422 })
  }
}
