import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileSettingsForm } from "@/components/profile-settings-form"

export default async function DashboardSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")
  if (profile.role === "client") redirect("/portal/settings")

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-[#1A2320] dark:text-white">Account Settings</h1>
      <ProfileSettingsForm user={profile} />
    </div>
  )
}
