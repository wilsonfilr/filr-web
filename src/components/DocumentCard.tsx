import { useEffect, useState } from 'react'
import type { Document, UserTag } from '../lib/types'
import { pdfStoragePath } from '../data/filr'
import { renderPdfFirstPage } from '../lib/pdfThumb'
import {
  downloadStorageObjectUrl,
  revokeStorageObjectUrl,
  storageObjectExists,
} from '../lib/storageAssets'
import { type DragItem, setDragData } from '../lib/dnd'
import { CheckIcon, DocIcon } from './icons'
import TagChip from './TagChip'

type Props = {
  doc: Document
  userId: string
  tagsById: Map<string, UserTag>
  selected: boolean
  view?: 'grid' | 'list'
  listRowClass?: string
  onOpen: (doc: Document) => void
  onItemSelect: (e: React.MouseEvent, item: DragItem) => void
  onContextMenu: (e: React.MouseEvent, item: DragItem) => void
  dragPayloadFor: (item: DragItem) => DragItem[]
  onDragStart: (items: DragItem[]) => void
  onDragEnd: () => void
}

export default function DocumentCard({
  doc,
  userId,
  tagsById,
  selected,
  view = 'grid',
  listRowClass = 'flex cursor-pointer items-center gap-3 rounded-xl border bg-filr-surface px-4 py-3 text-left transition',
  onOpen,
  onItemSelect,
  onContextMenu,
  dragPayloadFor,
  onDragStart,
  onDragEnd,
}: Props) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const item: DragItem = { type: 'document', id: doc.id }

  useEffect(() => {
    let active = true
    const objectUrls: string[] = []
    setLoading(true)
    setThumbUrl(null)
    ;(async () => {
      const pagePath = `${userId}/${doc.id}_p0.jpg`
      if (await storageObjectExists(pagePath)) {
        const pageUrl = await downloadStorageObjectUrl(pagePath)
        if (pageUrl) objectUrls.push(pageUrl)
        if (!active) return
        if (pageUrl) {
          setThumbUrl(pageUrl)
          setLoading(false)
          return
        }
      }

      const pdfPath = pdfStoragePath(userId, doc.id)
      if (await storageObjectExists(pdfPath)) {
        const pdfObjectUrl = await downloadStorageObjectUrl(pdfPath)
        if (pdfObjectUrl) objectUrls.push(pdfObjectUrl)
        if (!active) return
        if (pdfObjectUrl) {
          const data = await renderPdfFirstPage(doc.id, pdfObjectUrl)
          if (!active) return
          if (data) {
            setThumbUrl(data)
            setLoading(false)
            return
          }
        }
      }
      setLoading(false)
    })()
    return () => {
      active = false
      for (const url of objectUrls) revokeStorageObjectUrl(url)
    }
  }, [doc.id, userId])

  const interaction = {
    'data-selkey': `document:${doc.id}`,
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      const items = dragPayloadFor(item)
      setDragData(e, items)
      onDragStart(items)
    },
    onDragEnd,
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) {
        e.preventDefault()
        onItemSelect(e, item)
      } else {
        onOpen(doc)
      }
    },
    onContextMenu: (e: React.MouseEvent) => onContextMenu(e, item),
  }

  const tagChips = doc.tagIds.length > 0 && (
    <div className="flex flex-wrap gap-1">
      {doc.tagIds.slice(0, 3).map((id) => {
        const tag = tagsById.get(id)
        return tag ? <TagChip key={id} tag={tag} /> : null
      })}
    </div>
  )

  if (view === 'list') {
    return (
      <div
        {...interaction}
        className={`${listRowClass} ${
          selected ? 'border-filr-accent ring-2 ring-filr-accent/60' : 'border-filr-border hover:border-filr-accent/60'
        }`}
      >
        <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded bg-filr-bg/60">
          {thumbUrl ? (
            <img src={thumbUrl} alt="" draggable={false} onError={() => setThumbUrl(null)} className="h-full w-full object-cover" />
          ) : loading ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-filr-border border-t-filr-accent/70" />
          ) : (
            <DocIcon className="h-5 w-5 text-filr-muted/50" />
          )}
        </div>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-filr-text">{doc.title}</p>
        {tagChips}
        {selected ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-filr-accent text-filr-accent-fg">
            <CheckIcon className="h-3 w-3" />
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div
      {...interaction}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-filr-surface text-left transition hover:shadow-lg hover:shadow-black/30 ${
        selected ? 'border-filr-accent ring-2 ring-filr-accent/60' : 'border-filr-border hover:border-filr-accent/60'
      }`}
    >
      <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-filr-bg/60">
        {selected && (
          <span className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-filr-accent text-filr-accent-fg">
            <CheckIcon className="h-3 w-3" />
          </span>
        )}
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={doc.title}
            loading="lazy"
            draggable={false}
            onError={() => setThumbUrl(null)}
            className="h-full w-full object-cover"
          />
        ) : loading ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-filr-border border-t-filr-accent/70" />
        ) : (
          <DocIcon className="h-12 w-12 text-filr-muted/50" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-filr-text">{doc.title}</p>
        {doc.tagIds.length > 0 && <div className="mt-auto">{tagChips}</div>}
      </div>
    </div>
  )
}
