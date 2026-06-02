import type { Theme } from '../hooks/useTheme'
import {
  PREMIUM_PLAN_FEATURES,
  premiumPlanDisplayName,
  premiumPlanPriceLabel,
  type PremiumBillingPlan,
} from '../lib/premiumPlans'
import { CheckIcon } from './icons'

type Props = {
  plan: PremiumBillingPlan
  theme: Theme
}

export default function PremiumPlanDetailsPanel({ plan, theme }: Props) {
  const isLight = theme === 'light'

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-filr-text">{premiumPlanDisplayName(plan)}</h3>
        <p className="mt-2 text-lg text-filr-muted">{premiumPlanPriceLabel(plan)}</p>
      </div>

      <ul className="space-y-3">
        {PREMIUM_PLAN_FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-filr-text">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                isLight ? 'bg-[#101922]/8 text-[#101922]' : 'bg-filr-text/10 text-filr-text'
              }`}
            >
              <CheckIcon className="h-3 w-3" />
            </span>
            <span className="leading-relaxed">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
