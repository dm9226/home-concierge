"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"

export function ConciergeNotesEditor({
  workOrderId,
  initialNotes,
}: {
  workOrderId: string
  initialNotes: string | null
}) {
  const [notes, setNotes] = useState(initialNotes ?? "")
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("work_orders")
        .update({ notes: notes || null })
        .eq("id", workOrderId)
      if (error) throw error
      toast.success("Notes saved")
      setDirty(false)
    } catch {
      toast.error("Failed to save notes")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={notes}
        onChange={e => { setNotes(e.target.value); setDirty(true) }}
        rows={4}
        placeholder="Add notes visible to the client..."
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0F1B2D] placeholder:text-slate-400 focus:border-[#0F1B2D] focus:outline-none focus:ring-1 focus:ring-[#0F1B2D] dark:border-slate-700 dark:bg-slate-900 dark:text-white resize-none"
      />
      {dirty && (
        <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save Notes
        </Button>
      )}
    </div>
  )
}
