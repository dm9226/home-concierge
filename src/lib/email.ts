// Minimal email sender backed by Resend's REST API (no SDK dependency).
// No-ops gracefully when RESEND_API_KEY is not configured, so the reminder
// cron runs safely before email is set up.

interface SendArgs {
  to: string | string[]
  subject: string
  html: string
}

const FROM = process.env.EMAIL_FROM || "Care Free Casa <onboarding@resend.dev>"

export async function sendEmail({ to, subject, html }: SendArgs): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { sent: false, skipped: true }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return { sent: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` }
    }
    return { sent: true }
  } catch (err) {
    return { sent: false, error: String(err) }
  }
}

// Small shared wrapper so reminder emails look consistent.
export function emailLayout(heading: string, lines: string[]): string {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 520px; margin: 0 auto; color: #0F1B2D;">
    <div style="background:#0F1B2D; padding:20px 24px; border-radius:12px 12px 0 0;">
      <span style="color:#0E7C67; font-weight:600; font-size:18px;">Care Free Casa</span>
    </div>
    <div style="border:1px solid #e2e8f0; border-top:none; padding:24px; border-radius:0 0 12px 12px;">
      <h2 style="margin:0 0 12px; font-size:18px;">${heading}</h2>
      ${lines.map(l => `<p style="margin:0 0 8px; color:#334155; font-size:14px;">${l}</p>`).join("")}
    </div>
  </div>`
}
