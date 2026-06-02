import { useEffect, useState } from 'react'
import type { Document, Folder, UserTag } from '../lib/types'
import type { Theme } from '../hooks/useTheme'
import { getStorageUsage } from '../data/filr'
import {
  formatStorageAddonPrice,
  formatStorageUsageLabel,
  FREE_PLAN_SMART_FILING_DAILY_LIMIT,
  getStorageLimitBytes,
  STORAGE_ADDON_TIERS,
  type StorageAddonBilling,
} from '../lib/storageLimits'
import {
  ChevronRightIcon,
  CloseIcon,
  CloudOutlineIcon,
  CopyIcon,
  ExternalLinkIcon,
  LogOutIcon,
  RecoverIcon,
  ShareIcon,
  TagIcon,
  ToggleOptionIcon,
  TrashIcon,
  UpgradeCrownIcon,
} from './icons'
import { FilrLogoMark } from './brandLogos'
import TagsPanel from './TagsPanel'
import VaultPanel from './VaultPanel'
import RecentlyDeletedPanel, { type RecentlyDeletedToolbarState } from './RecentlyDeletedPanel'
import PremiumUpgradePanel from './PremiumUpgradePanel'
import PremiumPlanDetailsPanel from './PremiumPlanDetailsPanel'
import { premiumPlanDisplayName, type PremiumBillingPlan } from '../lib/premiumPlans'

const RECENTLY_DELETED_ACTION_HINT = 'Select items to recover or delete them.'

const PRIVACY_POLICY_URL = 'https://www.myfilr.app/privacy'
const TERMS_OF_USE_URL = 'https://www.myfilr.app/terms'
const FEATURE_SUGGESTION_URL = 'https://forms.gle/pPyJTdn3UKt9WQLKA'
const CONTACT_EMAIL = 'hi@myfilr.app'
const SHARE_URL = 'https://web.myfilr.app'

export type SettingsSection = 'general' | 'account' | 'support' | 'legal' | 'documents'

export type SettingsSubsheet =
  | 'tags'
  | 'vault'
  | 'recently-deleted'
  | 'plan'
  | 'storage-upgrade'
  | 'premium-upgrade'
  | 'premium-plan-details'

type Subsheet = SettingsSubsheet

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'account', label: 'Account' },
  { id: 'support', label: 'Support' },
  { id: 'legal', label: 'Legal' },
  { id: 'documents', label: 'Documents' },
]

const SUBSHEET_META: Record<Exclude<SettingsSubsheet, 'premium-plan-details'>, { title: string; subtitle?: string }> = {
  tags: { title: 'Tags' },
  vault: { title: 'Vault', subtitle: 'Add and edit cards in the Filr app · Read-only here' },
  plan: { title: 'Your Plan' },
  'storage-upgrade': { title: 'Upgrade Your Storage' },
  'premium-upgrade': { title: 'Filr Premium', subtitle: 'Choose your plan' },
  'recently-deleted': {
    title: 'Recently Deleted',
    subtitle: 'Items are kept for 30 days, then removed permanently.',
  },
}

type Props = {
  email: string | null
  theme: Theme
  plan: 'free' | 'premium'
  userId: string
  tags: UserTag[]
  folders: Folder[]
  documents: Document[]
  initialSection?: SettingsSection
  initialSubsheet?: SettingsSubsheet | null
  onThemeChange: (t: Theme) => void
  onLibraryChanged: () => void
  onSignOut: () => void
  onClose: () => void
}

