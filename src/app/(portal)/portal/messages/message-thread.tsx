"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  sender_id: string
  body: string
  created_at: string
  is_read: boolean
}

export function MessageThread({
  messages: initialMessages,
  currentUserId,
  propertyId,
  concierge,
}: {
  messages: Message[]
  currentUserId: string
  propertyId: string
  concierge: { id: string; full_name: string } | null
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${propertyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `property_id=eq.${propertyId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [propertyId])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body || sending) return

    setSending(true)
    setText("")
    try {
      const { error } = await supabase.from("messages").insert({
        property_id: propertyId,
        sender_id: currentUserId,
        recipient_id: concierge?.id ?? currentUserId,
        body,
        subject: "Message",
      })
      if (error) throw error
    } catch {
      setText(body)
      toast.error("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    const today = new Date()
    const isToday = d.toDateString() === today.toDateString()
    if (isToday) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  }

  return (
    <>
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <p className="text-slate-400 text-sm">No messages yet.</p>
            <p className="text-slate-400 text-sm">Send a message to our team below.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.sender_id === currentUserId
          const prevMsg = messages[i - 1]
          const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center justify-center my-3">
                  <span className="text-xs text-slate-400 bg-[#F5F0E8] dark:bg-[#060e1a] px-3 py-1 rounded-full">
                    {new Date(msg.created_at).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
                  </span>
                </div>
              )}
              <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                <div className="max-w-[80%] space-y-1">
                  <div className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm",
                    isOwn
                      ? "bg-[#0F1B2D] text-white rounded-br-sm"
                      : "bg-white dark:bg-slate-800 text-[#0F1B2D] dark:text-white border border-slate-200/80 dark:border-slate-700 rounded-bl-sm"
                  )}>
                    {msg.body}
                  </div>
                  <p className={cn("text-xs text-slate-400", isOwn ? "text-right" : "text-left")}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={sendMessage} className="px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-end gap-3">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage(e as any)
              }
            }}
            placeholder="Message your team..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-[#0F1B2D] placeholder:text-slate-400 focus:border-[#0F1B2D] focus:outline-none focus:ring-1 focus:ring-[#0F1B2D] dark:border-slate-700 dark:bg-slate-800 dark:text-white max-h-32"
            style={{ minHeight: "44px" }}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0F1B2D] text-white disabled:opacity-40 hover:bg-[#1a2d47] transition-colors"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </>
  )
}
