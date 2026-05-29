import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { CreateUserDialog } from "@/components/create-user-dialog"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, UserCog } from "lucide-react"

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  concierge: "Concierge",
}

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") redirect("/portal")
  if (profile.role === "concierge") redirect("/dashboard")

  const { data: staff } = await supabase
    .from("users")
    .select("id, full_name, email, phone, role, created_at")
    .in("role", ["admin", "concierge"])
    .order("role", { ascending: true })
    .order("full_name", { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-[#0F1B2D] dark:text-white">Team</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{staff?.length ?? 0} members</span>
          <CreateUserDialog label="New Staff Member" />
        </div>
      </div>

      {staff?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UserCog className="h-12 w-12 text-slate-300 mb-3" />
          <h2 className="font-display text-xl font-semibold text-[#0F1B2D]">No staff yet</h2>
        </div>
      )}

      <div className="space-y-3">
        {staff?.map(member => (
          <Card key={member.id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F1B2D] text-white font-semibold text-sm shrink-0">
                  {member.full_name.split(" ").map((n: string) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#0F1B2D] dark:text-white">{member.full_name}</p>
                    <Badge variant={member.role === "admin" ? "default" : "secondary"} className="text-xs">
                      {member.role === "admin" && <ShieldCheck className="h-3 w-3 mr-1" />}
                      {ROLE_LABELS[member.role] ?? member.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">{member.email}</p>
                  {member.phone && <p className="text-sm text-slate-400">{member.phone}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
