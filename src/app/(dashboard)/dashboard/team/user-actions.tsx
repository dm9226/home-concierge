"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { EditUserDialog } from "@/components/edit-user-dialog"
import { Pencil, Trash2, X, Check } from "lucide-react"

interface Member {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: string
}

interface UserActionsProps {
  currentUserId: string
  member: Member
  allStaff: Member[]
}

export function UserActions({ currentUserId, member, allStaff }: UserActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [reassignTo, setReassignTo] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const isSelf = member.id === currentUserId

  const otherStaff = allStaff.filter(s => s.id !== member.id)

  async function handleDelete() {
    if (!reassignTo) return
    setDeleting(true)
    setDeleteError(null)
    const res = await fetch(
      `/api/admin/delete-user?userId=${member.id}&reassignTo=${reassignTo}`,
      { method: "DELETE" }
    )
    const data = await res.json()
    setDeleting(false)
    if (!res.ok) {
      setDeleteError(data.error ?? "Delete failed")
      return
    }
    router.refresh()
  }

  function handleCancel() {
    setConfirming(false)
    setReassignTo("")
    setDeleteError(null)
  }

  return (
    <>
      <div className="flex items-center gap-1 shrink-0">
        {confirming ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 whitespace-nowrap">Reassign work to:</label>
                <select
                  value={reassignTo}
                  onChange={e => setReassignTo(e.target.value)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-[#0F1B2D] focus:outline-none"
                >
                  <option value="">-- select --</option>
                  {otherStaff.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-40"
                  disabled={!reassignTo || deleting}
                  onClick={handleDelete}
                  title="Confirm remove"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-slate-700"
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {deleteError && (
                <p className="text-xs text-red-600">{deleteError}</p>
              )}
            </div>
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
            {!isSelf && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-red-600"
                onClick={() => setConfirming(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            )}
          </>
        )}
      </div>

      <EditUserDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={member}
      />
    </>
  )
}
