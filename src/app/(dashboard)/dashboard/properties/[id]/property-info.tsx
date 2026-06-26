"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Loader2, Plus, Trash2, Zap, Building2, KeyRound, Wifi,
  PhoneCall, CalendarClock, CheckCircle2,
} from "lucide-react"

const UTILITY_TYPES = ["Water", "Gas", "Electric", "Power", "Internet", "Trash", "Propane", "Solar"]

interface Utility { type: string; company: string; account: string; phone: string }
interface Contact { name: string; relationship: string; phone: string }

interface OnboardingRow {
  id?: string
  utility_providers: unknown
  hoa_name: string | null
  hoa_contact_phone: string | null
  hoa_contact_email: string | null
  hoa_docs_url: string | null
  alarm_company: string | null
  alarm_code: string | null
  gate_code: string | null
  spare_key_location: string | null
  wifi_network: string | null
  wifi_password: string | null
  pet_info: unknown
  emergency_contacts: unknown
  scheduling_preferences: string | null
  special_instructions: string | null
}

function asUtilities(v: unknown): Utility[] {
  if (Array.isArray(v)) return v.map(u => ({
    type: String(u?.type ?? ""), company: String(u?.company ?? ""),
    account: String(u?.account ?? ""), phone: String(u?.phone ?? ""),
  }))
  return []
}
function asContacts(v: unknown): Contact[] {
  if (Array.isArray(v)) return v.map(c => ({
    name: String(c?.name ?? ""), relationship: String(c?.relationship ?? ""), phone: String(c?.phone ?? ""),
  }))
  return []
}
function petNotes(v: unknown): string {
  if (v && typeof v === "object" && "notes" in v) return String((v as { notes: unknown }).notes ?? "")
  return ""
}

