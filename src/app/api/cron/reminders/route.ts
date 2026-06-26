import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail, emailLayout } from "@/lib/email"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Daily reminder job (Vercel cron). Emails homeowners the day before a
// scheduled work order and when maintenance is due. Deduped via reminder_log.
export async function GET(req: NextRequest) {
  // Vercel sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set.
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  // Tomorrow (UTC) window
  const now = new Date()
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  const dayAfter = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowDate = tomorrow.toISOString().slice(0, 10)

  const [{ data: workOrders }, { data: maintenance }] = await Promise.all([
    admin
      .from("work_orders")
      .select("id, title, property_id, scheduled_date, vendor:vendors(company_name)")
      .eq("status", "scheduled")
      .gte("scheduled_date", tomorrow.toISOString())
      .lt("scheduled_date", dayAfter.toISOString()),
    admin
      .from("maintenance_schedules")
      .select("id, title, property_id, next_due")
      .eq("is_active", true)
      .eq("next_due", tomorrowDate),
  ])

  const wos = workOrders ?? []
  const maint = maintenance ?? []
  const propertyIds = Array.from(new Set([...wos, ...maint].map(x => x.property_id)))

  if (propertyIds.length === 0) {
    return NextResponse.json({ ok: true, workOrders: 0, maintenance: 0, emailed: 0 })
  }

  // Owner emails + addresses for the affected properties
  const [{ data: owners }, { data: props }, { data: alreadySent }] = await Promise.all([
    admin.from("property_owners").select("property_id, user:users(email, full_name)").in("property_id", propertyIds),
    admin.from("properties").select("id, address").in("id", propertyIds),
    admin.from("reminder_log").select("kind, ref_id").eq("remind_for", tomorrowDate),
  ])

  const emailsByProperty = new Map<string, string[]>()
  for (const o of owners ?? []) {
    const email = (o as any).user?.email
    if (!email) continue
    const arr = emailsByProperty.get(o.property_id) ?? []
    arr.push(email)
    emailsByProperty.set(o.property_id, arr)
  }
  const addressById = new Map((props ?? []).map(p => [p.id, p.address]))
  const sentSet = new Set((alreadySent ?? []).map(r => `${r.kind}:${r.ref_id}`))

  let emailed = 0
  const logRows: { kind: string; ref_id: string; remind_for: string; recipients: string }[] = []

  async function handle(kind: "work_order" | "maintenance", id: string, propertyId: string, subject: string, heading: string, lines: string[]) {
    if (sentSet.has(`${kind}:${id}`)) return
    const recipients = emailsByProperty.get(propertyId) ?? []
    if (recipients.length === 0) return
    const res = await sendEmail({ to: recipients, subject, html: emailLayout(heading, lines) })
    if (res.sent) {
      emailed++
      logRows.push({ kind, ref_id: id, remind_for: tomorrowDate, recipients: recipients.join(", ") })
    }
  }

  for (const wo of wos) {
    const addr = addressById.get(wo.property_id) ?? "your property"
    const vendor = (wo as any).vendor?.company_name
    await handle("work_order", wo.id, wo.property_id,
      `Reminder: ${wo.title} scheduled tomorrow`,
      "Service scheduled for tomorrow",
      [
        `<strong>${wo.title}</strong> is scheduled for tomorrow at ${addr}.`,
        vendor ? `Provider: ${vendor}.` : "",
        "Please ensure access is available. Reply to this email if anything needs to change.",
      ].filter(Boolean))
  }

  for (const m of maint) {
    const addr = addressById.get(m.property_id) ?? "your property"
    await handle("maintenance", m.id, m.property_id,
      `Upcoming maintenance: ${m.title}`,
      "Maintenance due tomorrow",
      [
        `<strong>${m.title}</strong> is due tomorrow at ${addr}.`,
        "Your Care Free Casa team will coordinate as needed.",
      ])
  }

  if (logRows.length > 0) {
    await admin.from("reminder_log").insert(logRows)
  }

  return NextResponse.json({ ok: true, workOrders: wos.length, maintenance: maint.length, emailed })
}
