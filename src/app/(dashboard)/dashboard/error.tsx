"use client"

export default function DashboardError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  return (
    <div className="p-6 space-y-2">
      <h2 className="font-semibold text-red-600">Page error</h2>
      <p className="text-sm font-mono bg-slate-100 p-3 rounded break-all">{error.message}</p>
      {error.stack && (
        <pre className="text-xs text-slate-500 bg-slate-100 p-3 rounded overflow-auto max-h-48 whitespace-pre-wrap">{error.stack}</pre>
      )}
      {error.digest && <p className="text-xs text-slate-400">Digest: {error.digest}</p>}
    </div>
  )
}
