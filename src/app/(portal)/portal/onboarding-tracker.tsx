import Link from "next/link"
import { CheckCircle2, Circle, ArrowRight, Sparkles } from "lucide-react"
import type { OnboardingStep } from "@/lib/onboarding"

// Homeowner-facing onboarding progress. Friendlier than the admin version;
// highlights the one thing the homeowner needs to do (sign the agreement).
export function PortalOnboardingTracker({
  steps, propertyId, agreementActionable,
}: {
  steps: OnboardingStep[]
  propertyId: string
  agreementActionable: boolean
}) {
  const done = steps.filter(s => s.done).length
  const total = steps.length
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="rounded-2xl border border-[#C9A96E]/40 bg-white dark:bg-slate-900 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-[#C9A96E]" />
        <p className="font-display font-semibold text-[#0F1B2D] dark:text-white">Setting up your home</p>
        <span className="ml-auto text-sm font-semibold text-[#C9A96E]">{done}/{total}</span>
      </div>
      <p className="text-sm text-slate-500 mb-3">Your team is building your home profile. Here&apos;s where things stand.</p>

      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-4">
        <div className="h-full bg-[#C9A96E] transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      <div className="space-y-1.5">
        {steps.map(step => (
          <div key={step.key} className="flex items-center gap-2 text-sm">
            {step.done
              ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              : <Circle className="h-4 w-4 text-slate-300 shrink-0" />}
            <span className={step.done ? "text-slate-400 line-through" : "text-[#0F1B2D] dark:text-white"}>
              {step.clientLabel}
            </span>
          </div>
        ))}
      </div>

      {agreementActionable && (
        <Link
          href={`/portal/property?id=${propertyId}&tab=agreement`}
          className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#C9A96E] px-4 py-2.5 text-sm font-semibold text-[#0F1B2D] hover:bg-[#b8954f] transition-colors"
        >
          Review &amp; sign your service agreement <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}
