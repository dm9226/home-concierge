import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, Phone, Mail, Building2 } from "lucide-react"
import { AddVendorDialog } from "./add-vendor-dialog"

const STATUS_COLORS: Record<string, string> = {
  preferred: "bg-emerald-100 text-emerald-700 border-emerald-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  probationary: "bg-amber-100 text-amber-700 border-amber-200",
  blacklisted: "bg-red-100 text-red-700 border-red-200",
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-slate-400">Not rated</span>
  const stars = Math.round(rating)
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < stars ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
        />
      ))}
      <span className="text-xs text-slate-500 ml-1">{rating.toFixed(1)}</span>
    </div>
  )
}

export default async function VendorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()

  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") redirect("/portal")

  const { data: vendors } = await admin
    .from("vendors")
    .select("*")
    .neq("status", "blacklisted")
    .order("company_name", { ascending: true })

  // Group by first specialty category
  const byCategory: Record<string, typeof vendors> = {}
  vendors?.forEach(v => {
    const cat = v.specialty_categories?.[0] ?? "General"
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat]!.push(v)
  })

  const categoriesSorted = Object.keys(byCategory).sort()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-[#1A2320] dark:text-white">Vendors</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">{vendors?.length ?? 0} vendors</span>
          <AddVendorDialog />
        </div>
      </div>

      {categoriesSorted.map(category => (
        <section key={category}>
          <h2 className="font-semibold text-[#1A2320] dark:text-white mb-3 capitalize">
            {category}
            <span className="ml-2 text-sm font-normal text-slate-500">({byCategory[category]?.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {byCategory[category]?.map(vendor => (
              <Link key={vendor.id} href={`/dashboard/vendors/${vendor.id}`}>
                <Card className="hover:shadow-md transition-all h-full">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                        <Building2 className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-[#1A2320] dark:text-white truncate">{vendor.company_name}</p>
                          <Badge className={`text-xs ${STATUS_COLORS[vendor.status] ?? ""}`}>{vendor.status}</Badge>
                        </div>
                        {vendor.contact_name && (
                          <p className="text-sm text-slate-500 truncate">{vendor.contact_name}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <StarRating rating={vendor.rating} />
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          {vendor.phone && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Phone className="h-3 w-3" />
                              {vendor.phone}
                            </span>
                          )}
                          {vendor.email && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Mail className="h-3 w-3" />
                              Email
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {!vendors?.length && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-12 w-12 text-slate-300 mb-3" />
          <h2 className="font-display text-xl font-semibold text-[#1A2320] mb-4">No vendors yet</h2>
          <AddVendorDialog />
        </div>
      )}
    </div>
  )
}
