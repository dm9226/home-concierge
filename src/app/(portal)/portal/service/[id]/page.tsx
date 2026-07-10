import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDateShort } from "@/lib/utils"
import { ArrowLeft, Calendar, Clock, DollarSign, Wrench, AlertTriangle } from "lucide-react"

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: workOrder } = await supabase
    .from("work_orders")
    .select("*")
    .eq("id", id)
    .single()

  if (!workOrder) notFound()

  // Verify client owns the property
  const { data: ownership } = await supabase
    .from("property_owners")
    .select("property_id")
    .eq("property_id", workOrder.property_id)
    .eq("user_id", user.id)
    .single()

  if (!ownership) redirect("/portal/service")

  const { data: property } = await supabase
    .from("properties")
    .select("id, address, city, state")
    .eq("id", workOrder.property_id)
    .single()

  const photos: any[] = []
  const updates: any[] = []

  const isEmergency = workOrder.priority === "emergency"

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/portal/service" className="flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </Link>
        <h1 className="font-display text-xl font-semibold text-[#1A2320] dark:text-white flex-1 truncate">{workOrder.title}</h1>
        <StatusBadge status={workOrder.status} />
      </div>

      {isEmergency && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800">Emergency request -- our team is coordinating an urgent response</p>
        </div>
      )}

      {/* Details card */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Submitted</p>
              <p className="text-sm font-medium text-[#1A2320] dark:text-white flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {formatDateShort(workOrder.created_at)}
              </p>
            </div>
            {workOrder.scheduled_date && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Scheduled</p>
                <p className="text-sm font-medium text-[#1A2320] dark:text-white flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {formatDateShort(workOrder.scheduled_date)}
                </p>
              </div>
            )}
            {workOrder.completed_date && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Completed</p>
                <p className="text-sm font-medium text-[#1A2320] dark:text-white flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {formatDateShort(workOrder.completed_date)}
                </p>
              </div>
            )}
            {workOrder.actual_cost && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Cost</p>
                <p className="text-sm font-medium text-[#1A2320] dark:text-white flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                  {formatCurrency(workOrder.actual_cost)}
                </p>
              </div>
            )}
            {!workOrder.actual_cost && workOrder.cost_estimate && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Estimate</p>
                <p className="text-sm font-medium text-[#1A2320] dark:text-white flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                  {formatCurrency(workOrder.cost_estimate)}
                </p>
              </div>
            )}
          </div>

          {workOrder.description && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{workOrder.description}</p>
            </div>
          )}

          {workOrder.notes && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Notes from your team</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{workOrder.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status timeline for emergencies */}
      {updates.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status Updates</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {updates.map((update: any, i: number) => (
                <div key={update.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#0E7C67] mt-1 shrink-0" />
                    {i < updates.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-[#1A2320] dark:text-white">{update.status_message}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDateShort(update.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div>
          <h2 className="font-semibold text-[#1A2320] dark:text-white mb-3">Photos</h2>
          <div className="grid grid-cols-2 gap-2">
            {photos.map((photo: any) => (
              <div key={photo.id} className="aspect-video rounded-xl overflow-hidden bg-slate-100">
                <img src={photo.photo_url} alt={photo.caption ?? "Work order photo"} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
