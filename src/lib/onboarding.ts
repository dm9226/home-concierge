// Onboarding step model shared by the admin property view and the homeowner
// portal. Completion is derived from data presence so the tracker is always
// accurate without a separate status to keep in sync.

export interface OnboardingFlags {
  agreementAccepted: boolean
  hasInspection: boolean
  hasInfo: boolean
  hasInventory: boolean
  hasServices: boolean
  hasRecommendations: boolean
}

export interface OnboardingStep {
  key: string
  label: string        // admin / concierge wording
  clientLabel: string  // homeowner-facing wording
  done: boolean
  tab: string          // admin tab to deep-link to (?tab=)
  clientAction: boolean // true if this is something the homeowner does
}

export function onboardingSteps(f: OnboardingFlags): OnboardingStep[] {
  return [
    { key: "agreement",       label: "Membership agreement signed",  clientLabel: "Sign your membership agreement", done: f.agreementAccepted, tab: "profile",         clientAction: true },
    { key: "walkthrough",     label: "Initial walkthrough completed", clientLabel: "Home walkthrough",           done: f.hasInspection,       tab: "inspection",      clientAction: false },
    { key: "profile",         label: "Property info captured",        clientLabel: "Home profile",               done: f.hasInfo,             tab: "profile",         clientAction: false },
    { key: "inventory",       label: "Home inventory added",          clientLabel: "Appliances & systems logged", done: f.hasInventory,       tab: "inventory",       clientAction: false },
    { key: "services",        label: "Recurring services logged",     clientLabel: "Recurring services",         done: f.hasServices,         tab: "profile",         clientAction: false },
    { key: "recommendations", label: "Recommendation report prepared", clientLabel: "Recommendations ready",     done: f.hasRecommendations,  tab: "recommendations", clientAction: false },
  ]
}

export function onboardingProgress(steps: OnboardingStep[]) {
  const done = steps.filter(s => s.done).length
  const total = steps.length
  return { done, total, complete: done === total, pct: total ? Math.round((done / total) * 100) : 0 }
}
