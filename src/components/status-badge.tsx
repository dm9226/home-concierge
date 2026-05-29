import { cn } from "@/lib/utils"

const statusConfig: Record<string, { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  approved: { label: "Approved", className: "bg-teal-50 text-teal-700 border border-teal-200" },
  scheduled: { label: "Scheduled", className: "bg-violet-50 text-violet-700 border border-violet-200" },
  in_progress: { label: "In Progress", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  cancelled: { label: "Cancelled", className: "bg-slate-50 text-slate-500 border border-slate-200" },
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  paused: { label: "Paused", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  cancelled_prop: { label: "Cancelled", className: "bg-slate-50 text-slate-500 border border-slate-200" },
  draft: { label: "Draft", className: "bg-slate-50 text-slate-600 border border-slate-200" },
  sent: { label: "Sent", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  paid: { label: "Paid", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  overdue: { label: "Overdue", className: "bg-red-50 text-red-700 border border-red-200" },
  planning: { label: "Planning", className: "bg-slate-50 text-slate-600 border border-slate-200" },
  on_hold: { label: "On Hold", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  preferred: { label: "Preferred", className: "bg-[#C9A96E]/10 text-[#b8954f] border border-[#C9A96E]/30" },
  probationary: { label: "Probationary", className: "bg-orange-50 text-orange-700 border border-orange-200" },
  blacklisted: { label: "Blacklisted", className: "bg-red-100 text-red-700 border border-red-300" },
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  emergency: { label: "Emergency", className: "bg-red-100 text-red-700 border border-red-300 font-semibold" },
  high: { label: "High", className: "bg-orange-50 text-orange-700 border border-orange-200" },
  normal: { label: "Normal", className: "bg-slate-50 text-slate-600 border border-slate-200" },
  low: { label: "Low", className: "bg-slate-50 text-slate-400 border border-slate-100" },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

interface PriorityBadgeProps {
  priority: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status.replace(/_/g, " "),
    className: "bg-slate-50 text-slate-600 border border-slate-200",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority] ?? {
    label: priority.replace(/_/g, " "),
    className: "bg-slate-50 text-slate-600 border border-slate-200",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
