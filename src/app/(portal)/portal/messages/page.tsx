import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MessageThread } from "./message-thread"
import { MessageSquare } from "lucide-react"

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  const { data: ownerships } = await supabase.from("property_owners").select("property_id").eq("user_id", user.id)
  const ids = ownerships?.map((o: any) => o.property_id) ?? []
  const { data: properties } = ids.length
    ? await supabase.from("properties").select("id, address").in("id", ids).eq("status", "active").limit(1)
    : { data: [] }

  if (!properties || properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <MessageSquare className="h-12 w-12 text-slate-300 mb-3" />
        <h2 className="font-display text-xl font-semibold text-[#0F1B2D]">No messages yet</h2>
        <p className="mt-2 text-slate-500">Your conversation with the Carefree Casa team will appear here.</p>
      </div>
    )
  }

  const property = properties[0]

  // Find any admin to use as the team recipient
  const { data: teamMember } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "admin")
    .order("created_at")
    .limit(1)
    .single()

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("property_id", property.id)
    .order("created_at", { ascending: true })
    .limit(100)

  if (messages?.some(m => m.sender_id !== user.id && !m.is_read)) {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("property_id", property.id)
      .neq("sender_id", user.id)
      .eq("is_read", false)
  }

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      <div className="px-4 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F1B2D] text-white font-semibold text-sm shrink-0">
            CC
          </div>
          <div>
            <p className="font-semibold text-[#0F1B2D] dark:text-white">Carefree Casa Team</p>
            <p className="text-xs text-slate-500">Home Management</p>
          </div>
        </div>
      </div>

      <MessageThread
        messages={messages ?? []}
        currentUserId={user.id}
        propertyId={property.id}
        concierge={teamMember ?? null}
      />
    </div>
  )
}
