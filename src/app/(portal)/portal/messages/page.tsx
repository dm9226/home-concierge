import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MessageThread } from "./message-thread"
import { MessageSquare } from "lucide-react"

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")

  const { data: properties } = await supabase
    .from("properties")
    .select(`
      id,
      address,
      concierge:users!properties_primary_concierge_id_fkey(id, full_name, avatar_url)
    `)
    .eq("client_id", user.id)
    .eq("status", "active")
    .limit(1)

  if (!properties || properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <MessageSquare className="h-12 w-12 text-slate-300 mb-3" />
        <h2 className="font-display text-xl font-semibold text-[#0F1B2D]">No messages yet</h2>
        <p className="mt-2 text-slate-500">Your conversation with your concierge will appear here.</p>
      </div>
    )
  }

  const property = properties[0]
  const concierge = (property as any).concierge

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("property_id", property.id)
    .order("created_at", { ascending: true })
    .limit(100)

  // Mark messages from concierge as read
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
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F1B2D] text-white font-semibold text-sm shrink-0">
            {concierge ? concierge.full_name.split(" ").map((n: string) => n[0]).join("") : "?"}
          </div>
          <div>
            <p className="font-semibold text-[#0F1B2D] dark:text-white">{concierge?.full_name ?? "Your Concierge"}</p>
            <p className="text-xs text-slate-500">Personal Home Concierge</p>
          </div>
        </div>
      </div>

      <MessageThread
        messages={messages ?? []}
        currentUserId={user.id}
        propertyId={property.id}
        concierge={concierge}
      />
    </div>
  )
}
