import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HealthScoreGauge } from "@/components/health-score-gauge"
import { StatusBadge } from "@/components/status-badge"
import { formatCurrency, formatDate, formatDateShort, getDaysUntil, getWarrantyColor } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import {
  MapPin, Home, User, Phone, Mail, Calendar, Wrench,
  Package, FolderOpen, FileText, Clock, ArrowRight, Plus,
  CheckCircle2, AlertCircle, XCircle, Shield, MessageSquare
} from "lucide-react"
import { ManageOwnersPanel } from "@/components/manage-owners-panel"
import { AddAssetDialog } from "./add-asset-dialog"
import { MessageThread } from "@/app/(portal)/portal/messages/message-thread"
import { PropertyMap } from "@/components/property-map"
import { MarketStatsCard } from "@/components/market-stats-card"
import { CoverPhotoEditor } from "@/components/cover-photo-editor"
import { LoadStandardScheduleButton } from "./load-standard-schedule-button"
import { AddMaintenanceItemDialog } from "./add-maintenance-dialog"
import { MaintenanceItemCard } from "@/components/maintenance-item-card"

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const admin = createAdminClient()

  const { data: property } = await admin
    .from("properties")
    .select(`
      *,
      client:users!properties_client_id_fkey(id, full_name, email, phone, avatar_url)
    `)
    .eq("id", id)
    .single()

  if (!property) notFound()

  const [{ data: propertyOwners }, { data: availableClients }] = await Promise.all([
    admin
      .from("property_owners")
      .select("user:users(id, full_name, email, phone)")
      .eq("property_id", id),
    admin
      .from("users")
      .select("id, full_name, email, phone")
      .eq("role", "client")
      .order("full_name"),
  ])

  const owners = (propertyOwners ?? []).map((o: any) => o.user).filter(Boolean)

  const [
    { data: assets },
    { data: workOrders },
    { data: maintenance },
    { data: projects },
    { data: invoices },
    { data: activityLogs },
    { data: messages },
  ] = await Promise.all([
    admin
      .from("assets")
      .select("*")
      .eq("property_id", id)
      .eq("status", "active")
      .order("category"),
    admin
      .from("work_orders")
      .select("*, vendor:vendors(company_name)")
      .eq("property_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("maintenance_schedules")
      .select("*")
      .eq("property_id", id)
      .eq("is_active", true)
      .order("next_due", { ascending: true }),
    admin
      .from("projects")
      .select("*, project_tasks(*)")
      .eq("property_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("invoices")
      .select("*")
      .eq("property_id", id)
      .order("created_at", { ascending: false })
      .limit(12),
    admin
      .from("activity_logs")
      .select("*, user:users(full_name)")
      .eq("property_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("messages")
      .select("*")
      .eq("property_id", id)
      .order("created_at", { ascending: true })
      .limit(100),
  ])

  const client = (property as any).client

  const overdueMaintenanceCount =
    maintenance?.filter(
      (m) => m.next_due && new Date(m.next_due) < new Date()
    ).length ?? 0

  const openWorkOrderCount =
    workOrders?.filter(
      (wo) => !["completed", "cancelled"].includes(wo.status)
    ).length ?? 0

  const unreadMessageCount =
    messages?.filter((m) => m.sender_id !== user.id && !m.is_read).length ?? 0

  // Mark client messages as read
  if (unreadMessageCount > 0) {
    admin
      .from("messages")
      .update({ is_read: true })
      .eq("property_id", id)
      .neq("sender_id", user.id)
      .eq("is_read", false)
      .then(() => {})
  }

  // Group assets by category
  const assetsByCategory = (assets ?? []).reduce(
    (acc, asset) => {
      if (!acc[asset.category]) acc[asset.category] = []
      acc[asset.category].push(asset)
      return acc
    },
    {} as Record<string, NonNullable<typeof assets>>
  )

  const categoryLabels: Record<string, string> = {
    hvac: "HVAC",
    plumbing: "Plumbing",
    electrical: "Electrical",
    appliance: "Appliances",
    roofing: "Roofing",
    exterior: "Exterior",
    pool: "Pool",
    landscaping: "Landscaping",
    smart_home: "Smart Home",
    security: "Security",
    other: "Other",
  }

  return (
    <div className="space-y-6">
      {/* Property Header */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
        <CoverPhotoEditor
          propertyId={property.id}
          coverPhotoUrl={property.cover_photo_url}
          address={`${property.address}, ${property.city}, ${property.state} ${property.zip}`}
          latitude={property.latitude ? Number(property.latitude) : null}
          longitude={property.longitude ? Number(property.longitude) : null}
          canEdit
          className="h-48"
        >
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold text-white">{property.address}</h1>
              <p className="flex items-center gap-1.5 text-sm text-white/80">
                <MapPin className="h-3.5 w-3.5" />
                {property.city}, {property.state} {property.zip}
              </p>
            </div>
            <StatusBadge status={property.status} className="bg-white/20 backdrop-blur-sm border-white/30 text-white" />
          </div>
        </CoverPhotoEditor>

        <div className="grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200 sm:grid-cols-2 dark:divide-slate-800 dark:border-slate-800">
          <div className="flex flex-col items-center p-4">
            <HealthScoreGauge score={property.health_score} size="sm" showLabel />
          </div>
          <div className="flex flex-col justify-center p-4">
            <ManageOwnersPanel
              propertyId={property.id}
              owners={owners}
              allClients={availableClients ?? []}
            />
          </div>
        </div>
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full overflow-x-auto scrollbar-hide">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">
            Inventory {assets && assets.length > 0 && <span className="ml-1.5 text-xs text-slate-400">({assets.length})</span>}
          </TabsTrigger>
          <TabsTrigger value="work-orders">
            Work Orders {openWorkOrderCount > 0 && (
              <Badge variant="warning" className="ml-1.5 text-xs px-1.5 py-0">
                {openWorkOrderCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            Maintenance {overdueMaintenanceCount > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-xs px-1.5 py-0">
                {overdueMaintenanceCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="messages" className="gap-1.5">
            Messages
            {unreadMessageCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C9A96E] text-white text-[10px] font-bold px-1">
                {unreadMessageCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview">
          <PropertyMap
            address={`${property.address}, ${property.city}, ${property.state} ${property.zip}`}
            latitude={property.latitude ? Number(property.latitude) : null}
            longitude={property.longitude ? Number(property.longitude) : null}
            className="h-56 mb-4"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Quick stats */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Property Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {property.year_built && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Year Built</span>
                    <span className="font-medium">{property.year_built}</span>
                  </div>
                )}
                {property.square_footage && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Size</span>
                    <span className="font-medium">{property.square_footage.toLocaleString()} sq ft</span>
                  </div>
                )}
                {property.lot_size && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lot</span>
                    <span className="font-medium">{property.lot_size}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Type</span>
                  <span className="font-medium capitalize">{property.property_type.replace("_", " ")}</span>
                </div>
              </CardContent>
            </Card>

            {property.market_data && (
              <MarketStatsCard
                marketData={property.market_data as Record<string, any>}
                zipCode={property.zip}
              />
            )}

            {/* Work order summary */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Work Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(["submitted", "in_progress", "scheduled", "completed"] as const).map((status) => {
                  const count = workOrders?.filter((wo) => wo.status === status).length ?? 0
                  return (
                    <div key={status} className="flex justify-between items-center">
                      <StatusBadge status={status} />
                      <span className="font-medium">{count}</span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Maintenance snapshot */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Next Up</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {maintenance?.slice(0, 4).map((item) => {
                  const daysUntil = item.next_due ? getDaysUntil(item.next_due) : null
                  const isOverdue = daysUntil !== null && daysUntil < 0
                  return (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-300 truncate flex-1">{item.title}</span>
                      <span className={`ml-2 shrink-0 text-xs font-medium ${isOverdue ? "text-red-500" : daysUntil && daysUntil <= 14 ? "text-amber-500" : "text-slate-400"}`}>
                        {isOverdue
                          ? `${Math.abs(daysUntil!)}d overdue`
                          : daysUntil === 0
                          ? "Today"
                          : `${daysUntil}d`}
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* INVENTORY TAB */}
        <TabsContent value="inventory">
          <div className="space-y-6">
            <div className="flex justify-end">
              <AddAssetDialog propertyId={property.id} />
            </div>

            {/* Warranty alerts */}
            {(() => {
              const expiringSoon = (assets ?? []).filter(a => {
                if (!a.warranty_expiration) return false
                const days = getDaysUntil(a.warranty_expiration)
                return days !== null && days >= 0 && days <= 90
              })
              const expired = (assets ?? []).filter(a => {
                if (!a.warranty_expiration) return false
                const days = getDaysUntil(a.warranty_expiration)
                return days !== null && days < 0
              })
              if (expiringSoon.length === 0 && expired.length === 0) return null
              return (
                <div className="space-y-2">
                  {expired.length > 0 && (
                    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <span className="font-semibold text-red-700">Warranties expired: </span>
                        <span className="text-red-600">{expired.map(a => a.name).join(", ")}</span>
                      </div>
                    </div>
                  )}
                  {expiringSoon.length > 0 && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <span className="font-semibold text-amber-700">Warranties expiring within 90 days: </span>
                        <span className="text-amber-600">{expiringSoon.map(a => `${a.name} (${getDaysUntil(a.warranty_expiration!)}d)`).join(", ")}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {Object.entries(assetsByCategory).map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-3 font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">
                  {categoryLabels[category] ?? category}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items!.map((asset) => {
                    const warrantyDays = asset.warranty_expiration ? getDaysUntil(asset.warranty_expiration) : null
                    const warrantyExpired = warrantyDays !== null && warrantyDays < 0
                    const warrantyWarningSoon = warrantyDays !== null && warrantyDays >= 0 && warrantyDays <= 90

                    // Age vs lifespan
                    const ageDate = (asset as any).manufacture_date || asset.install_date
                    const ageYears = ageDate
                      ? Math.max(0, (Date.now() - new Date(ageDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
                      : null
                    const lifespanPct = ageYears && asset.expected_lifespan_years
                      ? Math.min(100, Math.round((ageYears / asset.expected_lifespan_years) * 100))
                      : null
                    const ageBarColor = lifespanPct === null ? "" :
                      lifespanPct >= 90 ? "bg-red-500" :
                      lifespanPct >= 70 ? "bg-amber-500" : "bg-emerald-500"

                    return (
                      <Card key={asset.id} className={`hover:shadow-md transition-shadow ${warrantyExpired ? "border-red-200" : warrantyWarningSoon ? "border-amber-200" : ""}`}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[#0F1B2D] dark:text-white">{asset.name}</p>
                              {asset.brand && (
                                <p className="text-sm text-slate-500">
                                  {asset.brand}{asset.model ? ` ${asset.model}` : ""}
                                </p>
                              )}
                            </div>
                            {warrantyExpired && <XCircle className="h-4 w-4 text-red-500 shrink-0 ml-2" />}
                            {warrantyWarningSoon && <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 ml-2" />}
                            {!warrantyExpired && !warrantyWarningSoon && warrantyDays !== null && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 ml-2" />}
                          </div>

                          {/* Age vs lifespan bar */}
                          {lifespanPct !== null && (
                            <div className="mt-3">
                              <div className="flex justify-between text-xs text-slate-400 mb-1">
                                <span>{Math.round(ageYears!)} of {asset.expected_lifespan_years} yrs</span>
                                <span className={lifespanPct >= 90 ? "text-red-500 font-medium" : lifespanPct >= 70 ? "text-amber-500 font-medium" : "text-emerald-600"}>{lifespanPct}% used</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-100">
                                <div className={`h-full rounded-full transition-all ${ageBarColor}`} style={{ width: `${lifespanPct}%` }} />
                              </div>
                            </div>
                          )}

                          <div className="mt-3 space-y-1.5 text-xs">
                            {asset.location_in_home && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Location</span>
                                <span className="text-slate-600 dark:text-slate-400">{asset.location_in_home}</span>
                              </div>
                            )}
                            {(asset as any).manufacture_date && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Manufactured</span>
                                <span className="text-slate-600 dark:text-slate-400">{formatDateShort((asset as any).manufacture_date)}</span>
                              </div>
                            )}
                            {asset.install_date && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Installed</span>
                                <span className="text-slate-600 dark:text-slate-400">{formatDateShort(asset.install_date)}</span>
                              </div>
                            )}
                            {asset.warranty_expiration && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Warranty</span>
                                <span className={warrantyExpired ? "text-red-500 font-medium" : warrantyWarningSoon ? "text-amber-500 font-medium" : "text-emerald-600"}>
                                  {warrantyExpired
                                    ? `Expired ${Math.abs(warrantyDays!)}d ago`
                                    : warrantyDays! > 365
                                    ? `${Math.floor(warrantyDays! / 365)}yr ${Math.floor((warrantyDays! % 365) / 30)}mo left`
                                    : `${warrantyDays}d left`}
                                </span>
                              </div>
                            )}
                            {asset.last_serviced_date && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Last Service</span>
                                <span className="text-slate-600 dark:text-slate-400">{formatDateShort(asset.last_serviced_date)}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}

            {(!assets || assets.length === 0) && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="h-12 w-12 text-slate-300 mb-3" />
                <p className="font-medium text-slate-500">No inventory items yet</p>
                <p className="text-sm text-slate-400 mt-1">Add home systems and appliances to track warranties and service history</p>
                <div className="mt-4">
                  <AddAssetDialog propertyId={property.id} />
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* WORK ORDERS TAB */}
        <TabsContent value="work-orders">
          <div className="space-y-4">
            <div className="flex justify-between">
              <h3 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">Work Orders</h3>
              <Button size="sm">
                <Plus className="h-4 w-4" /> New Work Order
              </Button>
            </div>
            <div className="space-y-2">
              {workOrders?.map((wo) => (
                <Link
                  key={wo.id}
                  href={`/dashboard/work-orders/${wo.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-4 hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-[#0F1B2D] dark:text-white">{wo.title}</p>
                      {wo.is_emergency && <Badge variant="emergency">Emergency</Badge>}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <StatusBadge status={wo.status} />
                      <span>{(wo as any).vendor?.company_name ?? "No vendor"}</span>
                      <span>{formatDateShort(wo.created_at)}</span>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    {wo.client_cost && (
                      <span className="text-sm font-semibold text-[#0F1B2D] dark:text-white">
                        {formatCurrency(wo.client_cost)}
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              ))}
              {(!workOrders || workOrders.length === 0) && (
                <div className="py-12 text-center text-slate-500">No work orders yet</div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* MAINTENANCE TAB */}
        <TabsContent value="maintenance">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">
                Maintenance Schedule
              </h3>
              <div className="flex items-center gap-2">
                <AddMaintenanceItemDialog propertyId={property.id} />
                <LoadStandardScheduleButton propertyId={property.id} />
              </div>
            </div>
            <div className="space-y-2">
              {maintenance?.map((item) => (
                <MaintenanceItemCard key={item.id} item={item} canEditCost />
              ))}
              {(!maintenance || maintenance.length === 0) && (
                <div className="py-12 text-center space-y-3">
                  <p className="text-slate-500">No maintenance schedule yet.</p>
                  <p className="text-sm text-slate-400">Use "Load standard schedule" above to populate 26 recommended tasks automatically.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* PROJECTS TAB */}
        <TabsContent value="projects">
          <div className="space-y-4">
            <div className="flex justify-between">
              <h3 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">Projects</h3>
              <Button size="sm">
                <Plus className="h-4 w-4" /> New Project
              </Button>
            </div>
            <div className="space-y-4">
              {projects?.map((project) => {
                const tasks = (project as any).project_tasks ?? []
                const completedTasks = tasks.filter((t: any) => t.status === "completed").length
                const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

                return (
                  <Card key={project.id}>
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">
                              {project.title}
                            </h4>
                            <StatusBadge status={project.status} />
                          </div>
                          {project.description && (
                            <p className="mt-1 text-sm text-slate-500">{project.description}</p>
                          )}
                        </div>
                        {project.budget && (
                          <div className="ml-4 text-right">
                            <p className="text-sm text-slate-400">Budget</p>
                            <p className="font-semibold">{formatCurrency(project.budget)}</p>
                          </div>
                        )}
                      </div>

                      {tasks.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>Progress</span>
                            <span>{completedTasks}/{tasks.length} tasks</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[#C9A96E] transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
              {(!projects || projects.length === 0) && (
                <div className="py-12 text-center text-slate-500">No projects yet</div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TIMELINE TAB */}
        <TabsContent value="timeline">
          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">
              Property Timeline
            </h3>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-4 pl-12">
                {activityLogs?.map((log) => (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-8 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#C9A96E] bg-white dark:bg-slate-900">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#C9A96E]" />
                    </div>
                    <div className="rounded-lg border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{log.description}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <span>{formatDate(log.created_at)}</span>
                        <span>&bull;</span>
                        <span>{(log as any).user?.full_name}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!activityLogs || activityLogs.length === 0) && (
                  <div className="py-12 text-center text-slate-500">No activity yet</div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* BILLING TAB */}
        <TabsContent value="billing">
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Management Fee</p>
                    <p className="text-2xl font-bold text-[#0F1B2D] dark:text-white">
                      {formatCurrency(property.fee_amount)}
                      <span className="text-sm font-normal text-slate-500 ml-1">
                        / {property.billing_period === "annually" ? "year" : property.billing_period === "quarterly" ? "quarter" : "month"}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Annualized</p>
                    <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">
                      {formatCurrency(
                        property.fee_amount * (property.billing_period === "annually" ? 1 : property.billing_period === "quarterly" ? 4 : 12)
                      )}
                      <span className="text-sm font-normal text-slate-400 ml-1">/ yr</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <h3 className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">Invoices</h3>
              <Button size="sm">
                <Plus className="h-4 w-4" /> New Invoice
              </Button>
            </div>
            <div className="space-y-2">
              {invoices?.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <p className="font-medium text-[#0F1B2D] dark:text-white">{invoice.invoice_number}</p>
                    <p className="text-sm text-slate-500">
                      {formatDateShort(invoice.period_start)} - {formatDateShort(invoice.period_end)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-display text-lg font-semibold">{formatCurrency(invoice.total)}</span>
                    <StatusBadge status={invoice.status} />
                  </div>
                </div>
              ))}
              {(!invoices || invoices.length === 0) && (
                <div className="py-12 text-center text-slate-500">No invoices yet</div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* MESSAGES TAB */}
        <TabsContent value="messages">
          {client ? (
            <div className="flex h-[520px] flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-slate-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F1B2D] text-white text-xs font-semibold shrink-0">
                  {client.full_name.split(" ").map((n: string) => n[0]).join("")}
                </div>
                <div>
                  <p className="font-semibold text-sm text-[#0F1B2D] dark:text-white">{client.full_name}</p>
                  <p className="text-xs text-slate-500">{client.email}</p>
                </div>
              </div>
              <MessageThread
                messages={messages ?? []}
                currentUserId={user.id}
                propertyId={id}
                concierge={{ id: client.id, full_name: client.full_name }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <MessageSquare className="h-10 w-10 text-slate-300 mb-3" />
              <p className="font-medium text-slate-600 dark:text-slate-400">No owner assigned</p>
              <p className="mt-1 text-sm text-slate-400">Assign an owner to this property to enable messaging.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
