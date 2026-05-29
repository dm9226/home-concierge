"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { EditUserDialog } from "@/components/edit-user-dialog"
import { Pencil, Trash2, X, Check } from "lucide-react"

interface ClientActionsProps {
  currentUserId: string
  client: {
    id: string
    full_name: string
    email: string
    phone: string | null
    role: string
  }
}

export function ClientActions({ currentUserId, client }: ClientActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    const res = await fetch(`/api/admin/delete-user?userId=${client.id}`, { method: "DELETE" })
    const data = await res.json()
    setDeleting(false)
    if (!res.ok) {
      setDeleteError(data.error ?? "Delete failed")
      setConfirming(false)
      return
    }
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-1 shrink-0">
        {confirming ? (
          <div className="flex items-center gap-1">
            {deleteError && <span className="text-xs text-red-600 mr-1">{deleteError}</span>}
            <span className="text-xs text-slate-500 mr-1">Remove client?</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={deleting}
              onClick={handleDelete}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-700"
              onClick={() => { setConfirming(false); setDeleteError(null) }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-700"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-red-600"
              onClick={() => setConfirming(true)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </>
        )}
      </div>

      <EditUserDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={client}
      />
    </>
  )
}