export default function SettingsModal({
  email,
  theme,
  plan,
  userId,
  tags,
  folders,
  documents,
  initialSection = 'general',
  initialSubsheet = null,
  onThemeChange,
  onLibraryChanged,
  onSignOut,
  onClose,
}: Props) {
  const [active, setActive] = useState<SettingsSection>(initialSection)
  const [subsheet, setSubsheet] = useState<Subsheet | null>(initialSubsheet)
  const [recentlyDeletedToolbar, setRecentlyDeletedToolbar] = useState<RecentlyDeletedToolbarState | null>(null)
  const [selectedPremiumPlan, setSelectedPremiumPlan] = useState<PremiumBillingPlan>('annual')
  const [premiumDetailsPlan, setPremiumDetailsPlan] = useState<PremiumBillingPlan>('annual')

  function selectSection(section: SettingsSection) {
    setActive(section)
    setSubsheet(null)
  }

  useEffect(() => {
    if (subsheet !== 'recently-deleted') setRecentlyDeletedToolbar(null)
  }, [subsheet])

  const subsheetMeta =
    subsheet === 'premium-plan-details'
      ? { title: premiumPlanDisplayName(premiumDetailsPlan) }
      : subsheet
        ? SUBSHEET_META[subsheet]
        : null

  function handleSubsheetBack() {
    if (subsheet === 'premium-plan-details') {
      setSubsheet('premium-upgrade')
      return
    }
    if (subsheet === 'storage-upgrade') {
      setSubsheet('plan')
      return
    }
    setSubsheet(null)
  }

  function handleGetMoreStorage() {
    if (plan === 'free') {
      setSubsheet('premium-upgrade')
      return
    }
    setSubsheet('storage-upgrade')
  }

  function openPremiumUpgrade() {
    setActive('account')
    setSubsheet('premium-upgrade')
  }

  function openPremiumPlanDetails(plan: PremiumBillingPlan) {
    setPremiumDetailsPlan(plan)
    setSubsheet('premium-plan-details')
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-[80vh] max-h-[640px] w-full max-w-3xl overflow-hidden rounded-2xl border border-filr-border bg-filr-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <nav className="flex w-44 shrink-0 flex-col border-r border-filr-border bg-filr-bg/40 p-3">
          <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-filr-muted">Settings</p>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectSection(s.id)}
              className={`mb-0.5 cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                !subsheet && active === s.id
                  ? 'bg-filr-surface-2 text-filr-text'
                  : 'text-filr-muted hover:bg-filr-surface-2/60 hover:text-filr-text'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-filr-border px-6 py-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {subsheet ? (
                <button
                  type="button"
                  onClick={handleSubsheetBack}
                  aria-label="Back to settings"
                  className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1.5 text-filr-muted transition hover:bg-filr-surface-2 hover:text-filr-text"
                >
                  <ChevronRightIcon className="h-4 w-4 rotate-180" />
                </button>
              ) : null}
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-filr-text">
                  {subsheetMeta ? subsheetMeta.title : SECTIONS.find((s) => s.id === active)?.label}
                </h2>
                {subsheetMeta?.subtitle ? (
                  <p className="truncate text-xs text-filr-muted">{subsheetMeta.subtitle}</p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {subsheet === 'recently-deleted' ? (
                <>
                  <RecentlyDeletedHeaderButton
                    disabled={!recentlyDeletedToolbar?.canRecover || recentlyDeletedToolbar.busy}
                    title={
                      !recentlyDeletedToolbar?.canRecover
                        ? RECENTLY_DELETED_ACTION_HINT
                        : recentlyDeletedToolbar.selectedCount === 1
                          ? 'Recover'
                          : `Recover (${recentlyDeletedToolbar.selectedCount})`
                    }
                    onClick={() => recentlyDeletedToolbar?.recover()}
                  >
                    <RecoverIcon className="h-4 w-4" />
                  </RecentlyDeletedHeaderButton>
                  <RecentlyDeletedHeaderButton
                    destructive
                    disabled={!recentlyDeletedToolbar?.canDelete || recentlyDeletedToolbar.busy}
                    title={
                      !recentlyDeletedToolbar?.canDelete
                        ? RECENTLY_DELETED_ACTION_HINT
                        : recentlyDeletedToolbar.selectedCount === 1
                          ? 'Delete permanently'
                          : `Delete permanently (${recentlyDeletedToolbar.selectedCount})`
                    }
                    onClick={() => recentlyDeletedToolbar?.deleteForever()}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </RecentlyDeletedHeaderButton>
                </>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close settings"
                className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1.5 text-filr-muted transition hover:bg-filr-surface-2 hover:text-filr-text"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          </header>

          {subsheet === 'tags' ? (
            <TagsPanel userId={userId} tags={tags} onChanged={onLibraryChanged} />
          ) : subsheet === 'vault' ? (
            <VaultPanel userId={userId} />
          ) : subsheet === 'plan' ? (
            <PlanPanel userId={userId} plan={plan} theme={theme} onGetMoreStorage={handleGetMoreStorage} />
          ) : subsheet === 'storage-upgrade' ? (
            <StorageUpgradePanel plan={plan} />
          ) : subsheet === 'premium-upgrade' ? (
            <PremiumUpgradePanel
              theme={theme}
              selectedPlan={selectedPremiumPlan}
              onSelectedPlanChange={setSelectedPremiumPlan}
              onOpenPlanDetails={openPremiumPlanDetails}
            />
          ) : subsheet === 'premium-plan-details' ? (
            <PremiumPlanDetailsPanel plan={premiumDetailsPlan} theme={theme} />
          ) : subsheet === 'recently-deleted' ? (
            <RecentlyDeletedPanel
              userId={userId}
              folders={folders}
              documents={documents}
              onChanged={onLibraryChanged}
              onToolbarChange={setRecentlyDeletedToolbar}
            />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {active === 'general' && (
                <GeneralSection
                  theme={theme}
                  onThemeChange={onThemeChange}
                  onOpenTags={() => setSubsheet('tags')}
                  onOpenVault={() => setSubsheet('vault')}
                />
              )}
              {active === 'account' && (
                <AccountSection
                  email={email}
                  plan={plan}
                  onSignOut={onSignOut}
                  onOpenPlan={() => setSubsheet('plan')}
                  onOpenPremiumUpgrade={openPremiumUpgrade}
                />
              )}
              {active === 'support' && <SupportSection />}
              {active === 'legal' && <LegalSection />}
              {active === 'documents' && (
                <DocumentsSection onOpenRecentlyDeleted={() => setSubsheet('recently-deleted')} />
              )}
              <p className="mt-8 text-center text-xs text-filr-muted/70">Filr Web · Version 1.0</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RecentlyDeletedHeaderButton({
  disabled,
  destructive,
  title,
  onClick,
  children,
}: {
  disabled?: boolean
  destructive?: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1.5 text-filr-muted transition hover:bg-filr-surface-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-filr-muted ${
        destructive ? 'hover:text-red-400' : 'hover:text-filr-text'
      }`}
    >
      {children}
    </button>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-xl border border-filr-border bg-filr-bg/30">{children}</div>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-filr-muted first:mt-0">{children}</h3>
}

function Row({
  label,
  right,
  onClick,
  disabled,
}: {
  label: string
  right?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between gap-3 border-b border-filr-border px-4 py-3 text-sm transition last:border-0 ${
        disabled
          ? 'cursor-default text-filr-muted'
          : onClick
            ? 'cursor-pointer text-filr-text hover:bg-filr-surface-2'
            : 'cursor-default text-filr-text'
      }`}
    >
      <span className="truncate text-left">{label}</span>
      <span className="flex shrink-0 items-center gap-2 text-filr-muted">{right}</span>
    </button>
  )
}

function MobileBadge() {
  return (
    <span className="rounded-full border border-filr-border px-2 py-0.5 text-[11px] font-medium text-filr-muted">
      In the app
    </span>
  )
}

function GeneralSection({
  theme,
  onThemeChange,
  onOpenTags,
  onOpenVault,
}: {
  theme: Theme
  onThemeChange: (t: Theme) => void
  onOpenTags: () => void
  onOpenVault: () => void
}) {
  return (
    <>
      <SectionLabel>Appearance</SectionLabel>
      <Card>
        <div className="px-4 py-3">
          <div className="flex gap-1 rounded-lg bg-filr-bg/60 p-1">
            {(['light', 'dark'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onThemeChange(opt)}
                className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${
                  theme === opt ? 'bg-filr-surface-2 text-filr-text' : 'text-filr-muted hover:text-filr-text'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <SectionLabel>General</SectionLabel>
      <Card>
        <Row label="Tags" onClick={onOpenTags} right={<TagIcon className="h-4 w-4" />} />
        <Row label="Smart Filing" disabled right={<MobileBadge />} />
        <Row label="Vault" onClick={onOpenVault} right={<ToggleOptionIcon className="h-4 w-4" />} />
      </Card>
    </>
  )
}

function AccountSection({
  email,
  plan,
  onSignOut,
  onOpenPlan,
  onOpenPremiumUpgrade,
}: {
  email: string | null
  plan: 'free' | 'premium'
  onSignOut: () => void
  onOpenPlan: () => void
  onOpenPremiumUpgrade: () => void
}) {
  const isFree = plan === 'free'
  return (
    <>
      <SectionLabel>Account</SectionLabel>
      <Card>
        <Row label={email ?? 'Not signed in'} />
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-filr-border px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
          >
            <LogOutIcon className="h-4 w-4" />
            Log out
          </button>
        </div>
      </Card>

      <SectionLabel>Plan</SectionLabel>
      <div className="overflow-hidden rounded-xl border border-filr-border bg-filr-surface">
        <div className="flex items-center gap-3 px-4 pt-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-filr-bg/60">
            <FilrLogoMark className="h-6 w-6 text-filr-text" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-filr-muted">{isFree ? 'You are using' : 'Thanks for using'}</p>
            <p className="text-base font-semibold text-filr-text">{isFree ? 'Filr Free' : 'Filr Premium'}</p>
          </div>
        </div>
        <div className="mx-4 my-3 border-t border-filr-border" />
        <button
          type="button"
          onClick={onOpenPlan}
          className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-filr-text transition hover:bg-filr-surface-2"
        >
          <span>Plan & Storage</span>
          <ToggleOptionIcon className="h-4 w-4 shrink-0 text-filr-muted" />
        </button>
        <div className="px-4 pb-4 pt-1">
          {isFree ? (
            <button
              type="button"
              onClick={onOpenPremiumUpgrade}
              className="mx-auto flex cursor-pointer items-center justify-center gap-2 rounded-lg px-2 py-1 text-sm font-bold text-[#6DAFEF] transition hover:opacity-80"
            >
              <UpgradeCrownIcon size={20} className="shrink-0" />
              Get Filr Premium
            </button>
          ) : (
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-center rounded-xl border border-filr-border px-4 py-2.5 text-sm font-semibold text-filr-text transition hover:bg-filr-surface-2"
            >
              Manage Subscription
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function PlanPanel({
  userId,
  plan,
  theme,
  onGetMoreStorage,
}: {
  userId: string
  plan: 'free' | 'premium'
  theme: Theme
  onGetMoreStorage: () => void
}) {
  const isFree = plan === 'free'
  const storageLimitBytes = getStorageLimitBytes(!isFree)
  const [storageUsedBytes, setStorageUsedBytes] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const used = await getStorageUsage(userId)
        if (!cancelled) setStorageUsedBytes(used)
      } catch {
        if (!cancelled) setStorageUsedBytes(0)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  const storageUsageProgress =
    storageLimitBytes <= 0 ? 0 : Math.min(1, storageUsedBytes / storageLimitBytes)
  const progressTrackColor = theme === 'dark' ? '#737D89' : '#9EA6B5'

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
      <SectionLabel>Plan Details</SectionLabel>
      <Card>
        <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span className="text-filr-text">{isFree ? 'Smart Filings / day' : 'Document & Smart Filing'}</span>
          <span className="shrink-0 text-[#9EA6B5]">
            {isFree ? `${FREE_PLAN_SMART_FILING_DAILY_LIMIT}` : 'Unlocked'}
          </span>
        </div>
      </Card>

      <SectionLabel>Storage</SectionLabel>
      <Card>
        <div className="space-y-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <CloudOutlineIcon className="h-[22px] w-[22px] shrink-0 text-filr-text" />
            <span className="text-sm font-semibold text-filr-text">Storage used</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full" style={{ backgroundColor: progressTrackColor }}>
            <div
              className="h-full rounded-full bg-[#6DAFEF] transition-[width] duration-300"
              style={{ width: `${Math.max(0, Math.min(100, storageUsageProgress * 100))}%` }}
            />
          </div>
          <p className="text-sm text-filr-muted">{formatStorageUsageLabel(storageUsedBytes, storageLimitBytes)}</p>
        </div>
      </Card>

      <button
        type="button"
        onClick={onGetMoreStorage}
        className="mx-auto mt-4 flex cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-sm font-bold text-[#6DAFEF] transition hover:opacity-80"
      >
        Get More Storage
      </button>
    </div>
  )
}

function StorageUpgradePanel({ plan }: { plan: 'free' | 'premium' }) {
  const [billing, setBilling] = useState<StorageAddonBilling>('monthly')
  const [selectedGb, setSelectedGb] = useState<number>(STORAGE_ADDON_TIERS[0].gb)

  if (plan !== 'premium') {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <p className="text-sm text-filr-muted">Storage add-ons are available with Filr Premium.</p>
      </div>
    )
  }

  const selectedTier =
    STORAGE_ADDON_TIERS.find((tier) => tier.gb === selectedGb) ?? STORAGE_ADDON_TIERS[0]
  const selectedPriceLabel =
    billing === 'monthly'
      ? `${formatStorageAddonPrice(selectedTier.monthly)}/mo`
      : `${formatStorageAddonPrice(selectedTier.annual)}/yr`

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <p className="mb-5 text-sm text-filr-muted">
          Add extra space on top of your Premium plan. Choose an add-on and billing cycle below.
        </p>

        <div className="mb-2 flex gap-1 rounded-lg bg-filr-bg/60 p-1">
          {(['monthly', 'annual'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setBilling(option)}
              className={`flex-1 cursor-pointer rounded-md px-3 py-2 text-sm font-semibold capitalize transition ${
                billing === option
                  ? 'bg-filr-surface-2 text-filr-text'
                  : 'text-filr-muted hover:text-filr-text'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="mb-4 text-xs text-filr-muted">Save 33% with annual billing</p>

        <div className="overflow-hidden rounded-xl border border-filr-border bg-filr-bg/30">
          <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-filr-border px-4 py-2.5 text-xs font-semibold text-filr-muted">
            <span>Add-on</span>
            <span className="text-right">Monthly</span>
            <span className="text-right">Annual</span>
          </div>
          {STORAGE_ADDON_TIERS.map((tier, index) => {
            const selected = selectedGb === tier.gb
            return (
              <button
                key={tier.gb}
                type="button"
                onClick={() => setSelectedGb(tier.gb)}
                className={`grid w-full cursor-pointer grid-cols-[1.2fr_1fr_1fr] gap-2 px-4 py-3 text-left text-sm transition hover:bg-filr-surface-2/60 ${
                  index < STORAGE_ADDON_TIERS.length - 1 ? 'border-b border-filr-border' : ''
                } ${selected ? 'bg-[#6DAFEF]/10' : ''}`}
              >
                <span className={`font-medium ${selected ? 'text-[#6DAFEF]' : 'text-filr-text'}`}>
                  +{tier.gb} GB
                </span>
                <span className={`text-right ${selected ? 'font-semibold text-[#6DAFEF]' : 'text-filr-text'}`}>
                  {formatStorageAddonPrice(tier.monthly)}
                </span>
                <span className={`text-right ${selected ? 'font-semibold text-[#6DAFEF]' : 'text-filr-text'}`}>
                  {formatStorageAddonPrice(tier.annual)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="shrink-0 border-t border-filr-border px-6 py-4">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-[#6DAFEF] px-4 py-3 text-sm font-semibold text-[#101922] transition hover:opacity-90"
        >
          Add +{selectedTier.gb} GB — {selectedPriceLabel}
        </button>
      </div>
    </div>
  )
}

function SupportSection() {
  const [copied, setCopied] = useState(false)

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // ignore
    }
  }

  async function shareApp() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Filr', text: 'Organize your documents with Filr', url: SHARE_URL })
        return
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(SHARE_URL)
    } catch {
      // ignore
    }
  }

  return (
    <>
      <SectionLabel>Support</SectionLabel>
      <Card>
        <Row label="Share the App" onClick={shareApp} right={<ShareIcon className="h-4 w-4" />} />
        <Row
          label="Contact us"
          onClick={copyEmail}
          right={
            <>
              <span className={copied ? 'text-filr-accent' : ''}>{copied ? 'Copied' : CONTACT_EMAIL}</span>
              <CopyIcon className="h-4 w-4" />
            </>
          }
        />
        <Row
          label="Suggest a feature"
          onClick={() => window.open(FEATURE_SUGGESTION_URL, '_blank', 'noopener,noreferrer')}
          right={<ExternalLinkIcon className="h-4 w-4" />}
        />
      </Card>
    </>
  )
}

function LegalSection() {
  return (
    <>
      <SectionLabel>Legal</SectionLabel>
      <Card>
        <Row
          label="Privacy policy"
          onClick={() => window.open(PRIVACY_POLICY_URL, '_blank', 'noopener,noreferrer')}
          right={<ExternalLinkIcon className="h-4 w-4" />}
        />
        <Row
          label="Terms of use"
          onClick={() => window.open(TERMS_OF_USE_URL, '_blank', 'noopener,noreferrer')}
          right={<ExternalLinkIcon className="h-4 w-4" />}
        />
      </Card>
    </>
  )
}

function DocumentsSection({ onOpenRecentlyDeleted }: { onOpenRecentlyDeleted: () => void }) {
  return (
    <>
      <SectionLabel>Documents</SectionLabel>
      <Card>
        <Row label="Recently Deleted" onClick={onOpenRecentlyDeleted} right={<ToggleOptionIcon className="h-4 w-4" />} />
      </Card>
      <p className="mt-3 text-xs text-filr-muted">
        Recover or permanently delete items within 30 days of deletion.
      </p>
    </>
  )
}
