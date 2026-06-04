import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Anthropic from "@anthropic-ai/sdk"

export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
  }

  const formData = await request.formData()
  const file = formData.get("image") as File | null
  const itemLabel = formData.get("item_label") as string || "item"
  const section = formData.get("section") as string || ""
  const itemType = formData.get("item_type") as string || "condition"

  if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString("base64")

  let prompt: string

  if (itemType === "utility_bill") {
    prompt = `You are reading a utility bill photo during a home onboarding.
Extract provider information and return ONLY a JSON object:
{
  "provider": "utility company name",
  "account_type": "electric" | "gas" | "water" | "other",
  "notes": "any other useful detail (account number last 4, service address confirmation, etc.)"
}
Return only valid JSON, no markdown.`
  } else if (itemType === "data") {
    prompt = `You are analyzing a photo taken during a home inspection for the item: "${itemLabel}" in the "${section}" section.
The inspector is trying to capture a specific data point. Extract whatever relevant information is visible.
Return ONLY a JSON object:
{
  "value": "the specific data you can identify (location description, measurement, specification, label text, etc.)",
  "notes": "any additional observations worth noting",
  "flagged": false
}
Return only valid JSON, no markdown.`
  } else {
    // condition assessment (default)
    prompt = `You are assessing a photo taken during a home inspection.
Item: "${itemLabel}"
Section: "${section}"

Evaluate the visible condition and return ONLY a JSON object:
{
  "condition": one of "good" | "fair" | "poor" | "na",
  "notes": "1-2 sentences: what you observe, any visible issues, approximate age if discernible, anything actionable. Be specific.",
  "flagged": true if this item shows issues that need attention or repair, otherwise false
}

Condition guide:
- good: no visible issues, functioning or looking as expected
- fair: minor wear, cosmetic issues, or items to monitor in the next 1-2 years
- poor: significant issues -- needs repair, replacement, or immediate attention
- na: not visible in this photo, not accessible, or not applicable to this property

Return only valid JSON, no markdown.`
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
          { type: "text", text: prompt },
        ],
      }],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : ""
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const cleaned = jsonMatch ? jsonMatch[0] : raw

    const parsed = JSON.parse(cleaned)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: "Failed to analyze photo" }, { status: 422 })
  }
}
