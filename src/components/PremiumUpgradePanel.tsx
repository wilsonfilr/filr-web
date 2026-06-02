import type { Theme } from '../hooks/useTheme'
import {
  PREMIUM_PLAN_FEATURES,
  premiumCtaLabel,
  premiumPlanDetailsLabel,
  premiumPlanPriceLabel,
  type PremiumBillingPlan,
} from '../lib/premiumPlans'
import { CheckIcon, UpgradeCrownIcon } from './icons'

const PRIVACY_POLICY_URL = 'https://www.myfilr.app/privacy'
const TERMS_OF_USE_URL = 'https://www.myfilr.app/terms'

type Props = {
  theme: Theme
  selectedPlan: PremiumBillingPlan
  onSelectedPlanChange: (plan: PremiumBillingPlan) => void
  onOpenPlanDetails: (plan: PremiumBillingPlan) => void
}

function PlanRadio({ selected }: { selected: boolean }) {
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
        selected ? 'border-[#6DAFEF] bg-[#6DAFEF]' : 'border-filr-muted/50 bg-transparent'
      }`}
    >
      {selected ? <CheckIcon className="h-4 w-4 text-[#101922]" /> : null}
    </div>
  )
}

export default function PremiumUpgradePanel({
  theme,
  selectedPlan,
  onSelectedPlanChange,
  onOpenPlanDetails,
}: Props) {
  const isLight = theme === 'light'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div
          className={`relative mb-6 overflow-hidden rounded-2xl border px-5 py-6 ${
            isLight
              ? 'border-[#6DAFEF]/25 bg-gradient-to-br from-[#6DAFEF]/15 via-white to-[#e9f0f8]'
              : 'border-[#6DAFEF]/20 bg-gradient-to-br from-[#6DAFEF]/12 via-[#1f2a39] to-[#101922]'
          }`}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full opacity-40 blur-2xl"
            style={{ background: 'radial-gradient(circle, #6DAFEF 0%, transparent 70%)' }}
          />
          <div className="relative flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                isLight ? 'bg-white shadow-sm' : 'bg-[#1A2632]'
              }`}
            >
              <UpgradeCrownIcon size={28} className="shrink-0" />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6DAFEF]">Upgrade</p>
              <h3 className="mt-1 text-xl font-bold leading-tight text-filr-text">Unlock Filr Premium</h3>
              <p className="mt-2 text-sm leading-relaxed text-filr-muted">
                Scan, organize, and find every document — with Smart Filing, Vault, and full-text search.
              </p>
            </div>
          </div>
        </div>

        <ul className="mb-6 grid gap-2.5 sm:grid-cols-2">
          {PREMIUM_PLAN_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-filr-text">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6DAFEF]/15 text-[#6DAFEF]">
                <CheckIcon className="h-3 w-3" />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-filr-muted">Choose a plan</p>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onSelectedPlanChange('annual')}
            className={`relative flex w-full cursor-pointer items-center gap-4 rounded-2xl border-2 px-4 py-4 text-left transition ${
              selectedPlan === 'annual'
                ? 'border-[#6DAFEF] bg-[#6DAFEF]/10 shadow-[0_8px_24px_rgba(109,175,239,0.12)]'
                : 'border-filr-border bg-filr-bg/30 hover:border-filr-muted/60 hover:bg-filr-surface-2/40'
            }`}
          >
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[#6DAFEF] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#101922]">
              Most popular
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold text-filr-text">Annual</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                    isLight ? 'bg-[#6DAFEF]/15 text-[#2f86e0]' : 'bg-[#6DAFEF]/20 text-[#6DAFEF]'
                  }`}
                >
                  -33%
                </span>
              </div>
              <p className="mt-1 text-sm text-filr-muted">{premiumPlanPriceLabel('annual')}</p>
            </div>
            <PlanRadio selected={selectedPlan === 'annual'} />
          </button>

          <button
            type="button"
            onClick={() => onSelectedPlanChange('monthly')}
            className={`flex w-full cursor-pointer items-center gap-4 rounded-2xl border-2 px-4 py-4 text-left transition ${
              selectedPlan === 'monthly'
                ? 'border-[#6DAFEF] bg-[#6DAFEF]/10 shadow-[0_8px_24px_rgba(109,175,239,0.12)]'
                : 'border-filr-border bg-filr-bg/30 hover:border-filr-muted/60 hover:bg-filr-surface-2/40'
            }`}
          >
            <div className="min-w-0 flex-1">
              <span className="text-base font-semibold text-filr-text">Monthly</span>
              <p className="mt-1 text-sm text-filr-muted">{premiumPlanPriceLabel('monthly')}</p>
            </div>
            <PlanRadio selected={selectedPlan === 'monthly'} />
          </button>
        </div>
      </div>

      <div className={`shrink-0 border-t border-filr-border px-6 py-4 ${isLight ? 'bg-white/80' : 'bg-filr-surface/80'}`}>
        <button
          type="button"
          onClick={() => onOpenPlanDetails(selectedPlan)}
          className="mx-auto mb-3 flex cursor-pointer items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold text-[#6DAFEF] transition hover:opacity-80"
        >
          {premiumPlanDetailsLabel(selectedPlan)}
        </button>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-[#6DAFEF] px-4 py-3.5 text-sm font-semibold text-[#101922] shadow-[0_8px_24px_rgba(109,175,239,0.25)] transition hover:opacity-95 active:scale-[0.99]"
        >
          {premiumCtaLabel(selectedPlan)}
        </button>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-filr-muted">
          By continuing, you agree to our{' '}
          <a
            href={TERMS_OF_USE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6DAFEF] underline-offset-2 hover:underline"
          >
            Terms of Use
          </a>{' '}
          and{' '}
          <a
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6DAFEF] underline-offset-2 hover:underline"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  )
}
