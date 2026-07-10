"use client"

import { Navigation } from "lucide-react"

interface PropertyMapProps {
  address: string
  latitude?: number | null
  longitude?: number | null
  className?: string
}

export function PropertyMap({ address, latitude, longitude, className = "" }: PropertyMapProps) {
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`

  let embedUrl: string
  if (latitude && longitude) {
    const delta = 0.008
    const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`
    embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`
  } else {
    embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 ${className}`}>
      <iframe
        src={embedUrl}
        className="w-full"
        style={{ border: 0, height: "calc(100% - 40px)", minHeight: "160px" }}
        loading="lazy"
        title={`Map of ${address}`}
      />
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 h-10 w-full bg-[#1A2320] hover:bg-[#1a2d47] text-white text-sm font-medium transition-colors"
      >
        <Navigation className="h-4 w-4" />
        Get Directions
      </a>
    </div>
  )
}
