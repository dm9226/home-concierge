"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle2, FileSignature } from "lucide-react"
import { AgreementDocument } from "@/components/agreement-document"

interface Agreement {
  id: string
  status: "draft" | "sent" | "accepted" | "void"
  title: string
  body: string
  signer_name: string | null
  accepted_at: string | null
}

interface Parties {
  ownerName: string
  address: string
  planLabel: string
  feeLabel: string
}

export function AgreementClient({ agreement, parties }: { agreement: Agreement; parties: Parties }) {
  const router = useRouter()
  const [name, setName] = useState(parties.ownerName ?? "")
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accepted = agreement.status === "accepted"

  async function accept() {
    setBusy(true); setError(null)
    const res = await fetch(`/api/agreements/${agreement.id}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signer_name: name.trim() }),
    })
    setBusy(false)
    if (!res.ok) {
      const r = await res.json().catch(() => ({}))
      setError(r.error ?? "Could not accept")
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <AgreementDocument
        title={agreement.title}
        fields={[
          { label: "Member", value: parties.ownerName },
          { label: "Property", value: parties.address },
          { label: "Plan", value: `${parties.planLabel} · ${parties.feeLabel}` },
        ]}
        body={agreement.body}
        effectiveLabel={accepted && agreement.accepted_at
          ? `Accepted ${new Date(agreement.accepted_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
          : undefined}
      />

      {accepted ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            Accepted by <span className="font-semibold">{agreement.signer_name}</span>
            {agreement.accepted_at ? ` on ${new Date(agreement.accepted_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}` : ""}.
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <p className="text-sm font-medium text-[#1A2320] dark:text-white flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-[#0E7C67]" /> Electronic Acceptance
            </p>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500">Type your full legal name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#0E7C67]" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                I have read and agree to these terms. I understand that typing my name and selecting Accept is the legal equivalent of my signature.
              </span>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button onClick={accept} disabled={busy || !agreed || !name.trim()} className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E] gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Accept Agreement
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
