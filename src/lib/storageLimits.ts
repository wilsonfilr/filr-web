export const FREE_STORAGE_LIMIT_BYTES = 100 * 1024 * 1024
export const PAID_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024
export const FREE_STORAGE_WARNING_RATIO = 0.8
export const PAID_STORAGE_WARNING_RATIO = 0.9
/** @deprecated Use FREE_PLAN_SMART_FILING_DAILY_LIMIT */
export const FREE_AI_SCAN_LIMIT = 5
export const FREE_PLAN_SMART_FILING_DAILY_LIMIT = 5

export const STORAGE_ADDON_TIERS = [
  { gb: 10, monthly: 1.99, annual: 15.99 },
  { gb: 50, monthly: 4.99, annual: 39.99 },
  { gb: 200, monthly: 12.99, annual: 99.99 },
] as const

export type StorageAddonBilling = 'monthly' | 'annual'

export function formatStorageAddonPrice(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export class StorageLimitError extends Error {
  readonly usedBytes: number
  readonly limitBytes: number

  constructor(usedBytes: number, limitBytes: number) {
    super('Storage limit reached')
    this.name = 'StorageLimitError'
    this.usedBytes = usedBytes
    this.limitBytes = limitBytes
  }
}

export function wouldExceedStorageLimit(
  usedBytes: number,
  limitBytes: number,
  additionalBytes: number,
): boolean {
  if (additionalBytes <= 0 || limitBytes <= 0) {
    return false
  }
  return usedBytes + additionalBytes > limitBytes
}

export function getStorageLimitBytes(isPremium: boolean, addonGb: number = 0): number {
  if (!isPremium) {
    return FREE_STORAGE_LIMIT_BYTES
  }
  const baseGb = 5
  return (baseGb + addonGb) * 1024 * 1024 * 1024
}

export function getStorageWarningRatio(isPremium: boolean): number {
  return isPremium ? PAID_STORAGE_WARNING_RATIO : FREE_STORAGE_WARNING_RATIO
}

export function getStorageWarningPercent(isPremium: boolean): number {
  return Math.round(getStorageWarningRatio(isPremium) * 100)
}

/** True when usage is at the plan warning level but still below the hard limit. */
export function isStorageUsageAtWarningLevel(
  usedBytes: number,
  limitBytes: number,
  isPremium: boolean,
): boolean {
  if (limitBytes <= 0 || usedBytes <= 0) {
    return false
  }
  const ratio = usedBytes / limitBytes
  return ratio >= getStorageWarningRatio(isPremium) && ratio < 1
}

export function formatStorageSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) {
    const gb = mb / 1024
    if (gb >= 10) {
      return `${Math.round(gb)} GB`
    }
    const rounded = Math.round(gb * 10) / 10
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} GB`
  }
  return `${Math.max(0, Math.round(mb))} MB`
}

export function formatStorageUsageLabel(usedBytes: number, limitBytes: number): string {
  return `${formatStorageSize(usedBytes)} of ${formatStorageSize(limitBytes)} used`
}
