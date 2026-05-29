import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date))
}

export function getDaysUntil(date: string | Date): number {
  const now = new Date()
  const target = new Date(date)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function getHealthScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600"
  if (score >= 60) return "text-amber-500"
  return "text-red-500"
}

export function getHealthScoreLabel(score: number): string {
  if (score >= 80) return "Excellent"
  if (score >= 60) return "Good"
  if (score >= 40) return "Fair"
  return "Needs Attention"
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "emergency": return "text-red-600 bg-red-50 border-red-200"
    case "high": return "text-orange-600 bg-orange-50 border-orange-200"
    case "normal": return "text-blue-600 bg-blue-50 border-blue-200"
    case "low": return "text-slate-600 bg-slate-50 border-slate-200"
    default: return "text-slate-600 bg-slate-50 border-slate-200"
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "completed": return "text-emerald-700 bg-emerald-50 border-emerald-200"
    case "in_progress": return "text-blue-700 bg-blue-50 border-blue-200"
    case "scheduled": return "text-violet-700 bg-violet-50 border-violet-200"
    case "submitted": return "text-amber-700 bg-amber-50 border-amber-200"
    case "cancelled": return "text-slate-500 bg-slate-50 border-slate-200"
    case "approved": return "text-teal-700 bg-teal-50 border-teal-200"
    default: return "text-slate-600 bg-slate-50 border-slate-200"
  }
}

export function getWarrantyColor(expirationDate: string | null): string {
  if (!expirationDate) return "text-slate-400"
  const days = getDaysUntil(expirationDate)
  if (days > 365) return "text-emerald-600"
  if (days > 0) return "text-amber-500"
  return "text-red-500"
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + "..."
}

export function generateReferralCode(userId: string): string {
  return "HC-" + userId.slice(0, 8).toUpperCase()
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "")
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  if (match) return `(${match[1]}) ${match[2]}-${match[3]}`
  return phone
}
