import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileSettingsForm } from "@/components/profile-settings-form"

export default async function PortalSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")
  if (profile.role !== "client") redirect("/dashboard/settings")

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-display text-2xl font-semibold text-[#0F1B2D] dark:text-white">Account Settings</h1>
      <ProfileSettingsForm user={profile} />
    </div>
  )
}
