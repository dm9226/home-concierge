import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getUserPropertyIds } from "@/lib/get-user-properties"
import { ArrowLeft } from "lucide-react"
import { ServiceRequestForm } from "./service-request-form"

export default async function NewServicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const ids = await getUserPropertyIds(supabase, user.id)
  if (!ids.length) redirect("/portal")
  const { data: properties } = await supabase.from("properties").select("id, address").in("id", ids).eq("status", "active").limit(1)
  if (!properties || properties.length === 0) redirect("/portal")

  const propertyId = properties[0].id

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/portal/service" className="flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </Link>
        <h1 className="font-display text-xl font-semibold text-[#1A2320] dark:text-white">Request Service</h1>
      </div>

      <ServiceRequestForm propertyId={propertyId} userId={user.id} />
    </div>
  )
}
