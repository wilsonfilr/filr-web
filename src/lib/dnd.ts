export type DragItem = { type: 'document' | 'folder'; id: string }

export const DND_MIME = 'application/x-filr'

export function isExternalFileDrag(e: { dataTransfer: DataTransfer | null }): boolean {
  const types = e.dataTransfer?.types
  if (!types) return false
  const list = Array.from(types)
  if (list.includes(DND_MIME)) return false
  return list.includes('Files')
}

export function setDragData(e: React.DragEvent, items: DragItem[]) {
  e.dataTransfer.setData(DND_MIME, JSON.stringify(items))
  e.dataTransfer.effectAllowed = 'move'
}

export function getDragData(e: React.DragEvent): DragItem[] | null {
  try {
    const raw = e.dataTransfer.getData(DND_MIME)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const items = parsed.filter(
      (p): p is DragItem =>
        p && (p.type === 'document' || p.type === 'folder') && typeof p.id === 'string',
    )
    return items.length > 0 ? items : null
  } catch {
    return null
  }
}

export function selKey(item: DragItem): string {
  return `${item.type}:${item.id}`
}
