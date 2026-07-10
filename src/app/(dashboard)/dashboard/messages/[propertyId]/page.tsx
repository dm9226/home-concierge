import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ArrowLeft } from "lucide-react"
import { MessageThread } from "@/app/(portal)/portal/messages/message-thread"

export default async function DashboardMessageThreadPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()

  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") redirect("/portal")

  const { data: property } = await admin
    .from("properties")
    .select("id, address, city, client:users!properties_client_id_fkey(id, full_name)")
    .eq("id", propertyId)
    .single()

  if (!property) notFound()

  const client = (property as any).client

  const { data: messages } = await admin
    .from("messages")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: true })
    .limit(100)

  // Mark client messages as read
  if (messages?.some(m => m.sender_id !== user.id && !m.is_read)) {
    await admin
      .from("messages")
      .update({ is_read: true })
      .eq("property_id", propertyId)
      .neq("sender_id", user.id)
      .eq("is_read", false)
  }

  return (
    <div className="max-w-2xl h-[calc(100vh-120px)] flex flex-col">
      <div className="px-0 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-3 mb-0">
        <Link href="/dashboard/messages" className="flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </Link>
        <div>
          <p className="font-semibold text-[#1A2320] dark:text-white">{client?.full_name ?? "Client"}</p>
          <p className="text-xs text-slate-500">{property.address}, {property.city}</p>
        </div>
      </div>

      <MessageThread
        messages={messages ?? []}
        currentUserId={user.id}
        propertyId={propertyId}
        concierge={client ? { id: client.id, full_name: client.full_name } : null}
      />
    </div>
  )
}
