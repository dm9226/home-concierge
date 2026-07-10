"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { UserPlus, UserCog, X } from "lucide-react"

interface Props {
  propertyId: string
  clients: { id: string; full_name: string; email: string }[]
  currentOwner?: { id: string; full_name: string; email: string } | null
}

export function AssignOwnerDialog({ propertyId, clients, currentOwner }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(currentOwner?.id ?? "")
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAssign() {
    if (!selectedId) return
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/properties/${propertyId}/owner`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: selectedId }),
    })
    setLoading(false)
    if (!res.ok) { setError((await res.json()).error ?? "Failed"); return }
    setOpen(false)
    router.refresh()
  }

  async function handleRemove() {
    setRemoving(true)
    setError(null)
    const res = await fetch(`/api/properties/${propertyId}/owner`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: null }),
    })
    setRemoving(false)
    if (!res.ok) { setError((await res.json()).error ?? "Failed"); return }
    setOpen(false)
    router.refresh()
  }

  const hasOwner = !!currentOwner

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setError(null) }}>
      <DialogTrigger asChild>
        {hasOwner ? (
          <button className="flex items-center gap-1.5 mt-1 text-xs text-[#0E7C67] hover:underline">
            <UserCog className="h-3.5 w-3.5" />
            Manage owner
          </button>
        ) : (
          <Button className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E] gap-2">
            <UserPlus className="h-4 w-4" />
            Assign Owner
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {hasOwner ? "Manage Property Owner" : "Assign Property Owner"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {hasOwner && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Current Owner</p>
              <p className="font-semibold text-[#1A2320] dark:text-white">{currentOwner!.full_name}</p>
              <p className="text-sm text-slate-500">{currentOwner!.email}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-slate-500 mb-2">
              {hasOwner ? "Reassign to a different client:" : "Select a client to assign as property owner:"}
            </p>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.filter(c => c.id !== currentOwner?.id).map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="font-medium">{c.full_name}</span>
                    <span className="ml-2 text-slate-400 text-xs">{c.email}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between gap-3 pt-1">
            {hasOwner && (
              <Button
                variant="outline"
                onClick={handleRemove}
                disabled={removing || loading}
                className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                {removing ? "Removing..." : "Remove owner"}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                onClick={handleAssign}
                disabled={!selectedId || selectedId === currentOwner?.id || loading}
                className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E]"
              >
                {loading ? "Saving..." : hasOwner ? "Reassign" : "Assign Owner"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
