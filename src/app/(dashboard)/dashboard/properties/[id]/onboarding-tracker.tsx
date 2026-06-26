import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Circle, ArrowRight } from "lucide-react"
import type { OnboardingStep } from "@/lib/onboarding"

// Admin onboarding tracker: progress bar + step list, each linking to its tab.
export function OnboardingTracker({ steps, basePath }: { steps: OnboardingStep[]; basePath: string }) {
  const done = steps.filter(s => s.done).length
  const total = steps.length
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <Card className="mb-4 border-[#C9A96E]/40">
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#0F1B2D] dark:text-white">Onboarding</h3>
          <span className="text-sm font-semibold text-[#C9A96E]">{done} of {total} complete</span>
        </div>

        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-4">
          <div className="h-full bg-[#C9A96E] transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {steps.map(step => (
            <Link
              key={step.key}
              href={`${basePath}?tab=${step.tab}`}
              className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                step.done
                  ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/10"
                  : "border-slate-200 hover:border-[#C9A96E] dark:border-slate-800"
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                {step.done
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  : <Circle className="h-4 w-4 text-slate-300 shrink-0" />}
                <span className={`truncate ${step.done ? "text-slate-500 line-through" : "text-[#0F1B2D] dark:text-white font-medium"}`}>
                  {step.label}
                </span>
              </span>
              {!step.done && <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
