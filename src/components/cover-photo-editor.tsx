"use client"

import { useState, useRef } from "react"
import { Camera, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function PropertyPlaceholder() {
  return (
    <div className="h-full w-full relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0F1B2D 0%, #1C3252 40%, #0F1B2D 100%)" }}>
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "radial-gradient(circle, #C9A96E 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />
      {/* Diagonal lines */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "repeating-linear-gradient(45deg, #C9A96E 0, #C9A96E 1px, transparent 0, transparent 50%)", backgroundSize: "20px 20px" }}
      />
      {/* House SVG illustration */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width="180" height="140" viewBox="0 0 180 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-[0.12]">
          {/* Main house body */}
          <rect x="25" y="68" width="130" height="72" fill="#C9A96E" />
          {/* Roof */}
          <polygon points="10,68 90,8 170,68" fill="#C9A96E" />
          {/* Door */}
          <rect x="72" y="102" width="36" height="38" rx="2" fill="#0F1B2D" />
          <circle cx="100" cy="122" r="3" fill="#C9A96E" />
          {/* Left window */}
          <rect x="36" y="82" width="28" height="24" rx="2" fill="#0F1B2D" />
          <line x1="50" y1="82" x2="50" y2="106" stroke="#C9A96E" strokeWidth="1.5" />
          <line x1="36" y1="94" x2="64" y2="94" stroke="#C9A96E" strokeWidth="1.5" />
          {/* Right window */}
          <rect x="116" y="82" width="28" height="24" rx="2" fill="#0F1B2D" />
          <line x1="130" y1="82" x2="130" y2="106" stroke="#C9A96E" strokeWidth="1.5" />
          <line x1="116" y1="94" x2="144" y2="94" stroke="#C9A96E" strokeWidth="1.5" />
          {/* Chimney */}
          <rect x="118" y="18" width="16" height="32" fill="#C9A96E" />
          {/* Ground line */}
          <line x1="0" y1="140" x2="180" y2="140" stroke="#C9A96E" strokeWidth="1" opacity="0.3" />
          {/* Bushes */}
          <ellipse cx="42" cy="140" rx="20" ry="10" fill="#C9A96E" opacity="0.5" />
          <ellipse cx="138" cy="140" rx="20" ry="10" fill="#C9A96E" opacity="0.5" />
        </svg>
      </div>
      {/* Gold accent bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A96E]/60 to-transparent" />
    </div>
  )
}

interface CoverPhotoEditorProps {
  propertyId: string
  coverPhotoUrl: string | null
  address: string
  latitude?: number | null
  longitude?: number | null
  canEdit?: boolean
  className?: string
  children?: React.ReactNode
}

export function CoverPhotoEditor({
  propertyId,
  coverPhotoUrl: initialUrl,
  address,
  canEdit = false,
  className,
  children,
}: CoverPhotoEditorProps) {
  const [url, setUrl] = useState(initialUrl)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const displayUrl = url

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("bucket", "property-media")
      fd.append("path", `covers/${propertyId}`)

      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd })
      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error ?? "Upload failed")
      }
      const { url: newUrl } = await uploadRes.json()

      const patchRes = await fetch(`/api/properties/${propertyId}/cover`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_photo_url: newUrl }),
      })
      if (!patchRes.ok) throw new Error("Failed to save cover photo")

      setUrl(newUrl)
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {displayUrl ? (
        <img
          src={displayUrl}
          alt={address}
          className="h-full w-full object-cover"
          onError={() => setUrl(null)}
        />
      ) : (
        <PropertyPlaceholder />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

      {children}

      {canEdit && (
        <div className="absolute top-3 right-3">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white hover:bg-black/60 transition-colors disabled:opacity-50"
          >
            {uploading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Camera className="h-3.5 w-3.5" />}
            {uploading ? "Uploading..." : url ? "Change photo" : "Add photo"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
        </div>
      )}
    </div>
  )
}
