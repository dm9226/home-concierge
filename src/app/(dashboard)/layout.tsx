import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TopNav } from "@/components/nav/top-nav"
import { Sidebar } from "@/components/nav/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")
  if (profile.role === "client") redirect("/portal")

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#060e1a]">
      <TopNav user={profile} />
      <div className="flex flex-1">
        <Sidebar role={profile.role as "admin" | "concierge"} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
