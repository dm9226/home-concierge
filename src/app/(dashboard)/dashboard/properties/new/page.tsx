import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { NewPropertyForm } from "./new-property-form"

export default async function NewPropertyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") redirect("/portal")

  const { data: concierges } = await supabase
    .from("users")
    .select("id, full_name")
    .in("role", ["admin", "concierge"])
    .order("full_name")

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#0F1B2D] dark:text-white">New Property</h1>
        <p className="mt-1 text-sm text-slate-500">Add a property to the system. You can assign the owner later.</p>
      </div>
      <NewPropertyForm concierges={concierges ?? []} />
    </div>
  )
}
