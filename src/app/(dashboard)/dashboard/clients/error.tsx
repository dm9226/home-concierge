"use client"

export default function ClientsError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  return (
    <div className="p-6 space-y-2">
      <h2 className="font-semibold text-red-600">Clients page error</h2>
      <p className="text-sm text-slate-600 font-mono bg-slate-100 p-3 rounded">{error.message}</p>
      {error.digest && (
        <p className="text-xs text-slate-400">Digest: {error.digest}</p>
      )}
    </div>
  )
}
