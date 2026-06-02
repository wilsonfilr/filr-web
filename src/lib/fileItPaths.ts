import type { Folder } from './types'

export type FileItItem = {
  id: string
  kind: 'folder' | 'document'
  name: string
  thumbnailUrl?: string | null
}

export type FileItSuggestion = {
  itemId: string
  destinationSegments: string[]
  newFromIndex: number
}

export type FileItFolderRow = { id: string; name: string; parentId: string | null }

export function fileItFirstNewFolderIndex(segments: string[], allFolders: FileItFolderRow[]): number {
  const findChild = (parentId: string | null, name: string) =>
    allFolders.find(
      (f) => f.parentId === parentId && f.name.trim().toLowerCase() === name.trim().toLowerCase(),
    ) ?? null
  let parentId: string | null = null
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!
    const existing = findChild(parentId, seg)
    if (!existing) return i
    parentId = existing.id
  }
  return segments.length
}

export function fileItSuggestionDisplaySegments(suggestion: FileItSuggestion, itemName: string): string[] {
  const normalizeSegment = (segment: string) =>
    segment
      .normalize('NFKC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
  const cleanSegment = (segment: string) =>
    segment
      .normalize('NFKC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
  const normalizedSegments = suggestion.destinationSegments.map(cleanSegment).filter(Boolean)
  if (normalizedSegments.length === 0) return []
  const itemNameKey = normalizeSegment(itemName)
  let destinationOnlySegments = [...normalizedSegments]
  while (
    destinationOnlySegments.length > 0 &&
    normalizeSegment(destinationOnlySegments[destinationOnlySegments.length - 1] ?? '') === itemNameKey
  ) {
    destinationOnlySegments.pop()
  }
  if (destinationOnlySegments.length === 0) {
    destinationOnlySegments = normalizedSegments
  }
  return destinationOnlySegments
}

export function fileItDestinationGroupKey(displaySegments: string[]): string {
  const normalizeSegment = (segment: string) =>
    segment
      .normalize('NFKC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
  return displaySegments.map(normalizeSegment).join('\u0001')
}

export function folderPathSegments(folderId: string, foldersById: Map<string, Folder>): string[] {
  const segments: string[] = []
  let current = foldersById.get(folderId)
  while (current) {
    segments.unshift(current.name)
    current = current.parentId ? foldersById.get(current.parentId) : undefined
  }
  return segments
}

export function groupFileItSuggestions(
  suggestions: FileItSuggestion[],
  items: FileItItem[],
  existingFolders: FileItFolderRow[],
) {
  const byId = new Map(items.map((i) => [i.id, i]))
  const normalizeSegment = (segment: string) =>
    segment
      .normalize('NFKC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
  const cleanSegment = (segment: string) =>
    segment
      .normalize('NFKC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim()
      .replace(/\s+/g, ' ')

  const groups = new Map<
    string,
    {
      destinationSegments: string[]
      itemNames: string[]
      hasFolder: boolean
      firstDocumentThumbnailUri: string | null
    }
  >()

  for (const suggestion of suggestions) {
    const item = byId.get(suggestion.itemId)
    if (!item) continue
    const displaySegments = fileItSuggestionDisplaySegments(suggestion, item.name)
    if (displaySegments.length === 0) continue
    const key = displaySegments.map(normalizeSegment).join('\u0001')
    const existing = groups.get(key)
    if (existing) {
      if (!existing.itemNames.includes(item.name)) {
        existing.itemNames.push(item.name)
        if (item.kind === 'folder') existing.hasFolder = true
        else if (!existing.firstDocumentThumbnailUri && item.thumbnailUrl) {
          existing.firstDocumentThumbnailUri = item.thumbnailUrl
        }
      }
      continue
    }
    groups.set(key, {
      destinationSegments: displaySegments.map(cleanSegment),
      itemNames: [item.name],
      hasFolder: item.kind === 'folder',
      firstDocumentThumbnailUri: item.kind === 'document' ? (item.thumbnailUrl ?? null) : null,
    })
  }

  return Array.from(groups.entries()).map(([groupKey, group]) => ({
    groupKey,
    destinationSegments: group.destinationSegments,
    firstNewFolderIndex: fileItFirstNewFolderIndex(group.destinationSegments, existingFolders),
    itemNames: group.itemNames,
    hasFolder: group.hasFolder,
    firstDocumentThumbnailUri: group.firstDocumentThumbnailUri,
  }))
}