export function PropertyInfo({ propertyId }: { propertyId: string }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [utilities, setUtilities] = useState<Utility[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pets, setPets] = useState("")
  const [text, setText] = useState({
    hoa_name: "", hoa_contact_phone: "", hoa_contact_email: "", hoa_docs_url: "",
    alarm_company: "", alarm_code: "", gate_code: "", spare_key_location: "",
    wifi_network: "", wifi_password: "", scheduling_preferences: "", special_instructions: "",
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from("property_onboarding")
        .select("*")
        .eq("property_id", propertyId)
        .maybeSingle()

      const row = data as OnboardingRow | null
      const u = asUtilities(row?.utility_providers)
      setUtilities(u.length ? u : UTILITY_TYPES.slice(0, 4).map(t => ({ type: t, company: "", account: "", phone: "" })))
      setContacts(asContacts(row?.emergency_contacts))
      setPets(petNotes(row?.pet_info))
      setText({
        hoa_name: row?.hoa_name ?? "", hoa_contact_phone: row?.hoa_contact_phone ?? "",
        hoa_contact_email: row?.hoa_contact_email ?? "", hoa_docs_url: row?.hoa_docs_url ?? "",
        alarm_company: row?.alarm_company ?? "", alarm_code: row?.alarm_code ?? "",
        gate_code: row?.gate_code ?? "", spare_key_location: row?.spare_key_location ?? "",
        wifi_network: row?.wifi_network ?? "", wifi_password: row?.wifi_password ?? "",
        scheduling_preferences: row?.scheduling_preferences ?? "", special_instructions: row?.special_instructions ?? "",
      })
      setLoading(false)
    }
    load()
  }, [propertyId])

  function setField(field: string, value: string) {
    setText(t => ({ ...t, [field]: value }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError(null)

    const cleanUtilities = utilities.filter(u => u.type && (u.company || u.account || u.phone))
    const cleanContacts = contacts.filter(c => c.name || c.phone)

    const payload = {
      property_id: propertyId,
      utility_providers: (cleanUtilities.length ? cleanUtilities : null) as any,
      emergency_contacts: (cleanContacts.length ? cleanContacts : null) as any,
      pet_info: (pets ? { notes: pets } : null) as any,
      hoa_name: text.hoa_name || null,
      hoa_contact_phone: text.hoa_contact_phone || null,
      hoa_contact_email: text.hoa_contact_email || null,
      hoa_docs_url: text.hoa_docs_url || null,
      alarm_company: text.alarm_company || null,
      alarm_code: text.alarm_code || null,
      gate_code: text.gate_code || null,
      spare_key_location: text.spare_key_location || null,
      wifi_network: text.wifi_network || null,
      wifi_password: text.wifi_password || null,
      scheduling_preferences: text.scheduling_preferences || null,
      special_instructions: text.special_instructions || null,
    }

    const { error } = await supabase.from("property_onboarding").upsert(payload, { onConflict: "property_id" })
    setSaving(false)
    if (error) { setError(error.message); return }
    setSaved(true)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Utilities */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-[#C9A96E]" /> Utility Providers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {utilities.map((u, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <select
                value={u.type}
                onChange={e => { const v = e.target.value; setUtilities(arr => arr.map((x, j) => j === i ? { ...x, type: v } : x)); setSaved(false) }}
                className="col-span-3 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">Type</option>
                {UTILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <Input className="col-span-4" placeholder="Company" value={u.company} onChange={e => { const v = e.target.value; setUtilities(arr => arr.map((x, j) => j === i ? { ...x, company: v } : x)); setSaved(false) }} />
              <Input className="col-span-2" placeholder="Acct #" value={u.account} onChange={e => { const v = e.target.value; setUtilities(arr => arr.map((x, j) => j === i ? { ...x, account: v } : x)); setSaved(false) }} />
              <Input className="col-span-2" placeholder="Phone" value={u.phone} onChange={e => { const v = e.target.value; setUtilities(arr => arr.map((x, j) => j === i ? { ...x, phone: v } : x)); setSaved(false) }} />
              <button onClick={() => { setUtilities(arr => arr.filter((_, j) => j !== i)); setSaved(false) }} className="col-span-1 flex justify-center text-slate-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setUtilities(arr => [...arr, { type: "", company: "", account: "", phone: "" }]); setSaved(false) }}>
            <Plus className="h-3.5 w-3.5" /> Add Utility
          </Button>
        </CardContent>
      </Card>

      {/* HOA */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-[#C9A96E]" /> HOA</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>HOA Name</Label><Input value={text.hoa_name} onChange={e => setField("hoa_name", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>HOA Phone</Label><Input value={text.hoa_contact_phone} onChange={e => setField("hoa_contact_phone", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>HOA Email</Label><Input type="email" value={text.hoa_contact_email} onChange={e => setField("hoa_contact_email", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>HOA Docs URL</Label><Input value={text.hoa_docs_url} onChange={e => setField("hoa_docs_url", e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* Access & Security */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4 text-[#C9A96E]" /> Access &amp; Security</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Alarm Company</Label><Input value={text.alarm_company} onChange={e => setField("alarm_company", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Alarm Code</Label><Input value={text.alarm_code} onChange={e => setField("alarm_code", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Gate Code</Label><Input value={text.gate_code} onChange={e => setField("gate_code", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Spare Key Location</Label><Input value={text.spare_key_location} onChange={e => setField("spare_key_location", e.target.value)} /></div>
          <div className="space-y-1.5 flex flex-col"><Label className="flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5" /> WiFi Network</Label><Input value={text.wifi_network} onChange={e => setField("wifi_network", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>WiFi Password</Label><Input value={text.wifi_password} onChange={e => setField("wifi_password", e.target.value)} /></div>
          <p className="col-span-2 text-xs text-slate-400">Codes and passwords are staff-only and never shown in the client portal.</p>
        </CardContent>
      </Card>

      {/* Emergency contacts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><PhoneCall className="h-4 w-4 text-[#C9A96E]" /> Emergency Contacts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {contacts.map((c, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <Input className="col-span-4" placeholder="Name" value={c.name} onChange={e => { const v = e.target.value; setContacts(arr => arr.map((x, j) => j === i ? { ...x, name: v } : x)); setSaved(false) }} />
              <Input className="col-span-4" placeholder="Relationship" value={c.relationship} onChange={e => { const v = e.target.value; setContacts(arr => arr.map((x, j) => j === i ? { ...x, relationship: v } : x)); setSaved(false) }} />
              <Input className="col-span-3" placeholder="Phone" value={c.phone} onChange={e => { const v = e.target.value; setContacts(arr => arr.map((x, j) => j === i ? { ...x, phone: v } : x)); setSaved(false) }} />
              <button onClick={() => { setContacts(arr => arr.filter((_, j) => j !== i)); setSaved(false) }} className="col-span-1 flex justify-center text-slate-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setContacts(arr => [...arr, { name: "", relationship: "", phone: "" }]); setSaved(false) }}>
            <Plus className="h-3.5 w-3.5" /> Add Contact
          </Button>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[#C9A96E]" /> Preferences &amp; Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label>Pets</Label><Input value={pets} onChange={e => { setPets(e.target.value); setSaved(false) }} placeholder="e.g. Two dogs, friendly; cat stays indoors" /></div>
          <div className="space-y-1.5"><Label>Scheduling Preferences</Label><Textarea rows={2} value={text.scheduling_preferences} onChange={e => setField("scheduling_preferences", e.target.value)} placeholder="e.g. No visits before 9am; text before arriving" /></div>
          <div className="space-y-1.5"><Label>Special Instructions</Label><Textarea rows={2} value={text.special_instructions} onChange={e => setField("special_instructions", e.target.value)} placeholder="Anything else the team should know" /></div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-gradient-to-t from-white dark:from-slate-950 py-3">
        {saved && <span className="flex items-center gap-1.5 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
        <Button onClick={save} disabled={saving} className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f] gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save Property Info
        </Button>
      </div>
    </div>
  )
}
