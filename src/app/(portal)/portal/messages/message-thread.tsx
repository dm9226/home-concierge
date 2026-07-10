"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Send, Loader2, Paperclip, X, Play } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  sender_id: string
  body: string
  created_at: string
  is_read: boolean
  attachment_url: string | null
  attachment_type: string | null
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
  const [attachment, setAttachment] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<Message | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
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

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setAttachment(file)
    if (file) {
      setPreview(URL.createObjectURL(file))
    } else {
      setPreview(null)
    }
  }

  function clearAttachment() {
    setAttachment(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if ((!body && !attachment) || sending) return

    setSending(true)
    const optimisticText = body
    const optimisticAttachment = attachment
    setText("")
    clearAttachment()

    try {
      let attachmentUrl: string | null = null
      let attachmentType: string | null = null

      if (optimisticAttachment) {
        const fd = new FormData()
        fd.append("file", optimisticAttachment)
        fd.append("bucket", "message-attachments")
        fd.append("path", propertyId)

        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd })
        if (!uploadRes.ok) {
          const err = await uploadRes.json()
          throw new Error(err.error ?? "Upload failed")
        }
        const { url } = await uploadRes.json()
        attachmentUrl = url
        attachmentType = optimisticAttachment.type.startsWith("video/") ? "video" : "image"
      }

      const { error } = await supabase.from("messages").insert({
        property_id: propertyId,
        sender_id: currentUserId,
        recipient_id: concierge?.id ?? currentUserId,
        body: body || " ",
        subject: "Message",
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
      })
      if (error) throw error
    } catch (err: any) {
      setText(optimisticText)
      toast.error(err?.message ?? "Failed to send message")
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
                  <span className="text-xs text-slate-400 bg-[#F5F0E8] dark:bg-[#0A0F0C] px-3 py-1 rounded-full">
                    {new Date(msg.created_at).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
                  </span>
                </div>
              )}
              <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                <div className="max-w-[80%] space-y-1">
                  {msg.attachment_url && (
                    <div
                      className="rounded-xl overflow-hidden cursor-pointer"
                      onClick={() => setLightbox(msg)}
                    >
                      {msg.attachment_type === "video" ? (
                        <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                          <video src={msg.attachment_url} className="h-full w-full object-cover" muted playsInline />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Play className="h-8 w-8 text-white drop-shadow" />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={msg.attachment_url}
                          alt="attachment"
                          className="max-h-48 w-auto rounded-xl object-cover"
                        />
                      )}
                    </div>
                  )}
                  {msg.body.trim() && msg.body !== " " && (
                    <div className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm",
                      isOwn
                        ? "bg-[#1A2320] text-white rounded-br-sm"
                        : "bg-white dark:bg-slate-800 text-[#1A2320] dark:text-white border border-slate-200/80 dark:border-slate-700 rounded-bl-sm"
                    )}>
                      {msg.body}
                    </div>
                  )}
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

      {/* Attachment preview */}
      {preview && attachment && (
        <div className="px-4 pt-2">
          <div className="relative inline-block">
            {attachment.type.startsWith("video/") ? (
              <video src={preview} className="h-20 rounded-lg object-cover" muted />
            ) : (
              <img src={preview} alt="preview" className="h-20 rounded-lg object-cover" />
            )}
            <button
              type="button"
              onClick={clearAttachment}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-slate-900 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Composer */}
      <form onSubmit={sendMessage} className="px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors disabled:opacity-40"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={pickFile}
          />
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
            className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-[#1A2320] placeholder:text-slate-400 focus:border-[#1A2320] focus:outline-none focus:ring-1 focus:ring-[#1A2320] dark:border-slate-700 dark:bg-slate-800 dark:text-white max-h-32"
            style={{ minHeight: "44px" }}
          />
          <button
            type="submit"
            disabled={(!text.trim() && !attachment) || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1A2320] text-white disabled:opacity-40 hover:bg-[#1a2d47] transition-colors"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>

      {/* Lightbox */}
      {lightbox?.attachment_url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <div onClick={e => e.stopPropagation()}>
            {lightbox.attachment_type === "video" ? (
              <video
                src={lightbox.attachment_url}
                controls
                autoPlay
                className="max-h-[85vh] max-w-full rounded-lg"
              />
            ) : (
              <img
                src={lightbox.attachment_url}
                alt="attachment"
                className="max-h-[85vh] max-w-full object-contain rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}
