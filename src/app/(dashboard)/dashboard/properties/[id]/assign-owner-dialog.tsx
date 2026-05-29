"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserPlus } from "lucide-react"

interface Props {
  propertyId: string
  clients: { id: string; full_name: string; email: string }[]
}

export function AssignOwnerDialog({ propertyId, clients }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAssign() {
    if (!selectedId) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase
      .from("properties")
      .update({ client_id: selectedId })
      .eq("id", propertyId)

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }

    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f] gap-2">
          <UserPlus className="h-4 w-4" />
          Assign Owner
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Assign Property Owner</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-500">
            Select an existing client to assign as the owner of this property.
            To add a new client first, go to the Clients page.
          </p>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a client..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="font-medium">{c.full_name}</span>
                  <span className="ml-2 text-slate-400 text-xs">{c.email}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedId || loading}
              className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f]"
            >
              {loading ? "Assigning..." : "Assign Owner"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
