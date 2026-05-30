import Link from "next/link"
import { Home, Check, X, ArrowRight, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"

const PRICING = {
  proactive: {
    monthly:   { amount: 335,   label: "$335",    sub: "per month" },
    quarterly: { amount: 950,   label: "$950",    sub: "per quarter · ~$317/mo · save 5%" },
    annual:    { amount: 3000,  label: "$3,000",  sub: "per year · ~$250/mo · save 25%" },
  },
  proactive_plus: {
    monthly:   { amount: 527,   label: "$527",    sub: "per month" },
    quarterly: { amount: 1485,  label: "$1,485",  sub: "per quarter · ~$495/mo · save 6%" },
    annual:    { amount: 5500,  label: "$5,500",  sub: "per year · ~$458/mo · save 13%" },
  },
}

const FEATURES = [
  {
    section: "Core Services",
    rows: [
      { label: "Quarterly property walkthrough & Carefree Casa evaluation",      proactive: true,       plus: true },
      { label: "Maintenance report with vendor quotes & completion estimates",   proactive: true,       plus: true },
      { label: "HVAC filter replacement (each visit)",                           proactive: true,       plus: true },
      { label: "Smoke & CO detector battery check",                              proactive: true,       plus: true },
      { label: "Water pressure check & minor faucet adjustment",                 proactive: true,       plus: true },
      { label: "Loose fixture & hardware tightening",                            proactive: true,       plus: true },
      { label: "Vetted partner vendor network",                                  proactive: true,       plus: true },
      { label: "Digital home inventory & asset database",                        proactive: true,       plus: true },
      { label: "Filter & supply subscription setup",                             proactive: true,       plus: true },
    ],
  },
  {
    section: "On-Demand & Reactive Support",
    rows: [
      { label: "24-hour reactive response to unexpected issues",                 proactive: false,      plus: true },
      { label: "Reactive service instances included per quarter",                proactive: "$40 each", plus: "2 included" },
      { label: "Additional reactive instances (small jobs)",                     proactive: "$40 fee",  plus: "$100 coordination fee" },
      { label: "Additional reactive instances (large jobs)",                     proactive: "$40 fee",  plus: "$200 coordination fee" },
      { label: "Emergency supply kit delivery",                                  proactive: false,      plus: true },
    ],
  },
  {
    section: "Reporting & Annual Benefits",
    rows: [
      { label: "Year-end annual property summary report",                        proactive: false,      plus: true },
      { label: "Pest control quarterly coordination",                            proactive: "$40 fee",  plus: true },
    ],
  },
  {
    section: "Limitations (both plans)",
    rows: [
      { label: "Major construction & renovations",                               proactive: "Quoted separately", plus: "Quoted separately" },
      { label: "Vendor invoice cost for work performed",                         proactive: "Billed direct",     plus: "Billed direct" },
    ],
  },
]

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true)  return <Check className="h-4 w-4 text-emerald-500 mx-auto" />
  if (value === false) return <X className="h-4 w-4 text-slate-300 mx-auto" />
  return <span className="text-xs text-slate-500 text-center block leading-tight">{value}</span>
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>
}) {
  const { billing } = await searchParams
  const interval = (billing === "quarterly" || billing === "annual") ? billing : "monthly"

  const pro  = PRICING.proactive[interval]
  const plus = PRICING.proactive_plus[interval]

  const tabs = [
    { label: "Monthly",   value: "monthly" },
    { label: "Quarterly", value: "quarterly" },
    { label: "Annual",    value: "annual" },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[#0F1B2D]">
              <Home className="h-5 w-5 text-[#C9A96E]" />
            </div>
            <span className="font-display text-xl font-semibold text-[#0F1B2D]">Carefree Casa</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/#how-it-works" className="text-sm text-slate-600 hover:text-[#0F1B2D] transition-colors">How It Works</Link>
            <Link href="/#services" className="text-sm text-slate-600 hover:text-[#0F1B2D] transition-colors">Services</Link>
            <Link href="/plans" className="text-sm font-semibold text-[#0F1B2D]">Plans</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild size="sm"><Link href="/login">Sign in</Link></Button>
            <Button asChild size="sm" className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f]">
              <Link href="/#contact">Schedule Consultation</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="pt-20">
        {/* Hero */}
        <section className="navy-gradient py-20 text-center">
          <div className="mx-auto max-w-2xl px-6">
            <p className="text-sm font-medium uppercase tracking-widest text-[#C9A96E]">Membership Plans</p>
            <h1 className="mt-3 font-display text-5xl font-light text-white">
              Choose Your <span className="text-[#C9A96E]">Level of Care</span>
            </h1>
            <p className="mt-4 text-lg text-white/70">
              Both plans include quarterly walkthroughs, a vetted vendor network, and your complete digital home profile.
              The difference is how we handle the unexpected.
            </p>
          </div>
        </section>

        {/* Billing toggle */}
        <div className="flex justify-center py-8 bg-[#F5F0E8]">
          <div className="flex gap-1 rounded-lg bg-white border border-slate-200 p-1">
            {tabs.map(tab => (
              <Link
                key={tab.value}
                href={tab.value === "monthly" ? "/plans" : `/plans?billing=${tab.value}`}
                className={`relative rounded-md px-5 py-2 text-sm font-medium transition-colors ${
                  interval === tab.value
                    ? "bg-[#0F1B2D] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                {tab.value === "annual" && (
                  <span className="absolute -top-2 -right-2 rounded-full bg-[#C9A96E] px-1.5 py-0.5 text-[9px] font-bold text-[#0F1B2D] leading-none">BEST</span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <section className="bg-[#F5F0E8] pb-16 px-6">
          <div className="mx-auto max-w-4xl grid gap-6 sm:grid-cols-2">

            {/* Proactive */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 flex flex-col">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Plan 1</p>
                <h2 className="mt-1 font-display text-3xl font-semibold text-[#0F1B2D]">Proactive</h2>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  Quarterly walkthroughs, preventive maintenance, and proactive care. Reactive support available on demand for a small coordination fee.
                </p>
              </div>
              <div className="my-6 border-t border-slate-100 pt-6">
                <p className="font-display text-4xl font-semibold text-[#0F1B2D]">{pro.label}</p>
                <p className="mt-1 text-xs text-slate-400">{pro.sub}</p>
              </div>
              <ul className="space-y-2.5 text-sm flex-1">
                {["Quarterly property walkthrough", "Maintenance report & vendor quotes", "HVAC filter replacement", "Smoke/CO battery check", "Digital home inventory", "Filter subscription setup", "Vetted vendor network"].map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-slate-600">{f}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2.5">
                  <Minus className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                  <span className="text-slate-400">Reactive support: $40 coordination fee/request</span>
                </li>
              </ul>
              <Button asChild className="mt-8 w-full" variant="outline">
                <Link href="/#contact">Get Started</Link>
              </Button>
            </div>

            {/* Proactive + OnDemand */}
            <div className="rounded-2xl border-2 border-[#C9A96E] bg-white p-8 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-[#C9A96E] px-4 py-1 text-xs font-bold text-[#0F1B2D] uppercase tracking-wide whitespace-nowrap">Most Popular</span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#C9A96E]">Plan 2</p>
                <h2 className="mt-1 font-display text-3xl font-semibold text-[#0F1B2D]">Proactive <span className="text-[#C9A96E]">+ OnDemand</span></h2>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  Everything in Proactive, plus 24-hour reactive response, 2 included on-demand service instances per quarter, and an annual property report.
                </p>
              </div>
              <div className="my-6 border-t border-slate-100 pt-6">
                <p className="font-display text-4xl font-semibold text-[#0F1B2D]">{plus.label}</p>
                <p className="mt-1 text-xs text-slate-400">{plus.sub}</p>
              </div>
              <ul className="space-y-2.5 text-sm flex-1">
                {["Everything in Proactive", "24-hour reactive response guarantee", "2 reactive service instances/quarter included", "Emergency supply kit delivery", "Pest control quarterly coordination", "Year-end annual property report"].map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-[#C9A96E] mt-0.5 shrink-0" />
                    <span className="text-slate-600">{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8 w-full bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f]">
                <Link href="/#contact">Get Started</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Full comparison table */}
        <section className="py-16 px-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-10 text-center">
              <h2 className="font-display text-3xl font-semibold text-[#0F1B2D]">Full Comparison</h2>
              <p className="mt-2 text-sm text-slate-500">Every detail, side by side.</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_120px_120px] bg-[#0F1B2D] text-white text-sm font-medium">
                <div className="px-6 py-4">Feature</div>
                <div className="px-4 py-4 text-center border-l border-white/10">Proactive</div>
                <div className="px-4 py-4 text-center border-l border-white/10 text-[#C9A96E]">Proactive+</div>
              </div>

              {FEATURES.map((section) => (
                <div key={section.section}>
                  <div className="bg-slate-50 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-400 border-t border-slate-200">
                    {section.section}
                  </div>
                  {section.rows.map((row, i) => (
                    <div
                      key={row.label}
                      className={`grid grid-cols-[1fr_120px_120px] text-sm border-t border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                    >
                      <div className="px-6 py-3.5 text-slate-700">{row.label}</div>
                      <div className="px-4 py-3.5 border-l border-slate-100 flex items-center justify-center">
                        <FeatureValue value={row.proactive} />
                      </div>
                      <div className="px-4 py-3.5 border-l border-slate-100 flex items-center justify-center">
                        <FeatureValue value={row.plus} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-slate-400 text-center">
              All plans billed in advance. Vendor invoices for work performed are separate and billed directly.
              Major renovations and construction quoted separately regardless of plan.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="navy-gradient py-20 text-center px-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-display text-4xl font-light text-white">
              Ready to get <span className="text-[#C9A96E]">started?</span>
            </h2>
            <p className="mt-4 text-white/70">
              Schedule a private consultation and we'll recommend the right plan for your home and lifestyle.
            </p>
            <Button asChild size="xl" className="mt-8 bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f] font-semibold">
              <Link href="/#contact">
                Schedule Your Consultation
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-8">
          <div className="mx-auto max-w-4xl px-6 flex flex-col items-center justify-between gap-4 sm:flex-row text-xs text-slate-400">
            <span>2026 Carefree Casa. All rights reserved.</span>
            <div className="flex gap-4">
              <Link href="/" className="hover:text-slate-600">Home</Link>
              <Link href="/plans" className="hover:text-slate-600">Plans</Link>
              <Link href="/login" className="hover:text-slate-600">Client Portal</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
