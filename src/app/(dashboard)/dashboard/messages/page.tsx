import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatDateShort } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare } from "lucide-react"

export default async function DashboardMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()

  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") redirect("/portal")

  // Admins see all properties; concierge see only their assigned ones
  let propQuery = admin
    .from("properties")
    .select("id, address, city, client:users!properties_client_id_fkey(id, full_name)")
    .eq("status", "active")

  if (profile.role === "concierge") {
    propQuery = propQuery.eq("primary_concierge_id", user.id)
  }

  const { data: properties } = await propQuery.order("address", { ascending: true })

  if (!properties?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MessageSquare className="h-12 w-12 text-slate-300 mb-3" />
        <h2 className="font-display text-xl font-semibold text-[#0F1B2D]">No conversations yet</h2>
      </div>
    )
  }

  const propertyIds = properties.map(p => p.id)

  const { data: latestMessages } = await admin
    .from("messages")
    .select("property_id, body, created_at, sender_id, is_read")
    .in("property_id", propertyIds)
    .order("created_at", { ascending: false })

  const latestByProperty: Record<string, any> = {}
  const unreadByProperty: Record<string, number> = {}

  latestMessages?.forEach(m => {
    if (!latestByProperty[m.property_id]) latestByProperty[m.property_id] = m
    if (m.sender_id !== user.id && !m.is_read) {
      unreadByProperty[m.property_id] = (unreadByProperty[m.property_id] ?? 0) + 1
    }
  })

  const sorted = [...properties].sort((a, b) => {
    const aTime = latestByProperty[a.id]?.created_at ?? ""
    const bTime = latestByProperty[b.id]?.created_at ?? ""
    return bTime.localeCompare(aTime)
  })

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-display text-2xl font-semibold text-[#0F1B2D] dark:text-white">Messages</h1>

      <div className="space-y-2">
        {sorted.map(property => {
          const client = (property as any).client
          const latest = latestByProperty[property.id]
          const unread = unreadByProperty[property.id] ?? 0

          return (
            <Link key={property.id} href={`/dashboard/messages/${property.id}`}>
              <Card className="hover:shadow-md transition-all">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F1B2D] text-white font-semibold text-sm shrink-0">
                      {client ? client.full_name.split(" ").map((n: string) => n[0]).join("") : "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-[#0F1B2D] dark:text-white truncate">
                          {client?.full_name ?? "Client"}
                        </p>
                        {latest && (
                          <span className="text-xs text-slate-400 shrink-0">{formatDateShort(latest.created_at)}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{property.address}, {property.city}</p>
                      {latest && (
                        <p className="text-sm text-slate-500 truncate mt-0.5">{latest.body}</p>
                      )}
                    </div>
                    {unread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C9A96E] text-white text-xs font-bold px-1 shrink-0">
                        {unread}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
