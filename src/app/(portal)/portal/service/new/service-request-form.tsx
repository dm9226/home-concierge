"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const CATEGORIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" },
  { value: "appliance", label: "Appliance" },
  { value: "landscaping", label: "Landscaping" },
  { value: "pest_control", label: "Pest Control" },
  { value: "cleaning", label: "Cleaning" },
  { value: "painting", label: "Painting / Drywall" },
  { value: "roofing", label: "Roofing" },
  { value: "other", label: "Other" },
]

const PRIORITIES = [
  { value: "low", label: "Low", description: "Not urgent, schedule when convenient" },
  { value: "normal", label: "Normal", description: "Should be addressed within a week" },
  { value: "high", label: "High", description: "Needs attention within 1-2 days" },
]

export function ServiceRequestForm({ propertyId, userId }: { propertyId: string; userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    priority: "normal",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.category) {
      toast.error("Please fill in the title and category")
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("work_orders").insert({
        property_id: propertyId,
        requested_by: userId,
        title: form.title,
        description: form.description || null,
        category: form.category,
        priority: form.priority as "emergency" | "high" | "normal" | "low",
        status: "submitted",
      })

      if (error) throw error

      toast.success("Service request submitted")
      router.push("/portal/service")
      router.refresh()
    } catch {
      toast.error("Failed to submit request")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A2320] dark:text-white mb-1.5">
              What needs attention? <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Kitchen faucet dripping"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#1A2320] placeholder:text-slate-400 focus:border-[#1A2320] focus:outline-none focus:ring-1 focus:ring-[#1A2320] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A2320] dark:text-white mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition-colors ${
                    form.category === cat.value
                      ? "border-[#1A2320] bg-[#1A2320] text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A2320] dark:text-white mb-1.5">
              Priority
            </label>
            <div className="space-y-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                    form.priority === p.value
                      ? "border-[#1A2320] bg-[#1A2320]/5 dark:bg-[#1A2320]/20"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  <p className={`text-sm font-medium ${form.priority === p.value ? "text-[#1A2320] dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
                    {p.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A2320] dark:text-white mb-1.5">
              Additional details
            </label>
            <textarea
              placeholder="Describe the issue in more detail, when it started, any relevant history..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#1A2320] placeholder:text-slate-400 focus:border-[#1A2320] focus:outline-none focus:ring-1 focus:ring-[#1A2320] dark:border-slate-700 dark:bg-slate-900 dark:text-white resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Request"
        )}
      </Button>
    </form>
  )
}
