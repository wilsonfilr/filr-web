import { createFolder, deleteFolder, moveDocument, moveFolder } from '../data/filr'
import type { Document, Folder } from './types'
import {
  fileItDestinationGroupKey,
  fileItSuggestionDisplaySegments,
  type FileItItem,
  type FileItSuggestion,
} from './fileItPaths'

type MoveRecord = {
  kind: 'folder' | 'document'
  id: string
  from: string | null
  to: string | null
}

export async function applyFileItSuggestions(
  userId: string,
  selectedItems: FileItItem[],
  suggestions: FileItSuggestion[],
  folders: Folder[],
  documents: Document[],
): Promise<{ movedCount: number; toName: string; undo: () => Promise<void> }> {
  const workingFolders: Folder[] = folders.map((f) => ({ ...f }))
  const createdFolderIds: string[] = []
  const moves: MoveRecord[] = []

  const findChild = (parentId: string | null, name: string) =>
    workingFolders.find(
      (f) => f.parentId === parentId && f.name.trim().toLowerCase() === name.trim().toLowerCase(),
    ) ?? null

  const isDescendantParent = (candidateParentId: string | null, folderId: string) => {
    let cursor = candidateParentId
    while (cursor) {
      if (cursor === folderId) return true
      cursor = workingFolders.find((f) => f.id === cursor)?.parentId ?? null
    }
    return false
  }

  async function ensurePath(segments: string[]): Promise<string | null> {
    let parentId: string | null = null
    for (const raw of segments) {
      const seg = raw.trim()
      if (!seg) continue
      const existing = findChild(parentId, seg)
      if (existing) {
        parentId = existing.id
        continue
      }
      const created = await createFolder(userId, seg, parentId)
      workingFolders.push(created)
      createdFolderIds.push(created.id)
      parentId = created.id
    }
    return parentId
  }

  for (const s of suggestions) {
    const destinationId = await ensurePath(s.destinationSegments)
    const sourceItem = selectedItems.find((it) => it.id === s.itemId)
    if (!sourceItem || !destinationId) continue
    if (sourceItem.kind === 'folder') {
      if (!isDescendantParent(destinationId, s.itemId)) {
        moves.push({
          kind: 'folder',
          id: s.itemId,
          from: workingFolders.find((f) => f.id === s.itemId)?.parentId ?? null,
          to: destinationId,
        })
      }
    } else {
      moves.push({
        kind: 'document',
        id: s.itemId,
        from: documents.find((d) => d.id === s.itemId)?.folderId ?? null,
        to: destinationId,
      })
    }
  }

  for (const m of moves) {
    if (m.kind === 'document') await moveDocument(userId, m.id, m.to)
    else await moveFolder(userId, m.id, m.to)
  }

  const undo = async () => {
    for (const m of moves) {
      if (m.kind === 'document') await moveDocument(userId, m.id, m.from)
      else await moveFolder(userId, m.id, m.from)
    }
    for (const id of [...createdFolderIds].reverse()) {
      await deleteFolder(userId, id)
    }
  }

  const movedCount = moves.length
  let toName = 'Folder'
  const pathKeys = new Set<string>()
  for (const s of suggestions) {
    if (!moves.some((m) => m.id === s.itemId)) continue
    const sourceItem = selectedItems.find((it) => it.id === s.itemId)
    if (!sourceItem) continue
    const displaySegs = fileItSuggestionDisplaySegments(s, sourceItem.name)
    const sk = fileItDestinationGroupKey(displaySegs)
    if (sk) pathKeys.add(sk)
    if (displaySegs.length > 0) toName = displaySegs[displaySegs.length - 1] ?? toName
  }
  if (pathKeys.size > 1) toName = 'multiple folders'

  return { movedCount, toName, undo }
}
