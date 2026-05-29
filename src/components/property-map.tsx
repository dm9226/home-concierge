"use client"

interface PropertyMapProps {
  address: string
  latitude?: number | null
  longitude?: number | null
  className?: string
}

export function PropertyMap({ address, latitude, longitude, className = "" }: PropertyMapProps) {
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  let embedUrl: string
  if (latitude && longitude) {
    const delta = 0.008
    const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`
    embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`
  } else {
    embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
  }

  return (
    <div className={`relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 ${className}`}>
      <iframe
        src={embedUrl}
        className="w-full h-full"
        style={{ border: 0, minHeight: "inherit" }}
        loading="lazy"
        title={`Map of ${address}`}
      />
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-xs text-slate-600 dark:text-slate-300 px-2 py-1 rounded shadow-sm border border-slate-200 dark:border-slate-700 hover:text-[#C9A96E] transition-colors"
      >
        Open in Google Maps ↗
      </a>
    </div>
  )
}
