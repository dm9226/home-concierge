import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { HealthScoreGauge } from "@/components/health-score-gauge"
import { CreateUserDialog } from "@/components/create-user-dialog"
import { ClientActions } from "./client-actions"
import { Users, Home, Phone, Mail } from "lucide-react"

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") redirect("/portal")

  const { data: clients } = await supabase
    .from("users")
    .select(`
      id,
      full_name,
      email,
      phone,
      created_at,
      properties!properties_client_id_fkey(id, address, city, health_score, status)
    `)
    .eq("role", "client")
    .order("full_name", { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#0F1B2D] dark:text-white">Clients</h1>
          <p className="mt-0.5 text-sm text-slate-500">{clients?.length ?? 0} clients under management</p>
        </div>
        <CreateUserDialog fixedRole="client" label="Invite Client" />
      </div>

      {clients?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-12 w-12 text-slate-300 mb-3" />
          <h2 className="font-display text-xl font-semibold text-[#0F1B2D]">No clients yet</h2>
          <p className="text-sm text-slate-500 mt-1">Invite your first client to get started.</p>
        </div>
      )}

      <div className="space-y-3">
        {clients?.map(client => {
          const properties = (client as any).properties ?? []
          const activeProps = properties.filter((p: any) => p.status === "active")

          return (
            <Card key={client.id} className="hover:shadow-md transition-all">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0F1B2D] text-white font-semibold text-sm shrink-0">
                    {client.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#0F1B2D] dark:text-white">{client.full_name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />{client.email}
                      </span>
                      {client.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />{client.phone}
                        </span>
                      )}
                    </div>

                    {activeProps.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {activeProps.map((p: any) => (
                          <Link
                            key={p.id}
                            href={`/dashboard/properties/${p.id}`}
                            className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#C9A96E] transition-colors"
                            onClick={e => e.stopPropagation()}
                          >
                            <Home className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {p.address}, {p.city}
                            {p.health_score && (
                              <span className="text-xs text-slate-400">&bull; Health {p.health_score}</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Health + actions */}
                  <div className="shrink-0 flex items-center gap-3">
                    {activeProps[0]?.health_score && (
                      <HealthScoreGauge score={activeProps[0].health_score} size="sm" />
                    )}
                    <ClientActions
                      currentUserId={user.id}
                      client={{
                        id: client.id,
                        full_name: client.full_name,
                        email: client.email,
                        phone: client.phone,
                        role: "client",
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
