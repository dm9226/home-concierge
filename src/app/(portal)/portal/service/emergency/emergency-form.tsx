"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const EMERGENCY_TYPES = [
  { value: "flooding", label: "Water / Flooding" },
  { value: "electrical", label: "Electrical Hazard" },
  { value: "gas_leak", label: "Gas Leak" },
  { value: "hvac_failure", label: "HVAC Failure" },
  { value: "security", label: "Security Breach" },
  { value: "structural", label: "Structural Damage" },
  { value: "other", label: "Other Emergency" },
]

export function EmergencyForm({ propertyId, userId }: { propertyId: string; userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    type: "",
    description: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.type) {
      toast.error("Please select the emergency type")
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const typeLabel = EMERGENCY_TYPES.find(t => t.value === form.type)?.label ?? form.type
      const title = `EMERGENCY: ${typeLabel}`

      const { error } = await supabase.from("work_orders").insert({
        property_id: propertyId,
        requested_by: userId,
        title,
        description: form.description || null,
        category: form.type,
        priority: "emergency",
        is_emergency: true,
        status: "submitted",
      })

      if (error) throw error

      setSubmitted(true)
      toast.success("Emergency request submitted -- our team has been alerted")
    } catch {
      toast.error("Failed to submit. Please call us directly.")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 mx-auto">
          <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold text-emerald-800">Emergency request received</p>
        <p className="text-sm text-emerald-700">our team has been alerted and will respond immediately. Check your messages for updates.</p>
        <button
          onClick={() => router.push("/portal")}
          className="mt-2 text-sm font-medium text-emerald-800 underline underline-offset-2"
        >
          Return to home
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0F1B2D] dark:text-white mb-2">
              Type of emergency <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EMERGENCY_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: type.value }))}
                  className={`rounded-lg border px-3 py-3 text-sm font-medium text-left transition-colors ${
                    form.type === type.value
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F1B2D] dark:text-white mb-1.5">
              Describe the situation
            </label>
            <textarea
              placeholder="What's happening? What's the immediate risk? What have you already done?"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0F1B2D] placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="w-full bg-red-600 hover:bg-red-700 text-white"
        size="lg"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending alert...
          </>
        ) : (
          "Send Emergency Alert"
        )}
      </Button>
    </form>
  )
}
