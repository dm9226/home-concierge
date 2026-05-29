import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { StatusBadge, PriorityBadge } from "@/components/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDateShort } from "@/lib/utils"
import { ArrowLeft, Calendar, Clock, DollarSign, MapPin, User } from "lucide-react"
import { WorkOrderActions } from "./work-order-actions"

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") redirect("/portal")

  const { data: wo } = await supabase
    .from("work_orders")
    .select(`
      *,
      property:properties(id, address, city, state, client_id),
      photos:work_order_photos(*),
      updates:emergency_status_updates(*)
    `)
    .eq("id", id)
    .single()

  if (!wo) notFound()

  const property = (wo as any).property
  const photos = (wo as any).photos ?? []
  const updates = ((wo as any).updates ?? []).sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/work-orders" className="flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </Link>
        <h1 className="font-display text-xl font-semibold text-[#0F1B2D] dark:text-white flex-1 truncate">{wo.title}</h1>
        <PriorityBadge priority={wo.priority} />
        <StatusBadge status={wo.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow icon={<MapPin className="h-4 w-4" />} label="Property">
              {property && (
                <Link href={`/dashboard/properties/${property.id}`} className="text-[#C9A96E] hover:underline">
                  {property.address}, {property.city}
                </Link>
              )}
            </DetailRow>
            <DetailRow icon={<Clock className="h-4 w-4" />} label="Submitted">
              {formatDateShort(wo.created_at)}
            </DetailRow>
            {wo.scheduled_date && (
              <DetailRow icon={<Calendar className="h-4 w-4" />} label="Scheduled">
                {formatDateShort(wo.scheduled_date)}
              </DetailRow>
            )}
            {wo.completed_date && (
              <DetailRow icon={<Calendar className="h-4 w-4" />} label="Completed">
                {formatDateShort(wo.completed_date)}
              </DetailRow>
            )}
            {wo.cost_estimate && (
              <DetailRow icon={<DollarSign className="h-4 w-4" />} label="Estimate">
                {formatCurrency(wo.cost_estimate)}
              </DetailRow>
            )}
            {wo.actual_cost && (
              <DetailRow icon={<DollarSign className="h-4 w-4" />} label="Actual Cost">
                {formatCurrency(wo.actual_cost)}
              </DetailRow>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <WorkOrderActions workOrder={wo} />
      </div>

      {wo.description && (
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Description</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{wo.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <ConciergeNotesEditor workOrderId={wo.id} initialNotes={wo.notes} />
        </CardContent>
      </Card>

      {updates.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {updates.map((update: any, i: number) => (
                <div key={update.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#C9A96E] mt-1 shrink-0" />
                    {i < updates.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-[#0F1B2D] dark:text-white">{update.message}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDateShort(update.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {photos.length > 0 && (
        <div>
          <h2 className="font-semibold text-[#0F1B2D] dark:text-white mb-3">Photos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((p: any) => (
              <div key={p.id} className="aspect-video rounded-xl overflow-hidden bg-slate-100">
                <img src={p.url} alt={p.caption ?? ""} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <div className="text-sm font-medium text-[#0F1B2D] dark:text-white">{children}</div>
      </div>
    </div>
  )
}

// Inline client component for notes editing
import { ConciergeNotesEditor } from "./concierge-notes-editor"
