import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { HealthScoreGauge } from "@/components/health-score-gauge"
import { Users, Home } from "lucide-react"

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") redirect("/portal")
  if (profile.role === "concierge") redirect("/dashboard")

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
        <h1 className="font-display text-2xl font-semibold text-[#0F1B2D] dark:text-white">Clients</h1>
        <span className="text-sm text-slate-500">{clients?.length ?? 0} clients</span>
      </div>

      {clients?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-12 w-12 text-slate-300 mb-3" />
          <h2 className="font-display text-xl font-semibold text-[#0F1B2D]">No clients yet</h2>
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0F1B2D] text-white font-semibold shrink-0">
                    {client.full_name.split(" ").map((n: string) => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#0F1B2D] dark:text-white">{client.full_name}</p>
                    <p className="text-sm text-slate-500">{client.email}</p>
                    {activeProps.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {activeProps.map((p: any) => (
                          <Link
                            key={p.id}
                            href={`/dashboard/properties/${p.id}`}
                            className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#C9A96E] transition-colors"
                          >
                            <Home className="h-3.5 w-3.5 text-slate-400" />
                            {p.address}, {p.city}
                            {p.health_score && (
                              <span className="text-xs text-slate-400">(Health: {p.health_score})</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    {activeProps[0]?.health_score && (
                      <HealthScoreGauge score={activeProps[0].health_score} size="sm" />
                    )}
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
