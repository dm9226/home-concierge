import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HealthScoreGauge } from "@/components/health-score-gauge"
import { StatusBadge } from "@/components/status-badge"
import { formatCurrency } from "@/lib/utils"
import { Plus, MapPin, ArrowRight, MessageSquare } from "lucide-react"
import { PropertyPlaceholder } from "@/components/property-placeholder"

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: statusParam } = await searchParams
  const activeTab = (statusParam === "paused" || statusParam === "cancelled") ? statusParam : "active"

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()

  // Counts for each tab
  const [{ count: activeCount }, { count: pausedCount }, { count: cancelledCount }] = await Promise.all([
    admin.from("properties").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("properties").select("*", { count: "exact", head: true }).eq("status", "paused"),
    admin.from("properties").select("*", { count: "exact", head: true }).eq("status", "cancelled"),
  ])

  const { data: properties } = await admin
    .from("properties")
    .select(`*, client:users!properties_client_id_fkey(full_name, email, phone)`)
    .eq("status", activeTab)
    .order("created_at", { ascending: false })

  const propertyIds = properties?.map(p => p.id) ?? []
  const { data: unreadMessages } = propertyIds.length
    ? await admin
        .from("messages")
        .select("property_id")
        .in("property_id", propertyIds)
        .neq("sender_id", user.id)
        .eq("is_read", false)
    : { data: [] }

  const unreadByProperty: Record<string, number> = {}
  unreadMessages?.forEach(m => {
    unreadByProperty[m.property_id] = (unreadByProperty[m.property_id] ?? 0) + 1
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#0F1B2D] dark:text-white">
            Properties
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {properties?.length ?? 0} {activeTab} {properties?.length === 1 ? "property" : "properties"}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/properties/new">
            <Plus className="h-4 w-4" />
            Add Property
          </Link>
        </Button>
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 w-fit">
        {[
          { label: "Active", value: "active", count: activeCount ?? 0 },
          { label: "Paused", value: "paused", count: pausedCount ?? 0 },
          { label: "Cancelled", value: "cancelled", count: cancelledCount ?? 0 },
        ].map(tab => (
          <Link
            key={tab.value}
            href={tab.value === "active" ? "/dashboard/properties" : `/dashboard/properties?status=${tab.value}`}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-white dark:bg-slate-900 text-[#0F1B2D] dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
              activeTab === tab.value
                ? "bg-[#C9A96E]/15 text-[#C9A96E]"
                : "bg-slate-200 dark:bg-slate-700 text-slate-500"
            }`}>
              {tab.count}
            </span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {properties?.map((property) => {
          const client = (property as any).client
          return (
            <Link key={property.id} href={`/dashboard/properties/${property.id}`}>
              <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                {/* Property photo or gradient header */}
                <div className="h-32 rounded-t-lg overflow-hidden relative">
                  {property.cover_photo_url ? (
                    <img
                      src={property.cover_photo_url}
                      alt={property.address}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <PropertyPlaceholder />
                  )}
                  <div className="absolute top-3 right-3">
                    <StatusBadge status={property.status} />
                  </div>
                </div>

                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#0F1B2D] dark:text-white leading-snug truncate">
                        {property.address}
                      </p>
                      <p className="flex items-center gap-1 mt-0.5 text-sm text-slate-500">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {property.city}, {property.state} {property.zip}
                      </p>
                    </div>
                    <HealthScoreGauge score={property.health_score} size="sm" showLabel={false} />
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Client</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {client?.full_name ?? "Unassigned"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex gap-1.5 items-center">
                      {property.onboarding_status !== "complete" && (
                        <Badge variant="warning" className="text-xs">
                          Onboarding
                        </Badge>
                      )}
                      {(unreadByProperty[property.id] ?? 0) > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-[#C9A96E]/15 px-2 py-0.5 text-xs font-semibold text-[#C9A96E]">
                          <MessageSquare className="h-3 w-3" />
                          {unreadByProperty[property.id]}
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-[#C9A96E]">
                      View details <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
