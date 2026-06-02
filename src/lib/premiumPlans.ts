export type PremiumBillingPlan = 'annual' | 'monthly'

export const PREMIUM_PLAN_FEATURES = [
  '5 GB storage',
  'Unlimited document scans',
  'Smart Filing',
  'Vault',
  'Full-text search',
  'Sync across all your devices',
] as const

export const PREMIUM_ANNUAL_PRICE = '$39.99'
export const PREMIUM_MONTHLY_PRICE = '$4.99'

export function premiumPlanDisplayName(plan: PremiumBillingPlan): string {
  return plan === 'annual' ? 'Annual' : 'Monthly'
}

export function premiumPlanDetailsLabel(plan: PremiumBillingPlan): string {
  return `See "${premiumPlanDisplayName(plan)}" Details`
}

export function premiumCtaLabel(plan: PremiumBillingPlan): string {
  return plan === 'annual' ? 'Start 7-Day Free Trial' : 'Start now'
}

export function premiumPlanPriceLabel(plan: PremiumBillingPlan): string {
  return plan === 'annual' ? `${PREMIUM_ANNUAL_PRICE} / year` : `${PREMIUM_MONTHLY_PRICE} / month`
}
