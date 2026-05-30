import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TopNav } from "@/components/nav/top-nav"
import { PortalMobileNav } from "@/components/nav/portal-mobile-nav"
import { PortalDesktopNav } from "@/components/nav/portal-desktop-nav"

export default async function PortalLayout({
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
  if (profile.role !== "client") redirect("/dashboard")

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F0E8] dark:bg-[#060e1a]">
      <TopNav user={profile} />
      <PortalDesktopNav />
      <main className="flex-1 pb-20 md:pb-6">
        {children}
      </main>
      <PortalMobileNav />
    </div>
  )
}
