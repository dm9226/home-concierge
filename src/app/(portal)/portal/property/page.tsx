import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { PropertyMap } from "@/components/property-map"
import { MarketStatsCard } from "@/components/market-stats-card"
import { RecommendationsClient } from "./recommendations-client"
import { AgreementClient } from "./agreement-client"
import { planLabel } from "@/lib/agreement"
import { formatCurrency, formatDateShort, getDaysUntil } from "@/lib/utils"
import {
  Home, Calendar, MapPin, CheckCircle2, AlertCircle,
  XCircle, Shield, Wrench, Package, Clock,
  Activity, ClipboardCheck, RotateCw, FileText, Download,
} from "lucide-react"

export default async function PortalPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { id: requestedId, tab: requestedTab } = await searchParams

  const { data: ownerships } = await supabase
    .from("property_owners")
    .select("property_id")
    .eq("user_id", user.id)

  const propertyIds = ownerships?.map(o => o.property_id) ?? []
  if (propertyIds.length === 0) redirect("/portal")

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .in("id", propertyIds)
    .eq("status", "active")
    .order("created_at", { ascending: true })

  if (!properties || properties.length === 0) redirect("/portal")

  const property = (requestedId ? properties.find(p => p.id === requestedId) : null) ?? properties[0]
  const propertyId = property.id

  const [
    { data: assets },
    { data: completedWork },
    { data: maintenance },
    { data: inspectionRows },
    { data: recurringServices },
    { data: onboarding },
    { data: propertyFiles },
    { data: recommendationRows },
    { data: agreement },
    { data: ownerProfile },
  ] = await Promise.all([
    supabase
      .from("assets")
      .select("id, name, brand, model, category, install_date, warranty_expiration, expected_lifespan_years, location_in_home, status, last_serviced_date")
      .eq("property_id", propertyId)
      .eq("status", "active")
      .order("category"),

    supabase
      .from("work_orders")
      .select("id, title, category, status, completed_date, created_at, scheduled_date, description, is_emergency, client_cost")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(50),

    supabase
      .from("maintenance_schedules")
      .select("id, title, frequency, next_due, last_completed, estimated_cost")
      .eq("property_id", propertyId)
      .eq("is_active", true)
      .order("next_due", { ascending: true })
      .limit(5),

    supabase
      .from("property_inspections")
      .select("id, type, inspection_date, status")
      .eq("property_id", propertyId)
      .eq("status", "complete")
      .order("inspection_date", { ascending: false })
      .limit(1),

    supabase
      .from("recurring_services")
      .select("id, service_type, company_name, frequency, schedule, phone")
      .eq("property_id", propertyId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),

    // Only non-sensitive onboarding fields (no access codes / passwords)
    supabase
      .from("property_onboarding")
      .select("utility_providers, hoa_name, hoa_contact_phone, hoa_contact_email, emergency_contacts")
      .eq("property_id", propertyId)
      .maybeSingle(),

    supabase
      .from("property_files")
      .select("id, kind, category, name, created_at")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false }),

    supabase
      .from("recommendations")
      .select("id, title, description, rec_type, priority, status, estimated_cost, created_at")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false }),

    supabase
      .from("service_agreements")
      .select("id, status, title, body, signer_name, accepted_at")
      .eq("property_id", propertyId)
      .maybeSingle(),

    supabase
      .from("users")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
  ])

  // --- Home Health: latest completed inspection rollup ---
  const latestInspection = inspectionRows?.[0] ?? null
  let inspectionFindings: {
    section: string; item_label: string
    condition: string | null; notes: string | null; flagged: boolean
  }[] = []
  if (latestInspection) {
    const { data } = await supabase
      .from("inspection_findings")
      .select("section, item_label, condition, notes, flagged")
      .eq("inspection_id", latestInspection.id)
    inspectionFindings = data ?? []
  }

  const conditionRank: Record<string, number> = { poor: 3, fair: 2, good: 1, na: 0 }

  // Worst condition per section (na ignored)
  const sectionHealth = Object.values(
    inspectionFindings.reduce((acc, f) => {
      if (!f.condition || f.condition === "na") return acc
      const rank = conditionRank[f.condition] ?? 0
      const existing = acc[f.section]
      if (!existing || rank > existing.rank) {
        acc[f.section] = { section: f.section, condition: f.condition, rank }
      }
      return acc
    }, {} as Record<string, { section: string; condition: string; rank: number }>)
  ).sort((a, b) => sectionSortRank(a.section) - sectionSortRank(b.section))

  // Prioritized recommendations: flagged or poor items, worst first
  const recommendations = inspectionFindings
    .filter(f => f.flagged || f.condition === "poor")
    .sort((a, b) => (conditionRank[b.condition ?? ""] ?? 0) - (conditionRank[a.condition ?? ""] ?? 0))

  const poorCount = inspectionFindings.filter(f => f.condition === "poor").length
  const fairCount = inspectionFindings.filter(f => f.condition === "fair").length
  const healthHeadline =
    poorCount > 0 ? { label: "Needs Attention", color: "text-red-600", dot: "bg-red-500" } :
    fairCount > 0 ? { label: "Good", color: "text-amber-600", dot: "bg-amber-500" } :
    { label: "Excellent", color: "text-emerald-600", dot: "bg-emerald-500" }

  // --- Home details (non-sensitive onboarding info) ---
  const utilities = Array.isArray(onboarding?.utility_providers)
    ? (onboarding!.utility_providers as { type?: string; company?: string }[])
    : []
  const emergencyContacts = Array.isArray(onboarding?.emergency_contacts)
    ? (onboarding!.emergency_contacts as { name?: string; relationship?: string; phone?: string }[])
    : []
  const hasHomeDetails = utilities.length > 0 || emergencyContacts.length > 0 || !!onboarding?.hoa_name

  const clientDocuments = (propertyFiles ?? []).filter(f => f.kind === "document")
  const clientPhotos = (propertyFiles ?? []).filter(f => f.kind === "photo")
  const hasFiles = clientDocuments.length > 0 || clientPhotos.length > 0

  const recs = recommendationRows ?? []
  const pendingRecCount = recs.filter(r => r.status === "pending" || r.status === "deferred").length

  // Service agreement: only surfaced to the client once sent (or accepted)
  const showAgreement = !!agreement && (agreement.status === "sent" || agreement.status === "accepted")
  const agreementPending = !!agreement && agreement.status === "sent"
  const agreementParties = {
    ownerName: ownerProfile?.full_name ?? "",
    address: `${property.address}, ${property.city}, ${property.state} ${property.zip}`,
    planLabel: planLabel((property as any).plan_tier),
    feeLabel: `${formatCurrency(property.fee_amount)}/${property.billing_period === "annually" ? "yr" : property.billing_period === "quarterly" ? "qtr" : "mo"}`,
  }

  const assetsByCategory = (assets ?? []).reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = []
    acc[a.category].push(a)
    return acc
  }, {} as Record<string, any[]>)

  const categoryLabels: Record<string, string> = {
    hvac: "HVAC", plumbing: "Plumbing", electrical: "Electrical",
    appliance: "Appliances", roofing: "Roofing", exterior: "Exterior",
    pool: "Pool", landscaping: "Landscaping", smart_home: "Smart Home",
    security: "Security", other: "Other",
  }

  const openWork = completedWork?.filter(wo => !["completed", "cancelled"].includes(wo.status)) ?? []
  const doneWork = completedWork?.filter(wo => wo.status === "completed") ?? []

  const expiringWarranties = (assets ?? [])
    .filter(a => {
      if (!a.warranty_expiration) return false
      const d = getDaysUntil(a.warranty_expiration)
      return d !== null && d >= 0 && d <= 365
    })
    .sort((a, b) => getDaysUntil(a.warranty_expiration!)! - getDaysUntil(b.warranty_expiration!)!)

  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zip}`

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-[#1A2320] dark:text-white">{property.address}</h1>
        <p className="text-slate-500 flex items-center gap-1.5 mt-0.5">
          <MapPin className="h-3.5 w-3.5" />
          {property.city}, {property.state} {property.zip}
        </p>
      </div>

      <Tabs defaultValue={requestedTab ?? "overview"}>
        <TabsList className="w-full mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">
            Home Health
            {(recommendations.length + expiringWarranties.length) > 0 && (
              <span className="ml-1.5 h-4 min-w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {recommendations.length + expiringWarranties.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            Recommendations
            {pendingRecCount > 0 && (
              <span className="ml-1.5 h-4 min-w-4 rounded-full bg-[#0E7C67] text-white text-[10px] font-bold flex items-center justify-center px-1">
                {pendingRecCount}
              </span>
            )}
          </TabsTrigger>
          {showAgreement && (
            <TabsTrigger value="agreement">
              Agreement
              {agreementPending && (
                <span className="ml-1.5 h-4 min-w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">1</span>
              )}
            </TabsTrigger>
          )}
          {hasFiles && <TabsTrigger value="documents">Documents</TabsTrigger>}
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ──────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4">
          <PropertyMap
            address={fullAddress}
            latitude={property.latitude ? Number(property.latitude) : null}
            longitude={property.longitude ? Number(property.longitude) : null}
            className="h-52 rounded-2xl overflow-hidden"
          />

          {/* Property specs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Home className="h-4 w-4 text-[#0E7C67]" />
                Your Home
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {property.property_type && (
                <Row label="Type" value={property.property_type.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} />
              )}
              {property.year_built && <Row label="Year Built" value={String(property.year_built)} />}
              {property.square_footage && (
                <Row label="Size" value={`${property.square_footage.toLocaleString()} sq ft`} />
              )}
              {property.lot_size && <Row label="Lot Size" value={property.lot_size} />}
              <Row label="Managed Since" value={property.contract_start_date ? formatDateShort(property.contract_start_date) : "Active"} />
            </CardContent>
          </Card>

          {/* Market data */}
          {property.market_data && (
            <MarketStatsCard
              marketData={property.market_data as Record<string, any>}
              zipCode={property.zip}
            />
          )}

          {/* Maintenance snapshot */}
          {maintenance && maintenance.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#0E7C67]" />
                  Upcoming Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {maintenance.map(item => {
                  const days = item.next_due ? getDaysUntil(item.next_due) : null
                  const isOverdue = days !== null && days < 0
                  return (
                    <div key={item.id} className="flex items-center justify-between text-sm gap-3">
                      <span className="text-[#1A2320] dark:text-white truncate">{item.title}</span>
                      <span className={`shrink-0 text-xs font-medium ${isOverdue ? "text-red-500" : days !== null && days <= 14 ? "text-amber-500" : "text-slate-400"}`}>
                        {isOverdue ? `${Math.abs(days!)}d overdue` : days === 0 ? "Today" : days !== null ? `in ${days}d` : item.next_due ? formatDateShort(item.next_due) : "Scheduled"}
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Recurring services */}
          {recurringServices && recurringServices.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <RotateCw className="h-4 w-4 text-[#0E7C67]" />
                  Who Takes Care of Your Home
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recurringServices.map(s => (
                  <div key={s.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1A2320] dark:text-white">{s.service_type}</p>
                      {(s.company_name || s.schedule) && (
                        <p className="text-xs text-slate-500">
                          {s.company_name}{s.company_name && s.schedule ? " · " : ""}{s.schedule}
                        </p>
                      )}
                    </div>
                    {s.frequency && (
                      <span className="shrink-0 text-xs font-medium text-slate-400">{s.frequency}</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Home details (utilities, HOA, emergency contacts) */}
          {hasHomeDetails && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#0E7C67]" />
                  Home Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {utilities.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Utilities</p>
                    <div className="space-y-1">
                      {utilities.filter(u => u.company).map((u, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-slate-500">{u.type}</span>
                          <span className="font-medium text-[#1A2320] dark:text-white">{u.company}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {onboarding?.hoa_name && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">HOA</p>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{onboarding.hoa_name}</span>
                      {onboarding.hoa_contact_phone && (
                        <span className="font-medium text-[#1A2320] dark:text-white">{onboarding.hoa_contact_phone}</span>
                      )}
                    </div>
                  </div>
                )}
                {emergencyContacts.filter(c => c.name).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Emergency Contacts</p>
                    <div className="space-y-1">
                      {emergencyContacts.filter(c => c.name).map((c, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-slate-500">{c.name}{c.relationship ? ` (${c.relationship})` : ""}</span>
                          {c.phone && <span className="font-medium text-[#1A2320] dark:text-white">{c.phone}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Active work */}
          {openWork.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-[#0E7C67]" />
                  Active Service ({openWork.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {openWork.map(wo => (
                  <div key={wo.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[#1A2320] dark:text-white truncate">{wo.title}</span>
                    <StatusBadge status={wo.status} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── HOME HEALTH (condition + systems inventory) ─────────────── */}
        <TabsContent value="health" className="space-y-6">
          {/* Condition from latest inspection */}
          {latestInspection ? (
            <div className="space-y-4">
              {/* Headline */}
              <Card>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Overall Home Health</p>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${healthHeadline.dot}`} />
                        <span className={`font-display text-xl font-semibold ${healthHeadline.color}`}>{healthHeadline.label}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p className="capitalize">{latestInspection.type} inspection</p>
                      <p>{formatDateShort(latestInspection.inspection_date)}</p>
                    </div>
                  </div>
                  {(poorCount > 0 || fairCount > 0) && (
                    <div className="flex gap-4 mt-4 text-sm">
                      {poorCount > 0 && (
                        <span className="flex items-center gap-1.5 text-red-600">
                          <XCircle className="h-4 w-4" /> {poorCount} need{poorCount === 1 ? "s" : ""} attention
                        </span>
                      )}
                      {fairCount > 0 && (
                        <span className="flex items-center gap-1.5 text-amber-600">
                          <AlertCircle className="h-4 w-4" /> {fairCount} to monitor
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Systems at a glance */}
              {sectionHealth.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4 text-[#0E7C67]" />
                      Systems at a Glance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2.5">
                      {sectionHealth.map(s => {
                        const disp = CONDITION_DISPLAY[s.condition]
                        return (
                          <div key={s.section} className="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-800 px-3 py-2">
                            <span className="text-sm text-[#1A2320] dark:text-white truncate">{humanizeSection(s.section)}</span>
                            <span className="flex items-center gap-1.5 shrink-0">
                              <span className={`h-2 w-2 rounded-full ${disp.dot}`} />
                              <span className={`text-xs font-medium ${disp.text}`}>{disp.label}</span>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Items flagged during the walkthrough */}
              {recommendations.length > 0 && (
                <div>
                  <h2 className="font-semibold text-[#1A2320] dark:text-white mb-3 flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-[#0E7C67]" />
                    Flagged During Inspection ({recommendations.length})
                  </h2>
                  <div className="space-y-2.5">
                    {recommendations.map((f, i) => {
                      const isPoor = f.condition === "poor"
                      return (
                        <Card key={i} className={isPoor ? "border-red-200" : "border-amber-200"}>
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-start gap-2.5">
                              {isPoor
                                ? <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                : <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                              <div className="min-w-0">
                                <p className="font-medium text-[#1A2320] dark:text-white text-sm">{f.item_label}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{humanizeSection(f.section)}</p>
                                {f.notes && (
                                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5">{f.notes}</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}

              {recommendations.length === 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">Everything looks good. No issues flagged in your most recent inspection.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardCheck className="h-12 w-12 text-slate-300 mb-3" />
              <p className="font-medium text-slate-500">No inspection completed yet</p>
              <p className="text-sm text-slate-400 mt-1">After your first home walkthrough, your condition report will appear here.</p>
            </div>
          )}

          {/* Equipment & systems inventory */}
          {expiringWarranties.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2">
                Warranties Expiring Within 12 Months
              </p>
              {expiringWarranties.map(a => {
                const days = getDaysUntil(a.warranty_expiration!)!
                return (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-amber-900 dark:text-amber-200">{a.name}</span>
                    <span className="text-amber-700 dark:text-amber-400 text-xs">
                      {days === 0 ? "Expires today" : `${days}d left`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {Object.keys(assetsByCategory).length > 0 && (
            <h2 className="font-semibold text-[#1A2320] dark:text-white pt-2 flex items-center gap-2">
              <Package className="h-4 w-4 text-[#0E7C67]" />
              Your Home Systems &amp; Equipment
            </h2>
          )}

          {Object.entries(assetsByCategory).map(([category, items]) => (
            <div key={category}>
              <h3 className="font-semibold text-sm text-[#1A2320] dark:text-white mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#0E7C67]" />
                {categoryLabels[category] ?? category}
              </h3>
              <div className="space-y-3">
                {items.map((asset: any) => {
                  const warrantyDays = asset.warranty_expiration ? getDaysUntil(asset.warranty_expiration) : null
                  const warrantyExpired = warrantyDays !== null && warrantyDays < 0
                  const warrantySoon = warrantyDays !== null && warrantyDays >= 0 && warrantyDays <= 90

                  const ageDate = asset.install_date
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
                    <Card key={asset.id} className={warrantyExpired ? "border-red-200" : warrantySoon ? "border-amber-200" : ""}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#1A2320] dark:text-white">{asset.name}</p>
                            {asset.brand && (
                              <p className="text-sm text-slate-500">{asset.brand}{asset.model ? ` ${asset.model}` : ""}</p>
                            )}
                          </div>
                          {warrantyExpired && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                          {!warrantyExpired && warrantySoon && <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
                          {!warrantyExpired && !warrantySoon && warrantyDays !== null && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                        </div>

                        {lifespanPct !== null && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span>{Math.round(ageYears!)} of {asset.expected_lifespan_years} yr lifespan</span>
                              <span className={lifespanPct >= 90 ? "text-red-500 font-medium" : lifespanPct >= 70 ? "text-amber-500 font-medium" : "text-emerald-600"}>
                                {lifespanPct}% used
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100">
                              <div className={`h-full rounded-full ${ageBarColor}`} style={{ width: `${lifespanPct}%` }} />
                            </div>
                          </div>
                        )}

                        <div className="mt-3 space-y-1 text-xs text-slate-500">
                          {asset.location_in_home && (
                            <div className="flex gap-1.5">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>{asset.location_in_home}</span>
                            </div>
                          )}
                          {asset.install_date && (
                            <div className="flex gap-1.5">
                              <Calendar className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>Installed {formatDateShort(asset.install_date)}</span>
                            </div>
                          )}
                          {asset.warranty_expiration && (
                            <div className="flex gap-1.5">
                              <Shield className="h-3 w-3 mt-0.5 shrink-0" />
                              <span className={warrantyExpired ? "text-red-600 font-medium" : warrantySoon ? "text-amber-600 font-medium" : "text-emerald-600"}>
                                {warrantyExpired
                                  ? `Warranty expired ${Math.abs(warrantyDays!)}d ago`
                                  : warrantyDays! > 365
                                  ? `Warranty valid ${Math.floor(warrantyDays! / 365)}yr ${Math.floor((warrantyDays! % 365) / 30)}mo`
                                  : `Warranty expires in ${warrantyDays}d`}
                              </span>
                            </div>
                          )}
                          {asset.last_serviced_date && (
                            <div className="flex gap-1.5">
                              <Wrench className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>Last serviced {formatDateShort(asset.last_serviced_date)}</span>
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
        </TabsContent>

        {/* ── AGREEMENT ───────────────────────────────────────────────── */}
        {showAgreement && agreement && (
          <TabsContent value="agreement">
            <AgreementClient agreement={agreement} parties={agreementParties} />
          </TabsContent>
        )}

        {/* ── RECOMMENDATIONS ─────────────────────────────────────────── */}
        <TabsContent value="recommendations">
          <RecommendationsClient recommendations={recs} />
        </TabsContent>

        {/* ── DOCUMENTS ───────────────────────────────────────────────── */}
        {hasFiles && (
          <TabsContent value="documents" className="space-y-6">
            {clientDocuments.length > 0 && (
              <div>
                <h2 className="font-semibold text-[#1A2320] dark:text-white mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#0E7C67]" />
                  Documents
                </h2>
                <div className="space-y-2">
                  {clientDocuments.map(f => (
                    <a
                      key={f.id}
                      href={`/api/files/${f.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 hover:shadow-md transition-all"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                        <FileText className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-[#1A2320] dark:text-white truncate">{f.name}</p>
                        <p className="text-xs text-slate-400">{f.category}{f.category ? " · " : ""}{formatDateShort(f.created_at)}</p>
                      </div>
                      <Download className="h-4 w-4 text-slate-400 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {clientPhotos.length > 0 && (
              <div>
                <h2 className="font-semibold text-[#1A2320] dark:text-white mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#0E7C67]" />
                  Photos
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {clientPhotos.map(f => (
                    <a key={f.id} href={`/api/files/${f.id}`} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/files/${f.id}`} alt={f.name} className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        )}


        {/* ── HISTORY ─────────────────────────────────────────────────── */}
        <TabsContent value="history" className="space-y-4">
          {doneWork.length === 0 && openWork.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="h-12 w-12 text-slate-300 mb-3" />
              <p className="font-medium text-slate-500">No service history yet</p>
              <p className="text-sm text-slate-400 mt-1">Completed work orders will be logged here as your team takes care of your home.</p>
            </div>
          ) : (
            <>
              {openWork.length > 0 && (
                <div>
                  <h2 className="font-semibold text-[#1A2320] dark:text-white mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    In Progress
                  </h2>
                  <div className="space-y-2">
                    {openWork.map(wo => (
                      <div key={wo.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1A2320] dark:text-white text-sm">{wo.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 capitalize">{wo.category.replace("_", " ")} &bull; Submitted {formatDateShort(wo.created_at)}</p>
                        </div>
                        <StatusBadge status={wo.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {doneWork.length > 0 && (
                <div>
                  <h2 className="font-semibold text-[#1A2320] dark:text-white mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Completed ({doneWork.length})
                  </h2>
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
                    <div className="space-y-3 pl-10">
                      {doneWork.map(wo => (
                        <div key={wo.id} className="relative">
                          <div className="absolute -left-6 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#0E7C67] bg-white dark:bg-slate-900">
                            <div className="h-1.5 w-1.5 rounded-full bg-[#0E7C67]" />
                          </div>
                          <div className="rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-[#1A2320] dark:text-white text-sm">{wo.title}</p>
                              {wo.is_emergency && (
                                <span className="shrink-0 text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-medium">Emergency</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                              <span className="capitalize">{wo.category.replace("_", " ")}</span>
                              {wo.completed_date && (
                                <span>{formatDateShort(wo.completed_date)}</span>
                              )}
                              {wo.client_cost && (
                                <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(wo.client_cost)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-[#1A2320] dark:text-white capitalize">{value}</span>
    </div>
  )
}

// --- Inspection section helpers (used by the Home Health tab) ---

const SECTION_LABELS: Record<string, string> = {
  exterior: "Exterior", interior: "Interior", appliances: "Kitchen Appliances",
  hvac: "HVAC", plumbing: "Plumbing", electrical: "Electrical",
  attic: "Attic", crawl_space: "Crawl Space", pool: "Pool / Spa",
  fencing: "Fencing & Gates", guest_house: "Guest House",
}

function humanizeSection(key: string): string {
  if (SECTION_LABELS[key]) return SECTION_LABELS[key]
  // bedroom_1 -> "Bedroom 1", bathroom_2 -> "Bathroom 2"
  const m = key.match(/^(bedroom|bathroom)_(\d+)$/)
  if (m) return `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}`
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

function sectionSortRank(key: string): number {
  const order = [
    "exterior", "interior", "bedroom", "bathroom", "appliances",
    "hvac", "plumbing", "electrical", "attic", "crawl_space",
    "pool", "fencing", "guest_house",
  ]
  const base = key.replace(/_\d+$/, "")
  const idx = order.indexOf(base)
  const primary = idx === -1 ? 99 : idx
  const num = parseInt(key.match(/_(\d+)$/)?.[1] ?? "0", 10)
  return primary * 100 + num
}

const CONDITION_DISPLAY: Record<string, { label: string; dot: string; text: string }> = {
  good: { label: "Good", dot: "bg-emerald-500", text: "text-emerald-600" },
  fair: { label: "Monitor", dot: "bg-amber-500", text: "text-amber-600" },
  poor: { label: "Attention", dot: "bg-red-500", text: "text-red-600" },
}
