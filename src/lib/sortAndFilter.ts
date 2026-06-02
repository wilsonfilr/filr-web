export type SortOption = 'name-asc' | 'name-desc' | 'updated-asc' | 'updated-desc'

export function naturalNameCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

export function itemEditedTimestamp(id: string, createdAt: string | null | undefined): number {
  if (createdAt) {
    const ms = Date.parse(createdAt)
    if (Number.isFinite(ms)) return ms
  }
  const ts = Number.parseInt(id.split('-')[0] ?? '', 10)
  return Number.isFinite(ts) ? ts : 0
}

export function itemMatchesTagFilters(tagIds: string[] | undefined, filterIds: string[]): boolean {
  if (filterIds.length === 0) return true
  const onItem = new Set(tagIds ?? [])
  return filterIds.some((id) => onItem.has(id))
}

export function filterByTags<T extends { tagIds: string[] }>(items: T[], activeTagIds: string[]): T[] {
  if (activeTagIds.length === 0) return items
  return items.filter((item) => itemMatchesTagFilters(item.tagIds, activeTagIds))
}

export function sortByName<T>(items: T[], getName: (item: T) => string, option: SortOption): T[] {
  const arr = [...items]
  const desc = option === 'name-desc'
  arr.sort((a, b) => {
    const cmp = naturalNameCompare(getName(a), getName(b))
    return desc ? -cmp : cmp
  })
  return arr
}

export function sortByUpdated<T>(items: T[], getMeta: (item: T) => { id: string; createdAt?: string | null }, option: SortOption): T[] {
  const arr = [...items]
  const asc = option === 'updated-asc'
  arr.sort((a, b) => {
    const ta = itemEditedTimestamp(getMeta(a).id, getMeta(a).createdAt)
    const tb = itemEditedTimestamp(getMeta(b).id, getMeta(b).createdAt)
    return asc ? ta - tb : tb - ta
  })
  return arr
}

export function applySortOption<T>(
  items: T[],
  sortOption: SortOption,
  getName: (item: T) => string,
  getMeta: (item: T) => { id: string; createdAt?: string | null },
): T[] {
  if (sortOption === 'name-asc' || sortOption === 'name-desc') {
    return sortByName(items, getName, sortOption)
  }
  return sortByUpdated(items, getMeta, sortOption)
}

export function readStoredSortOption(): SortOption {
  if (typeof window === 'undefined') return 'name-asc'
  const stored = window.localStorage.getItem('filr-sort-option')
  if (
    stored === 'name-asc' ||
    stored === 'name-desc' ||
    stored === 'updated-asc' ||
    stored === 'updated-desc'
  ) {
    return stored
  }
  return 'name-asc'
}

export function storeSortOption(option: SortOption): void {
  try {
    window.localStorage.setItem('filr-sort-option', option)
  } catch {
    // ignore
  }
}
