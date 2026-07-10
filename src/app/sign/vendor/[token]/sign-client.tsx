"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle2, FileSignature } from "lucide-react"

export function VendorSignClient({ token }: { token: string }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [title, setTitle] = useState("")
  const [email, setEmail] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function accept() {
    setBusy(true); setError(null)
    const res = await fetch(`/api/vendor-agreements/${token}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signer_name: name.trim(), signer_title: title.trim(), signer_email: email.trim() }),
    })
    setBusy(false)
    if (!res.ok) {
      const r = await res.json().catch(() => ({}))
      setError(r.error ?? "Could not execute the agreement")
      return
    }
    router.refresh()
  }

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <p className="text-sm font-medium text-[#0F1B2D] dark:text-white flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-[#0E7C67]" /> Execute Agreement
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Full legal name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Title</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Owner" />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs text-slate-500">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
        </div>
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#0E7C67]" />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            I am authorized to sign on behalf of the Vendor and agree to these terms. I understand my electronic acceptance is the legal equivalent of a signature.
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button onClick={accept} disabled={busy || !agreed || !name.trim()} className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E] gap-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Execute Agreement
        </Button>
      </CardContent>
    </Card>
  )
}
