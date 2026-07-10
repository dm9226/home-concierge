// Presentational rendering of a membership agreement -- a clean "paper"
// document: titled letterhead, parties block, and typeset terms. Renders a
// markdown-lite body (## headings, - bullets, **bold**) and degrades
// gracefully to plain paragraphs for arbitrary text. Pure display.

import React from "react"

interface PartyField {
  label: string
  value: string
}

type Block =
  | { type: "heading"; num?: string; title: string }
  | { type: "para"; text: string }
  | { type: "list"; items: string[] }

function parseBody(body: string): Block[] {
  const lines = body.replace(/\r/g, "").split("\n")
  const blocks: Block[] = []
  let para: string[] = []
  let list: string[] | null = null
  const flushPara = () => { if (para.length) { blocks.push({ type: "para", text: para.join(" ") }); para = [] } }
  const flushList = () => { if (list) { blocks.push({ type: "list", items: list }); list = null } }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { flushPara(); flushList(); continue }
    const h = line.match(/^#{1,6}\s+(.+)$/)
    if (h) {
      flushPara(); flushList()
      const m = h[1].match(/^(\d+(?:\.\d+)?)\.?\s+(.+)$/)
      blocks.push(m ? { type: "heading", num: m[1], title: m[2] } : { type: "heading", title: h[1] })
      continue
    }
    const b = line.match(/^[-•]\s+(.+)$/)
    if (b) { flushPara(); if (!list) list = []; list.push(b[1]); continue }
    flushList(); para.push(line)
  }
  flushPara(); flushList()
  return blocks
}

// Bold spans on **...**; React escapes text so this is XSS-safe.
function renderInline(text: string, k: string): React.ReactNode[] {
  return text.split(/\*\*/).map((p, i) =>
    i % 2 === 1
      ? <strong key={`${k}-${i}`} className="font-medium text-[#1A2320] dark:text-white">{p}</strong>
      : <React.Fragment key={`${k}-${i}`}>{p}</React.Fragment>
  )
}

export function AgreementDocument({
  title, fields, body, effectiveLabel,
}: {
  title: string
  fields: PartyField[]
  body: string
  effectiveLabel?: string
}) {
  const blocks = parseBody(body)
  const allFields = [...fields, { label: "Effective", value: effectiveLabel ?? "Upon acceptance" }]

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Letterhead */}
      <div className="bg-[#1A2320] px-6 py-6 text-center sm:px-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#0E7C67]">Carefree Casa</p>
        <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl mt-1">{title}</h1>
      </div>

      <div className="px-6 py-8 sm:px-10 sm:py-10">
        {/* Parties */}
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-slate-200/80 bg-slate-50 p-4 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-800/40">
          {allFields.map((f, i) => <Field key={i} label={f.label} value={f.value || "--"} />)}
        </dl>

        {/* Terms */}
        <div className="mt-8 space-y-4">
          {blocks.map((block, i) => {
            if (block.type === "heading") {
              return (
                <h2 key={i} className="font-display text-base font-semibold text-[#1A2320] dark:text-white pt-3">
                  {block.num && <span className="text-[#0E7C67]">{block.num}.</span>} {block.title}
                </h2>
              )
            }
            if (block.type === "list") {
              return (
                <ul key={i} className="space-y-2 pl-1">
                  {block.items.map((item, j) => (
                    <li key={j} className="flex gap-2.5 text-[15px] leading-7 text-slate-600 dark:text-slate-300">
                      <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-[#0E7C67]" />
                      <span>{renderInline(item, `${i}-${j}`)}</span>
                    </li>
                  ))}
                </ul>
              )
            }
            return (
              <p key={i} className="text-[15px] leading-7 text-slate-600 dark:text-slate-300">
                {renderInline(block.text, String(i))}
              </p>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-[#1A2320] dark:text-white">{value}</dd>
    </div>
  )
}
