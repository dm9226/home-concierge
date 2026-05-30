"use client"

import { useState, useRef } from "react"
import { Camera, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function streetViewUrl(address: string, lat?: number | null, lon?: number | null): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY
  if (!key) return null
  const location = lat && lon ? `${lat},${lon}` : encodeURIComponent(address)
  return `https://maps.googleapis.com/maps/api/streetview?size=1200x480&location=${location}&fov=85&pitch=5&key=${key}`
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
  latitude,
  longitude,
  canEdit = false,
  className,
  children,
}: CoverPhotoEditorProps) {
  const [url, setUrl] = useState(initialUrl)
  const [streetViewFailed, setStreetViewFailed] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const svUrl = !url && !streetViewFailed ? streetViewUrl(address, latitude, longitude) : null
  const displayUrl = url ?? svUrl

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
          onError={() => {
            if (!url) setStreetViewFailed(true)
          }}
        />
      ) : (
        <div className="h-full w-full navy-gradient" />
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
