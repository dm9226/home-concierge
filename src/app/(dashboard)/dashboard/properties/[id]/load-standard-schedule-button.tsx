"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, CalendarClock } from "lucide-react"
import { toast } from "sonner"

export function LoadStandardScheduleButton({ propertyId }: { propertyId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function apply() {
    setLoading(true)
    try {
      const res = await fetch(`/api/properties/${propertyId}/maintenance/standard`, {
        method: "POST",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to load schedule")
      }
      toast.success("Standard maintenance schedule loaded")
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={apply} disabled={loading} size="sm" variant="outline" className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
      {loading ? "Loading..." : "Load standard schedule"}
    </Button>
  )
}
