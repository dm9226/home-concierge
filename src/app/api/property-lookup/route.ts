import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Anthropic from "@anthropic-ai/sdk"

export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = request.nextUrl
  const street = searchParams.get("street")?.trim()
  const city   = searchParams.get("city")?.trim()
  const state  = searchParams.get("state")?.trim()
  const zip    = searchParams.get("zip")?.trim()

  if (!street || !city || !state || !zip) {
    return NextResponse.json({ error: "street, city, state, and zip are all required" }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 })
  }

  const address = `${street}, ${city}, ${state} ${zip}`

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are a property data assistant with knowledge of US public property records, county assessor databases, Zillow, Redfin, and similar sources.

Look up this address and return whatever public property data you have: ${address}

Return ONLY a valid JSON object with these fields (use null for any you don't know):
{
  "year_built": number or null,
  "square_footage": number or null,
  "lot_size": "X.XX acres" or "XXXX sq ft" or null,
  "beds": number or null,
  "baths": number or null,
  "property_type": "single_family" or "townhome" or "condo" or null,
  "stories": number or null,
  "garage": "attached" or "detached" or "none" or null,
  "confidence": "high" or "medium" or "low"
}

Return only the JSON object. No markdown, no explanation.`,
      },
    ],
  })

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : ""
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({ error: "Could not parse property data" }, { status: 422 })

  try {
    const parsed = JSON.parse(match[0])
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: "Could not parse property data" }, { status: 422 })
  }
}
