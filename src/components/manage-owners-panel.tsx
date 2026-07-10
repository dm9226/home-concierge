"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { UserPlus, X, Loader2 } from "lucide-react"

interface Owner {
  id: string
  full_name: string
  email: string
  phone: string | null
}

interface Props {
  propertyId: string
  owners: Owner[]
  allClients: Owner[]
}

export function ManageOwnersPanel({ propertyId, owners, allClients }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState("")
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const available = allClients.filter(c => !owners.some(o => o.id === c.id))

  async function handleAdd() {
    if (!selectedId) return
    setAdding(true)
    setError(null)
    const res = await fetch(`/api/properties/${propertyId}/owner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: selectedId }),
    })
    setAdding(false)
    if (!res.ok) { setError((await res.json()).error ?? "Failed"); return }
    setOpen(false)
    setSelectedId("")
    router.refresh()
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId)
    const res = await fetch(`/api/properties/${propertyId}/owner/${userId}`, {
      method: "DELETE",
    })
    setRemovingId(null)
    if (!res.ok) return
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wider text-slate-400">
          Owners {owners.length > 0 && `(${owners.length})`}
        </p>
        {available.length > 0 && (
          <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setSelectedId(""); setError(null) } }}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1 text-xs text-[#0E7C67] hover:underline">
                <UserPlus className="h-3 w-3" />
                Add owner
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-display text-lg">Add Property Owner</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-1">
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="font-medium">{c.full_name}</span>
                        <span className="ml-2 text-xs text-slate-400">{c.email}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleAdd}
                    disabled={!selectedId || adding}
                    className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E] gap-2"
                  >
                    {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Add Owner
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {owners.length === 0 ? (
        <div className="mt-1">
          <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setSelectedId(""); setError(null) } }}>
            <DialogTrigger asChild>
              <Button className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E] gap-2 h-8 text-sm">
                <UserPlus className="h-3.5 w-3.5" />
                Assign Owner
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-display text-lg">Assign Property Owner</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-1">
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allClients.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="font-medium">{c.full_name}</span>
                        <span className="ml-2 text-xs text-slate-400">{c.email}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleAdd}
                    disabled={!selectedId || adding}
                    className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E] gap-2"
                  >
                    {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Assign
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="space-y-2">
          {owners.map(owner => (
            <div key={owner.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-[#0F1B2D] dark:text-white">{owner.full_name}</p>
                <p className="text-xs text-slate-500 truncate">{owner.phone ?? owner.email}</p>
              </div>
              <button
                onClick={() => handleRemove(owner.id)}
                disabled={removingId === owner.id}
                className="shrink-0 rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                title="Remove owner"
              >
                {removingId === owner.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <X className="h-3.5 w-3.5" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
