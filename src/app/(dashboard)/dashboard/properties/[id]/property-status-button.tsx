"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Loader2 } from "lucide-react"

const STATUS_CONFIG = {
  active:    { label: "Active",    color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  paused:    { label: "Paused",    color: "bg-amber-100 text-amber-700 border-amber-200" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200" },
}

const TRANSITIONS: Record<string, { value: string; label: string; description: string; destructive?: boolean }[]> = {
  active: [
    { value: "paused",    label: "Pause service",   description: "Temporarily suspend service. The homeowner portal will go inactive but all data is preserved." },
    { value: "cancelled", label: "Cancel service",  description: "End service with this client. The homeowner portal will go inactive and they will be removed from the active roster.", destructive: true },
  ],
  paused: [
    { value: "active",    label: "Reactivate",      description: "Resume active service for this property." },
    { value: "cancelled", label: "Cancel service",  description: "End service with this client. All data is preserved but the portal goes inactive.", destructive: true },
  ],
  cancelled: [
    { value: "active",    label: "Re-enroll",       description: "Reactivate service for this property." },
  ],
}

export function PropertyStatusButton({
  propertyId,
  currentStatus,
}: {
  propertyId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState<{ value: string; label: string; description: string; destructive?: boolean } | null>(null)
  const [loading, setLoading] = useState(false)

  const config = STATUS_CONFIG[currentStatus as keyof typeof STATUS_CONFIG]
  const transitions = TRANSITIONS[currentStatus] ?? []

  async function confirm() {
    if (!pending) return
    setLoading(true)
    try {
      const res = await fetch(`/api/properties/${propertyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: pending.value }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      toast.success(`Property ${pending.label.toLowerCase()}d`)
      setPending(null)
      router.refresh()
    } catch {
      toast.error("Failed to update property status")
    } finally {
      setLoading(false)
    }
  }

  if (transitions.length === 0) return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${config?.color}`}>
      {config?.label ?? currentStatus}
    </span>
  )

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-opacity hover:opacity-80 ${config?.color}`}>
            {config?.label ?? currentStatus}
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {transitions.map(t => (
            <DropdownMenuItem
              key={t.value}
              onClick={() => setPending(t)}
              className={t.destructive ? "text-red-600 focus:text-red-600" : ""}
            >
              {t.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!pending} onOpenChange={open => { if (!open) setPending(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending?.label}</DialogTitle>
            <DialogDescription>{pending?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={confirm}
              disabled={loading}
              variant={pending?.destructive ? "destructive" : "default"}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
