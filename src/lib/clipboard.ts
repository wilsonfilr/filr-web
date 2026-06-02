import type { Document, Folder } from './types'
import type { DragItem } from './dnd'

export type ClipboardState = {
  mode: 'copy' | 'cut'
  items: DragItem[]
}

export function itemParentFolder(
  item: DragItem,
  foldersById: Map<string, Folder>,
  docsById: Map<string, Document>,
): string | null {
  if (item.type === 'document') return docsById.get(item.id)?.folderId ?? null
  return foldersById.get(item.id)?.parentId ?? null
}

export function wouldPasteIntoSameFolder(
  items: DragItem[],
  targetFolderId: string | null,
  foldersById: Map<string, Folder>,
  docsById: Map<string, Document>,
): boolean {
  if (items.length === 0) return false
  return items.every((item) => itemParentFolder(item, foldersById, docsById) === targetFolderId)
}

export function topLevelSelectedFolderIds(folderIds: string[], folders: Folder[]): string[] {
  const set = new Set(folderIds)
  return folderIds.filter((id) => {
    let current = folders.find((f) => f.id === id)
    while (current?.parentId) {
      if (set.has(current.parentId)) return false
      current = folders.find((f) => f.id === current!.parentId)
    }
    return true
  })
}
