import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDateShort } from "@/lib/utils"
import { ArrowLeft, Phone, Mail, Star } from "lucide-react"
import { VendorActions } from "./vendor-actions"

const STATUS_COLORS: Record<string, string> = {
  preferred: "bg-emerald-100 text-emerald-700 border-emerald-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  probationary: "bg-amber-100 text-amber-700 border-amber-200",
  blacklisted: "bg-red-100 text-red-700 border-red-200",
}

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()

  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") redirect("/portal")

  const { data: vendor } = await admin
    .from("vendors")
    .select("*")
    .eq("id", id)
    .single()

  if (!vendor) notFound()

  const { data: scorecard } = await admin
    .from("vendor_scorecards")
    .select("*")
    .eq("vendor_id", id)
    .single()

  const { data: workOrders } = await admin
    .from("work_orders")
    .select("id, title, status, completed_date, actual_cost, property:properties(address)")
    .eq("vendor_id", id)
    .order("created_at", { ascending: false })
    .limit(20)

  const totalSpend = workOrders?.reduce((sum, wo) => sum + (wo.actual_cost ?? 0), 0) ?? 0

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/vendors" className="flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-semibold text-[#0F1B2D] dark:text-white">{vendor.company_name}</h1>
            <Badge className={STATUS_COLORS[vendor.status] ?? ""}>{vendor.status}</Badge>
          </div>
          {vendor.contact_name && <p className="text-sm text-slate-500">{vendor.contact_name}</p>}
        </div>
        <VendorActions vendor={vendor} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Contact info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vendor.phone && (
              <a href={`tel:${vendor.phone}`} className="flex items-center gap-3 text-sm hover:text-[#C9A96E] transition-colors">
                <Phone className="h-4 w-4 text-slate-400" />
                {vendor.phone}
              </a>
            )}
            {vendor.email && (
              <a href={`mailto:${vendor.email}`} className="flex items-center gap-3 text-sm hover:text-[#C9A96E] transition-colors">
                <Mail className="h-4 w-4 text-slate-400" />
                {vendor.email}
              </a>
            )}
            {vendor.license_number && (
              <p className="text-xs text-slate-500">License: {vendor.license_number}</p>
            )}
            {vendor.insurance_expiration && (
              <p className="text-xs text-slate-500">Insurance expires: {formatDateShort(vendor.insurance_expiration)}</p>
            )}
            {vendor.specialty_categories && vendor.specialty_categories.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Specialties</p>
                <div className="flex flex-wrap gap-1.5">
                  {vendor.specialty_categories.map(cat => (
                    <span key={cat} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 capitalize">{cat}</span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating & scorecard */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vendor.rating ? (
              <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${i < Math.round(vendor.rating!) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                  />
                ))}
                <span className="font-semibold text-[#0F1B2D] dark:text-white ml-1">{vendor.rating.toFixed(1)}</span>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Not yet rated</p>
            )}

            {scorecard && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total jobs</span>
                  <span className="font-medium text-[#0F1B2D] dark:text-white">{scorecard.total_jobs}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">On-time</span>
                  <span className="font-medium text-[#0F1B2D] dark:text-white">
                    {scorecard.total_jobs > 0 ? `${Math.round((scorecard.on_time_count / scorecard.total_jobs) * 100)}%` : "--"}
                  </span>
                </div>
                {scorecard.average_satisfaction_rating && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Avg satisfaction</span>
                    <span className="font-medium text-[#0F1B2D] dark:text-white">{scorecard.average_satisfaction_rating.toFixed(1)}/5</span>
                  </div>
                )}
                {scorecard.callback_count > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Callbacks</span>
                    <span className="font-medium text-amber-600">{scorecard.callback_count}</span>
                  </div>
                )}
                {totalSpend > 0 && (
                  <div className="flex justify-between text-sm pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Total spend</span>
                    <span className="font-medium text-[#0F1B2D] dark:text-white">{formatCurrency(totalSpend)}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {vendor.notes && (
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Notes</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{vendor.notes}</p>
          </CardContent>
        </Card>
      )}

      {workOrders && workOrders.length > 0 && (
        <div>
          <h2 className="font-semibold text-[#0F1B2D] dark:text-white mb-3">Work History</h2>
          <div className="space-y-2">
            {workOrders.map(wo => (
              <Link
                key={wo.id}
                href={`/dashboard/work-orders/${wo.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <p className="font-medium text-[#0F1B2D] dark:text-white">{wo.title}</p>
                  <p className="text-sm text-slate-500">
                    {(wo as any).property?.address}
                    {wo.completed_date && ` · ${formatDateShort(wo.completed_date)}`}
                  </p>
                </div>
                {wo.actual_cost && (
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{formatCurrency(wo.actual_cost)}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
