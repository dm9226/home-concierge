import { createAdminClient } from "@/lib/supabase/admin"
import { AgreementDocument } from "@/components/agreement-document"
import { VendorSignClient } from "./sign-client"
import { CheckCircle2, FileX } from "lucide-react"

export default async function VendorSignPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: ag } = await admin
    .from("vendor_agreements")
    .select("id, status, title, body, signer_name, accepted_at, accepted_snapshot, access_token, vendor:vendors(company_name, specialty_categories)")
    .eq("access_token", token)
    .maybeSingle()

  const vendor = (ag as any)?.vendor
  const fields = [
    { label: "Vendor", value: vendor?.company_name ?? "--" },
    { label: "Trade", value: (vendor?.specialty_categories ?? []).join(", ") || "--" },
    { label: "Partner", value: "Carefree Casa" },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a1628] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {!ag || ag.status === "void" ? (
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-10 text-center">
            <FileX className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="font-display text-lg font-semibold text-[#0F1B2D] dark:text-white">Agreement not available</p>
            <p className="text-sm text-slate-500 mt-1">This link is invalid or the agreement is no longer active. Contact Carefree Casa for a new link.</p>
          </div>
        ) : (
          <>
            <AgreementDocument
              title={ag.title}
              fields={fields}
              body={ag.status === "accepted" && (ag as any).accepted_snapshot ? (ag as any).accepted_snapshot : ag.body}
              effectiveLabel={ag.status === "accepted" && ag.accepted_at
                ? `Executed ${new Date(ag.accepted_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
                : undefined}
            />

            <div className="mt-4">
              {ag.status === "accepted" ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-5 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">
                    Executed by <span className="font-semibold">{ag.signer_name}</span>
                    {ag.accepted_at ? ` on ${new Date(ag.accepted_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}` : ""}. A copy has been recorded by Carefree Casa.
                  </p>
                </div>
              ) : (
                <VendorSignClient token={ag.access_token} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
