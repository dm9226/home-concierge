"use client"

export default function DashboardError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h2 className="font-semibold text-lg text-[#1A2320] dark:text-white">Something went wrong</h2>
      <p className="mt-1 text-sm text-slate-500">Try refreshing the page. If the problem persists, contact support.</p>
      {error.digest && (
        <p className="mt-3 text-xs text-slate-400 font-mono">Error ID: {error.digest}</p>
      )}
    </div>
  )
}
