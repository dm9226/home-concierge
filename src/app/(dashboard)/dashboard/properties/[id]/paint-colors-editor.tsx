"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Pencil, Check, X } from "lucide-react"

interface Props {
  propertyId: string
  initialValue: string | null
}

export function PaintColorsEditor({ propertyId, initialValue }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialValue ?? "")
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from("properties").update({ paint_colors: value || null }).eq("id", propertyId)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  function cancel() {
    setValue(initialValue ?? "")
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="col-span-2 space-y-1.5">
        <span className="text-xs font-medium text-slate-500">Paint Colors & Codes</span>
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="e.g. Living Room: Sherwin-Williams SW 7015 Repose Gray / Trim: SW 7012 Creamy"
          rows={3}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C9A96E] resize-none"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1 rounded-md bg-[#C9A96E] px-2.5 py-1 text-xs font-medium text-[#0F1B2D] hover:bg-[#b8954f] disabled:opacity-50"
          >
            <Check className="h-3 w-3" /> {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={cancel}
            className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
          >
            <X className="h-3 w-3" /> Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="col-span-2 flex items-start justify-between gap-2 group">
      <div className="min-w-0">
        <span className="block text-xs font-medium text-slate-500 mb-0.5">Paint Colors & Codes</span>
        {value ? (
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{value}</p>
        ) : (
          <p className="text-sm text-slate-400 italic">Not recorded</p>
        )}
      </div>
      <button
        onClick={() => setEditing(true)}
        className="shrink-0 rounded p-1 text-slate-300 hover:text-slate-500 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
