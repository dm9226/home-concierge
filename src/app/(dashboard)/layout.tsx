import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TopNav } from "@/components/nav/top-nav"
import { Sidebar } from "@/components/nav/sidebar"
import { BottomNav } from "@/components/nav/bottom-nav"

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
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  )
}
