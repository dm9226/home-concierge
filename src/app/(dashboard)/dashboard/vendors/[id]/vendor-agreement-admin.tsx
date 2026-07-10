"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileSignature, Loader2, CheckCircle2, Send, Undo2, Copy, Check } from "lucide-react"
import { DEFAULT_VENDOR_AGREEMENT_BODY } from "@/lib/vendor-agreement"
import { AgreementDocument } from "@/components/agreement-document"
import { formatDateShort } from "@/lib/utils"

interface Agreement {
  id: string
  status: "draft" | "sent" | "accepted" | "void"
  title: string
  body: string
  access_token: string
  signer_name: string | null
  signer_title: string | null
  signer_email: string | null
  accepted_at: string | null
  accepted_ip: string | null
}

export function VendorAgreementAdmin({ vendorId, userId, vendor }: {
  vendorId: string
  userId: string
  vendor: { company_name: string; specialties: string[] }
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [agreement, setAgreement] = useState<Agreement | null>(null)
  const [title, setTitle] = useState("Vendor Partnership Agreement")
  const [body, setBody] = useState(DEFAULT_VENDOR_AGREEMENT_BODY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [preview, setPreview] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from("vendor_agreements")
        .select("id, status, title, body, access_token, signer_name, signer_title, signer_email, accepted_at, accepted_ip")
        .eq("vendor_id", vendorId)
        .maybeSingle()
      if (data) { setAgreement(data); setTitle(data.title); setBody(data.body) }
      setLoading(false)
    }
    load()
  }, [vendorId])

  const fields = [
    { label: "Vendor", value: vendor.company_name },
    { label: "Trade", value: vendor.specialties.join(", ") || "--" },
    { label: "Partner", value: "Carefree Casa" },
  ]

  const signingLink = agreement
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/sign/vendor/${agreement.access_token}`
    : ""

  async function create() {
    setBusy(true); setError(null)
    const { data, error } = await supabase.from("vendor_agreements").insert({
      vendor_id: vendorId, created_by: userId, title, body: DEFAULT_VENDOR_AGREEMENT_BODY,
    }).select("id, status, title, body, access_token, signer_name, signer_title, signer_email, accepted_at, accepted_ip").single()
    setBusy(false)
    if (error) { setError(error.message); return }
    setAgreement(data); setBody(data.body)
  }

  async function save() {
    if (!agreement) return
    setBusy(true); setError(null)
    const { error } = await supabase.from("vendor_agreements")
      .update({ title, body, updated_at: new Date().toISOString() }).eq("id", agreement.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    setSaved(true)
    setAgreement(a => a ? { ...a, title, body } : a)
  }

  async function setStatus(status: "draft" | "sent") {
    if (!agreement) return
    setBusy(true); setError(null)
    const { error } = await supabase.from("vendor_agreements")
      .update({ status, updated_at: new Date().toISOString() }).eq("id", agreement.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    setAgreement(a => a ? { ...a, status } : a)
  }

  function copyLink() {
    navigator.clipboard.writeText(signingLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return <Card><CardContent className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></CardContent></Card>
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><FileSignature className="h-4 w-4 text-[#0E7C67]" /> Partnership Agreement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}

        {!agreement ? (
          <div className="text-center py-4">
            <p className="text-sm text-slate-500 mb-3">No agreement prepared yet. Create one from the standard template, edit if needed, then send the vendor a link to review and execute.</p>
            <Button onClick={create} disabled={busy} className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E] gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
              Create Agreement
            </Button>
          </div>
        ) : agreement.status === "accepted" ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-4">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="h-4 w-4" /> Executed
            </div>
            <div className="mt-2 text-sm text-emerald-800 dark:text-emerald-200 space-y-0.5">
              <p>Signed by <span className="font-semibold">{agreement.signer_name}</span>{agreement.signer_title ? `, ${agreement.signer_title}` : ""}</p>
              {agreement.signer_email && <p>{agreement.signer_email}</p>}
              <p>{agreement.accepted_at ? formatDateShort(agreement.accepted_at) : ""}{agreement.accepted_ip ? ` · IP ${agreement.accepted_ip}` : ""}</p>
            </div>
            <p className="mt-3 text-xs text-emerald-700/70 dark:text-emerald-400/70">The executed terms are locked as a permanent record.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-end">
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 text-xs font-medium">
                <button type="button" onClick={() => setPreview(false)} className={`rounded-md px-2.5 py-1 ${!preview ? "bg-[#0F1B2D] text-white" : "text-slate-500"}`}>Edit</button>
                <button type="button" onClick={() => setPreview(true)} className={`rounded-md px-2.5 py-1 ${preview ? "bg-[#0F1B2D] text-white" : "text-slate-500"}`}>Preview</button>
              </div>
            </div>

            {preview ? (
              <AgreementDocument title={title} fields={fields} body={body} />
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="va_title">Title</Label>
                  <Input id="va_title" value={title} onChange={e => { setTitle(e.target.value); setSaved(false) }} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="va_body">Terms</Label>
                  <Textarea id="va_body" value={body} onChange={e => { setBody(e.target.value); setSaved(false) }} rows={14} className="font-mono text-xs leading-relaxed" />
                </div>
              </>
            )}

            {/* Signing link (once sent) */}
            {agreement.status === "sent" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20 p-3">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1.5">Send this link to the vendor to review and execute:</p>
                <div className="flex items-center gap-2">
                  <input readOnly value={signingLink} className="flex-1 rounded-md border border-blue-200 bg-white px-2 py-1.5 text-xs text-slate-600 dark:bg-slate-900" />
                  <Button type="button" size="sm" variant="outline" onClick={copyLink} className="gap-1.5 shrink-0">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${agreement.status === "sent" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                  {agreement.status === "sent" ? "Sent — awaiting vendor" : "Draft"}
                </span>
                {saved && <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Saved</span>}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={save} disabled={busy}>Save</Button>
                {agreement.status === "draft" ? (
                  <Button type="button" onClick={() => setStatus("sent")} disabled={busy} className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E] gap-1.5">
                    <Send className="h-4 w-4" /> Send to Vendor
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setStatus("draft")} disabled={busy} className="gap-1.5">
                    <Undo2 className="h-4 w-4" /> Unsend
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
