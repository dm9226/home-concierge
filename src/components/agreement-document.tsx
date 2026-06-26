// Presentational rendering of a membership agreement -- a clean "paper"
// document with a titled header, parties block, and typeset clauses.
// Used on the homeowner portal and as the admin preview. Pure display.

interface Parties {
  ownerName: string
  address: string
  planLabel: string
  feeLabel: string
}

interface Clause {
  num?: string
  heading?: string
  text: string
}

// Split the free-text body into blocks (by blank lines). If a block looks like
// "N. Heading. body...", pull out the number + heading for emphasis; otherwise
// render it as a plain paragraph. Degrades gracefully for arbitrary pasted text.
function parseClauses(body: string): Clause[] {
  return body
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean)
    .map(block => {
      const m = block.match(/^(\d+)\.\s+([^.\n]{2,60})\.\s+([\s\S]+)$/)
      if (m) return { num: m[1], heading: m[2], text: m[3].trim() }
      return { text: block }
    })
}

export function AgreementDocument({
  title, parties, body, effectiveLabel,
}: {
  title: string
  parties: Parties
  body: string
  effectiveLabel?: string
}) {
  const clauses = parseClauses(body)

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Letterhead */}
      <div className="bg-[#0F1B2D] px-6 py-6 text-center sm:px-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C9A96E]">Carefree Casa</p>
        <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl mt-1">{title}</h1>
      </div>

      <div className="px-6 py-8 sm:px-10 sm:py-10">
        {/* Parties */}
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-slate-200/80 bg-slate-50 p-4 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-800/40">
          <Field label="Member" value={parties.ownerName || "--"} />
          <Field label="Property" value={parties.address} />
          <Field label="Plan" value={`${parties.planLabel} · ${parties.feeLabel}`} />
          <Field label="Effective" value={effectiveLabel ?? "Upon acceptance"} />
        </dl>

        {/* Clauses */}
        <div className="mt-8 space-y-6">
          {clauses.map((c, i) => (
            <section key={i}>
              {c.heading && (
                <h2 className="font-display text-base font-semibold text-[#0F1B2D] dark:text-white">
                  {c.num && <span className="text-[#C9A96E]">{c.num}.</span>} {c.heading}
                </h2>
              )}
              <p className="mt-1 whitespace-pre-wrap text-[15px] leading-7 text-slate-600 dark:text-slate-300">
                {c.text}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-[#0F1B2D] dark:text-white">{value}</dd>
    </div>
  )
}
