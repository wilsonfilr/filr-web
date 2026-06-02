export const RECENTLY_DELETED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000
export const RECENTLY_DELETED_RETENTION_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

export type RecentlyDeletedFolderPayload = {
  parentId: string | null
  tagIds?: string[]
}

export type RecentlyDeletedDocumentPayload = {
  folderId: string | null
  textContent: string
  tagIds?: string[]
}

export type RecentlyDeletedItem = {
  id: string
  name: string
  kind: 'folder' | 'document' | 'id'
  deletedAt: number
  thumbUri?: string
  folder?: RecentlyDeletedFolderPayload
  document?: RecentlyDeletedDocumentPayload
}

export function normalizeDeletedAt(deletedAt: number): number {
  if (!Number.isFinite(deletedAt) || deletedAt <= 0) return Date.now()
  if (deletedAt < 1_000_000_000_000) return deletedAt * 1000
  return deletedAt
}

export function recentlyDeletedExpiresAt(deletedAt: number): number {
  return normalizeDeletedAt(deletedAt) + RECENTLY_DELETED_RETENTION_MS
}

export function recentlyDeletedDaysRemaining(deletedAt: number): number {
  const elapsedDays = Math.floor((Date.now() - normalizeDeletedAt(deletedAt)) / DAY_MS)
  return Math.max(0, RECENTLY_DELETED_RETENTION_DAYS - elapsedDays)
}

export function recentlyDeletedDaysLabel(deletedAt: number): string {
  const days = recentlyDeletedDaysRemaining(deletedAt)
  return days === 1 ? '1 day' : `${days} days`
}

export function purgeExpiredRecentlyDeleted(items: RecentlyDeletedItem[]): {
  kept: RecentlyDeletedItem[]
  expired: RecentlyDeletedItem[]
} {
  const now = Date.now()
  const kept: RecentlyDeletedItem[] = []
  const expired: RecentlyDeletedItem[] = []
  for (const item of items) {
    if (now < recentlyDeletedExpiresAt(item.deletedAt)) kept.push(item)
    else expired.push(item)
  }
  kept.sort((a, b) => b.deletedAt - a.deletedAt)
  return { kept, expired }
}

export function expandFolderIdsWithDescendants(folderIds: string[], folders: { id: string; parentId: string | null }[]): Set<string> {
  const out = new Set(folderIds)
  let expanded = true
  while (expanded) {
    expanded = false
    for (const f of folders) {
      if (f.parentId != null && out.has(f.parentId) && !out.has(f.id)) {
        out.add(f.id)
        expanded = true
      }
    }
  }
  return out
}

export function collectDocsInFolders(
  folderIds: Set<string>,
  documents: { id: string; folderId: string | null }[],
): Set<string> {
  const out = new Set<string>()
  for (const d of documents) {
    if (d.folderId != null && folderIds.has(d.folderId)) out.add(d.id)
  }
  return out
}
