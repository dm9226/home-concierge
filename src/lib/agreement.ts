// Default membership agreement terms (current Carefree Casa draft). Staff can
// edit the body per property before sending. Marked DRAFT FOR REVIEW -- have
// counsel finalize the language before relying on it. Uses markdown-lite
// (## headings, - bullets, **bold**) rendered by AgreementDocument.

export interface AgreementParties {
  ownerName: string
  address: string
  planLabel: string
  feeLabel: string
  includedCalls: number
}

export function planLabel(tier: string | null | undefined): string {
  return tier === "proactive_plus" ? "Proactive + On-Demand" : "Proactive"
}

export function includedCalls(tier: string | null | undefined): number {
  return tier === "proactive_plus" ? 4 : 0
}

export const DEFAULT_AGREEMENT_BODY = `This Membership Agreement (this "Agreement") is between Carefree Casa [LLC] ("Carefree Casa," "we," or "us") and the member named above ("you"). It describes the services included in your membership, their scope and limits, and the terms that apply. It takes effect on the start date above, once accepted by both parties.

## 1. The service
Carefree Casa provides a home maintenance concierge service. We maintain a record of your home, perform routine and minor non-licensed tasks ourselves, and coordinate licensed, insured professionals for work beyond that scope. You approve any work and its cost before it is performed, and you remain in control of decisions about your home.

## 2. What your membership includes
Each year, your membership includes:
- An onboarding visit and **two property evaluations**, each with a written report and recommendations.
- **Hands-on upkeep at each visit:** preventive and minor tasks we perform ourselves, within the scope described in Section 3, for up to **[2] hours** of on-site labor per visit. Larger or out-of-scope work is handled as a reactive request or coordinated to a professional.
- **One reactive request per calendar quarter** for unexpected, non-emergency issues, including coordination and up to **[4] hours** of our own labor.
- A **digital home profile**: a secure online record of your home's systems, appliances, warranties, manuals, vendor contacts, service history, and maintenance schedules, kept current by us and available to you anytime.

## 3. Scope and limits
To keep expectations clear, the following describes what the membership does and does not cover.
- **What we perform ourselves.** We perform a task ourselves only when it is non-licensed, non-structural, and under **$2,500** in combined labor and materials. We carry general liability insurance and workers' compensation, are bonded against theft, and background-check the personnel who enter your home.
- **What we coordinate.** Electrical, plumbing, HVAC, structural work, and any job over $2,500 is performed by independent, licensed professionals we coordinate on your behalf. We arrange quotes, scheduling, access, and communication; we do not direct or supervise how a professional performs the work, and the work is the professional's responsibility.
- **Not a home warranty or insurance.** You remain responsible for the cost of repairs and replacements. We arrange the work but do not assume its cost.
- **For your residence only.** This membership applies to the personal residence you occupy, not a rental or short-term-rental property. We are not a property manager or real-estate broker.
- **Urgent issues.** For anything that threatens life, health, or safety, contact 911 or your utility first; we are not an emergency service and do not guarantee a response time. For an urgent home problem we will make reasonable efforts to respond promptly: to help you assess it, walk you through a safe step such as shutting off a valve, and arrange a professional. If we are on site, we may take safe, minor steps ourselves to mitigate risk of further damage.
- **Not a home inspection.** We are not licensed or certified home inspectors. Our visits are a visual review to help you plan maintenance. They are not a home inspection, do not follow any home-inspection standard of practice, and should not be relied on as one, including for a real-estate transaction.

## 4. Membership terms
**4.1 Working with professionals.** Professionals we coordinate are independent contractors. You contract with and pay them directly for their work; Carefree Casa charges only the membership and coordination fees in Section 5. We make reasonable efforts to use licensed, insured professionals and to pass through to you any warranty on their work, but any quote is an estimate only, the work is the professional's responsibility, and your recourse for it is with the professional.

**4.2 Reactive requests.** We acknowledge a reactive request within 24 hours. One request per quarter is included. Each additional request in the same quarter carries a **$100** coordination fee, which covers up to **[2] hours** of our own labor; if a request needs more of our time, we will agree on the cost before continuing, and any work that requires a licensed professional is coordinated and invoiced by that professional, payable directly by you. Each distinct issue counts as one request, and reasonable follow-up on the same issue is part of it.

**4.3 Access and disclosures.** You authorize us to enter the Property to provide the services, including when you are away, and to admit professionals for approved work. We safeguard your keys and codes and share them only as needed. You will keep your home profile current with the information we need to work safely, including hazards, pets, firearms, minors, cameras, and the location of your water, electrical, and gas shutoffs.

**4.4 Approvals and emergencies.** We will not commission paid work without your approval. If immediate action is needed to prevent serious damage and we cannot reach you, we may authorize mitigation up to **$500** and notify you promptly.

**4.5 Fees and payment.** Membership is offered as an annual plan or a quarterly plan, as recorded above, where your discount and final price are set. Coordination fees, and any parts or materials we supply for our own tasks beyond minor consumables, are billed separately and due within 15 days; professional invoices are paid by you to the professional. Fees do not include taxes. We may pause services after notice for undisputed past-due amounts.

**4.6 Term, renewal, and cancellation.** The initial term is **12 months**. The membership renews automatically for successive 12-month terms, and we will notify you at least **30 days** before each renewal, including any change in price. You may cancel at any time on **30 days'** notice, and you may decline an upcoming renewal by telling us before the renewal date. If you cancel during a paid term, we refund the unused months, less the value of the onboarding visit. If you sell the Property, the membership ends and we refund the unused months.

**4.7 Your privacy.** We keep your personal and home information confidential, protect it with reasonable safeguards, and use it only to provide the services. On cancellation we return your records and securely delete your access credentials. We will notify you promptly if your information is compromised.

**4.8 Our work and liability.** We perform our own work with reasonable care and stand behind it for **30 days**: we will redo or correct faulty workmanship, which is your sole remedy for that work. We are not responsible for professionals' work, pre-existing or hidden conditions, or events beyond our control; if such an event prevents us from serving you for more than 30 days, you may pause your fee or cancel for a pro-rata refund. To the extent permitted by law, our total liability is limited to the fees you paid us in the prior 12 months, and neither party is liable to the other for indirect or consequential damages. Nothing here limits liability that cannot be limited by law.

**4.9 General.** This Agreement is governed by Georgia law and is the entire agreement between us; any change must be in writing and signed. We are an independent contractor, not your employee or agent. While you are a member and for 12 months afterward, please engage professionals we introduced to you through us rather than directly.

## 5. Pricing
Membership is offered as an annual plan at **$5,500/year** (paid in advance) or a quarterly plan at **$1,581/quarter** (**$6,324/year**). Your selected plan, any discount, and final price are recorded above and in your account.

## 6. Acceptance
By typing your full name and selecting Accept below, you agree to these terms. Your electronic acceptance is the legal equivalent of a handwritten signature, and we record the date and time it is given.`
