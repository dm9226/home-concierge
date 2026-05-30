import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft, AlertTriangle, Phone } from "lucide-react"
import { EmergencyForm } from "./emergency-form"

export default async function EmergencyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: ownerships } = await supabase.from("property_owners").select("property_id").eq("user_id", user.id)
  const ids = ownerships?.map((o: any) => o.property_id) ?? []
  if (!ids.length) redirect("/portal")
  const { data: properties } = await supabase.from("properties").select("id, address").in("id", ids).eq("status", "active").limit(1)
  if (!properties || properties.length === 0) redirect("/portal")

  const property = properties[0]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/portal" className="flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </Link>
        <h1 className="font-display text-xl font-semibold text-[#0F1B2D] dark:text-white flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Emergency Request
        </h1>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
        <p className="font-semibold text-red-800">For life-threatening emergencies, call 911 first.</p>
        <p className="text-sm text-red-700">Use this form for urgent home issues: flooding, electrical hazards, gas leaks, HVAC failure, security breaches.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-0.5">Direct line</p>
          <p className="font-semibold text-[#0F1B2D] dark:text-white">Carefree Casa Team</p>
          <p className="text-sm text-slate-500">(404) 555-0100</p>
        </div>
        <a
          href="tel:4045550100"
          className="flex items-center gap-2 rounded-full bg-[#0F1B2D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a2d47] transition-colors"
        >
          <Phone className="h-4 w-4" />
          Call Now
        </a>
      </div>

      <EmergencyForm propertyId={property.id} userId={user.id} />
    </div>
  )
}
