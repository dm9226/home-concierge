import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Anthropic from "@anthropic-ai/sdk"

export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Standard warranty periods by category (years)
const WARRANTY_YEARS: Record<string, number> = {
  hvac: 10,
  plumbing: 6,
  electrical: 20,
  appliance: 2,
  roofing: 25,
  exterior: 10,
  pool: 3,
  landscaping: 1,
  smart_home: 2,
  security: 3,
  other: 2,
}

// Standard expected lifespan by category (years)
const LIFESPAN_YEARS: Record<string, number> = {
  hvac: 15,
  plumbing: 12,
  electrical: 30,
  appliance: 12,
  roofing: 25,
  exterior: 20,
  pool: 10,
  landscaping: 5,
  smart_home: 7,
  security: 10,
  other: 10,
}

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr)
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().split("T")[0]
}

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
  // compressImage() always outputs JPEG via canvas.toBlob, so the bytes are always JPEG
  // regardless of the original file.type (HEIC, WEBP, etc.)
  const mediaType = "image/jpeg" as const

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
  "manufacture_date": "YYYY-MM-DD if manufacture/production date is visible on label (look for MFG DATE, DATE OF MFG, MANUFACTURED, Production Date), else null",
  "install_date": "YYYY-MM-DD if installation date is explicitly shown, else null",
  "warranty_expiration": "YYYY-MM-DD if warranty expiration date is explicitly shown on label, else null",
  "expected_lifespan_years": estimated lifespan as integer based on equipment type, or null,
  "notes": "any other useful details from the label such as BTU rating, voltage, capacity, refrigerant type, serial number decode info, etc."
}

Return only valid JSON, no markdown, no explanation.`,
          },
        ],
      },
    ],
  })

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : ""
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  const cleaned = jsonMatch ? jsonMatch[0] : raw

  try {
    const parsed = JSON.parse(cleaned)

    // Auto-fill expected lifespan if missing
    if (!parsed.expected_lifespan_years && parsed.category) {
      parsed.expected_lifespan_years = LIFESPAN_YEARS[parsed.category] ?? null
    }

    // Auto-estimate warranty expiration from manufacture_date if not on label
    if (!parsed.warranty_expiration && parsed.category) {
      const baseDate = parsed.manufacture_date || parsed.install_date
      if (baseDate) {
        const warrantyYears = WARRANTY_YEARS[parsed.category] ?? 2
        parsed.warranty_expiration = addYears(baseDate, warrantyYears)
        parsed.warranty_estimated = true
      }
    }

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: `Parse failed. Claude returned: ${raw.slice(0, 200)}` }, { status: 422 })
  }
}
