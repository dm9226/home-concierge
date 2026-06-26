// Default service agreement terms. Staff can edit the body per property before
// sending. This is a sensible starting template, not legal advice -- have your
// own counsel review and replace the language before relying on it.

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

export const DEFAULT_AGREEMENT_BODY = `1. Services. Care Free Casa ("CFC") provides proactive home management and concierge services for the property identified above, including periodic property walkthroughs, maintenance coordination, vendor scheduling, and recordkeeping. The specific scope depends on the selected plan.

2. Plan and Fees. The Homeowner agrees to the recurring fee for the selected plan shown above, billed per the stated billing period. Fees are due in advance of each period and may be adjusted with 30 days' written notice.

3. On-Demand Service Calls. The Proactive + On-Demand plan includes four (4) complimentary on-demand service calls per calendar year. Additional calls are billed at $100 for handyman-type requests and $200 for all other requests. The Proactive plan does not include complimentary on-demand calls; each is billed at the then-current per-call rate.

4. Vendor Coordination. CFC coordinates qualified third-party contractors on the Homeowner's behalf. The Homeowner approves work and associated costs before CFC schedules it. Contractors are independent third parties; CFC does not warrant their work but will reasonably assist in resolving issues.

5. Property Access. The Homeowner authorizes CFC to access the property as needed to perform services, including via keys, codes, or lockboxes the Homeowner provides. CFC will safeguard access credentials.

6. Recommendations. CFC may recommend repairs or maintenance. The Homeowner decides whether to approve, defer, or decline each recommendation. CFC is not responsible for consequences of deferred or declined work.

7. Limitation of Liability. CFC's liability for any claim arising from the services is limited to the fees paid in the three months preceding the claim. CFC is not liable for the acts or omissions of third-party contractors or for pre-existing property conditions.

8. Term and Cancellation. This agreement is month-to-month unless otherwise stated and may be cancelled by either party with 30 days' written notice. Fees for the current period are non-refundable.

9. Electronic Acceptance. By typing your name and selecting "Accept" below, you agree to these terms and acknowledge that your electronic acceptance is the legal equivalent of a handwritten signature.

10. Governing Law. This agreement is governed by the laws of the state in which the property is located.`
