"use client"

import { useState, useRef, useEffect } from "react"
import { Camera, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { PropertyPlaceholder } from "@/components/property-placeholder"

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
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const displayUrl = url

  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightboxOpen])

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
        <>
          <img
            src={displayUrl}
            alt={address}
            className="h-full w-full object-cover"
            onError={() => setUrl(null)}
          />
          {/* Click the photo to open it full-size in a lightbox */}
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            title="Open full photo"
            aria-label="Open full photo"
            className="absolute inset-0 cursor-zoom-in"
          />
        </>
      ) : (
        <PropertyPlaceholder />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

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

      {/* Full-photo lightbox */}
      {lightboxOpen && displayUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt={address}
            onClick={e => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}
