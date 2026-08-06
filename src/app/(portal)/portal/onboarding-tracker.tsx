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
    <div className="rounded-2xl border border-[#0E7C67]/40 bg-white dark:bg-slate-900 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-[#0E7C67]" />
        <p className="font-display font-semibold text-[#1A2320] dark:text-white">Setting up your home</p>
        <span className="ml-auto text-sm font-semibold text-[#0E7C67]">{done}/{total}</span>
      </div>
      <p className="text-sm text-slate-500 mb-3">Your team is building your home profile. Here&apos;s where things stand.</p>

      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-4">
        <div className="h-full bg-[#0E7C67] transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      <div className="space-y-1.5">
        {steps.map(step => (
          <div key={step.key} className="flex items-center gap-2 text-sm">
            {step.done
              ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              : <Circle className="h-4 w-4 text-slate-300 shrink-0" />}
            <span className={step.done ? "text-slate-400 line-through" : "text-[#1A2320] dark:text-white"}>
              {step.clientLabel}
            </span>
            {!step.done && (
              step.clientAction ? (
                <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 shrink-0 dark:bg-amber-900/40 dark:text-amber-300">
                  Needs you
                </span>
              ) : (
                <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-slate-400 shrink-0">
                  Your team
                </span>
              )
            )}
          </div>
        ))}
      </div>

      {agreementActionable && (
        <Link
          href={`/portal/property?id=${propertyId}&tab=agreement`}
          className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#0E7C67] px-4 py-2.5 text-sm font-semibold text-[#1A2320] hover:bg-[#0A5F4E] transition-colors"
        >
          Review &amp; sign your membership agreement <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}
