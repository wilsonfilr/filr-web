export const FREE_STORAGE_LIMIT_BYTES = 100 * 1024 * 1024
export const PAID_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024
/** @deprecated Use FREE_PLAN_SMART_FILING_DAILY_LIMIT */
export const FREE_AI_SCAN_LIMIT = 5
export const FREE_PLAN_SMART_FILING_DAILY_LIMIT = 5

export const STORAGE_ADDON_TIERS = [
  { gb: 5, monthly: 0.59, annual: 4.79 },
  { gb: 10, monthly: 0.99, annual: 7.99 },
  { gb: 20, monthly: 1.59, annual: 12.72 },
  { gb: 50, monthly: 2.99, annual: 23.99 },
  { gb: 100, monthly: 4.49, annual: 35.99 },
  { gb: 200, monthly: 6.99, annual: 55.99 },
] as const

export type StorageAddonBilling = 'monthly' | 'annual'

export function formatStorageAddonPrice(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function getStorageLimitBytes(isPremium: boolean): number {
  return isPremium ? PAID_STORAGE_LIMIT_BYTES : FREE_STORAGE_LIMIT_BYTES
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
