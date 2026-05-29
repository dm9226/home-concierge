"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { EditUserDialog } from "@/components/edit-user-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Pencil, Trash2 } from "lucide-react"

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
}

export function UserActions({ currentUserId, member }: UserActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const isSelf = member.id === currentUserId

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    const res = await fetch(`/api/admin/delete-user?userId=${member.id}`, { method: "DELETE" })
    const data = await res.json()
    setDeleting(false)
    if (!res.ok) {
      setDeleteError(data.error ?? "Delete failed")
      return
    }
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-1 shrink-0">
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-red-600"
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove {member.full_name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete their account and revoke access. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteError && <p className="text-sm text-red-600 px-1">{deleteError}</p>}
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? "Removing..." : "Remove User"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
