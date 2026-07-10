"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { ImagePlus, Loader2, X, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface MediaItem {
  id: string
  url: string
  phase: "before" | "during" | "after"
  caption: string | null
  media_type: "image" | "video"
  uploaded_at: string
}

const PHASES = ["before", "during", "after"] as const

export function WorkOrderMedia({
  workOrderId,
  initialMedia,
}: {
  workOrderId: string
  initialMedia: MediaItem[]
}) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia)
  const [activePhase, setActivePhase] = useState<"before" | "during" | "after">("before")
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState("")
  const [lightbox, setLightbox] = useState<MediaItem | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const byPhase = media.filter(m => m.phase === activePhase)
  const counts = Object.fromEntries(PHASES.map(p => [p, media.filter(m => m.phase === p).length]))

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("bucket", "property-media")
        fd.append("path", `work-orders/${workOrderId}`)

        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd })
        if (!uploadRes.ok) {
          const err = await uploadRes.json()
          toast.error(err.error ?? "Upload failed")
          continue
        }
        const { url } = await uploadRes.json()
        const mediaType = file.type.startsWith("video/") ? "video" : "image"

        const recordRes = await fetch("/api/work-order-photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ work_order_id: workOrderId, url, phase: activePhase, caption: caption || null, media_type: mediaType }),
        })
        if (!recordRes.ok) {
          toast.error("Failed to save media record")
          continue
        }
        const record = await recordRes.json()
        setMedia(prev => [...prev, record])
      }
      setCaption("")
      if (fileRef.current) fileRef.current.value = ""
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {/* Phase tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-100">
        {PHASES.map(phase => (
          <button
            key={phase}
            onClick={() => setActivePhase(phase)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              activePhase === phase
                ? "border-[#0E7C67] text-[#1A2320]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {phase}
            {counts[phase] > 0 && (
              <span className="ml-1.5 text-xs bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5">
                {counts[phase]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Media grid */}
      {byPhase.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {byPhase.map(item => (
            <button
              key={item.id}
              onClick={() => setLightbox(item)}
              className="group aspect-video rounded-xl overflow-hidden bg-slate-100 relative"
            >
              {item.media_type === "video" ? (
                <>
                  <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                    <Play className="h-8 w-8 text-white drop-shadow" />
                  </div>
                </>
              ) : (
                <img src={item.url} alt={item.caption ?? ""} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
              )}
              {item.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                  <p className="text-xs text-white truncate">{item.caption}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 mb-4">No {activePhase} media yet.</p>
      )}

      {/* Upload controls */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <Input
          placeholder="Caption (optional)"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          className="text-sm h-9"
          disabled={uploading}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="gap-1.5 shrink-0 h-9"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {uploading ? "Uploading..." : "Add Photos / Videos"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Lightbox */}
      {lightbox && (
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
          <div onClick={e => e.stopPropagation()} className="max-w-4xl max-h-[90vh] flex flex-col items-center gap-2">
            {lightbox.media_type === "video" ? (
              <video
                src={lightbox.url}
                controls
                autoPlay
                className="max-h-[80vh] max-w-full rounded-lg"
              />
            ) : (
              <img
                src={lightbox.url}
                alt={lightbox.caption ?? ""}
                className="max-h-[80vh] max-w-full object-contain rounded-lg"
              />
            )}
            {lightbox.caption && (
              <p className="text-white/80 text-sm">{lightbox.caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
