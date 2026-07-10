import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { CreateUserDialog } from "@/components/create-user-dialog"
import { UserActions } from "./user-actions"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, UserCog, Phone, Mail } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  concierge: "Team Member",
}

export default async function TeamPage() {
  // Auth via session client, data via admin client to bypass RLS
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") redirect("/portal")

  const isAdmin = profile.role === "admin"

  const { data: staff } = await admin
    .from("users")
    .select("id, full_name, email, phone, role, created_at")
    .in("role", ["admin", "concierge"])
    .order("role", { ascending: true })
    .order("full_name", { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#1A2320] dark:text-white">Team Members</h1>
          <p className="mt-0.5 text-sm text-slate-500">{staff?.length ?? 0} members</p>
        </div>
        {isAdmin && <CreateUserDialog label="Invite Staff" />}
      </div>

      {staff?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UserCog className="h-12 w-12 text-slate-300 mb-3" />
          <h2 className="font-display text-xl font-semibold text-[#1A2320]">No team members yet</h2>
          <p className="mt-1 text-sm text-slate-500">Invite staff members to get started.</p>
        </div>
      )}

      <div className="space-y-3">
        {staff?.map(member => (
          <Card key={member.id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A2320] text-white font-semibold text-sm shrink-0">
                  {member.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#1A2320] dark:text-white">{member.full_name}</p>
                    <Badge variant={member.role === "admin" ? "default" : "secondary"} className="text-xs">
                      {member.role === "admin" && <ShieldCheck className="h-3 w-3 mr-1" />}
                      {ROLE_LABELS[member.role] ?? member.role}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />{member.email}
                    </span>
                    {member.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />{member.phone}
                      </span>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <UserActions
                    currentUserId={user.id}
                    member={{
                      id: member.id,
                      full_name: member.full_name,
                      email: member.email,
                      phone: member.phone,
                      role: member.role,
                    }}
                    allStaff={staff?.map(s => ({
                      id: s.id,
                      full_name: s.full_name,
                      email: s.email,
                      phone: s.phone,
                      role: s.role,
                    })) ?? []}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
