import { useCallback, useEffect, useRef, useState } from 'react'
import type { Document, Folder } from '../lib/types'
import {
  fetchRecentlyDeletedItems,
  permanentlyDeleteRecentlyDeleted,
  recoverRecentlyDeletedItems,
} from '../data/filr'
import { recentlyDeletedDaysLabel, type RecentlyDeletedItem } from '../lib/recentlyDeleted'
import { CheckIcon, DocIcon, FolderIcon } from './icons'

export type RecentlyDeletedToolbarState = {
  selectedCount: number
  canRecover: boolean
  canDelete: boolean
  busy: boolean
  recover: () => void
  deleteForever: () => void
}

type Props = {
  userId: string
  folders: Folder[]
  documents: Document[]
  onChanged: () => void
  onToolbarChange?: (state: RecentlyDeletedToolbarState | null) => void
}

export default function RecentlyDeletedPanel({
  userId,
  folders,
  documents,
  onChanged,
  onToolbarChange,
}: Props) {
  const [items, setItems] = useState<RecentlyDeletedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number; scroll0: number } | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const loadItems = useCallback(async () => {
    setError(null)
    try {
      const list = await fetchRecentlyDeletedItems(userId)
      setItems(list)
      setSelected((prev) => {
        const ids = new Set(list.map((item) => item.id))
        const next = new Set([...prev].filter((id) => ids.has(id)))
        return next.size === prev.size ? prev : next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Recently Deleted.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectedItems = useCallback(
    () => items.filter((item) => selected.has(item.id)),
    [items, selected],
  )

  const recoverSelected = useCallback(async () => {
    const picked = selectedItems().filter((item) => item.kind === 'folder' || item.kind === 'document')
    if (picked.length === 0) return
    const title =
      picked.length === 1 ? `Recover “${picked[0].name}”?` : `Recover ${picked.length} items?`
    if (!window.confirm(title)) return
    setBusy(true)
    setError(null)
    try {
      await recoverRecentlyDeletedItems(userId, picked, [...folders], [...documents])
      setSelected(new Set())
      await loadItems()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not recover items.')
    } finally {
      setBusy(false)
    }
  }, [selectedItems, userId, folders, documents, loadItems, onChanged])

  const deleteSelected = useCallback(async () => {
    const picked = selectedItems()
    if (picked.length === 0) return
    const title =
      picked.length === 1 ? `Delete “${picked[0].name}” permanently?` : `Delete ${picked.length} items permanently?`
    const detail =
      picked.length === 1 && picked[0].kind === 'document'
        ? 'Its files will be removed from storage.'
        : 'This cannot be undone.'
    if (!window.confirm(`${title} ${detail}`)) return
    setBusy(true)
    setError(null)
    try {
      await permanentlyDeleteRecentlyDeleted(userId, picked)
      setSelected(new Set())
      await loadItems()
      if (picked.some((item) => item.kind === 'document' || item.kind === 'folder')) onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete items.')
    } finally {
      setBusy(false)
    }
  }, [selectedItems, userId, loadItems, onChanged])

  const canRecover = selectedItems().some((item) => item.kind === 'folder' || item.kind === 'document')
  const canDelete = selected.size > 0

  useEffect(() => {
    if (!onToolbarChange) return
    onToolbarChange({
      selectedCount: selected.size,
      canRecover,
      canDelete,
      busy,
      recover: () => void recoverSelected(),
      deleteForever: () => void deleteSelected(),
    })
  }, [onToolbarChange, selected.size, canRecover, canDelete, busy, recoverSelected, deleteSelected])

  useEffect(() => {
    return () => onToolbarChange?.(null)
  }, [onToolbarChange])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (e.metaKey || e.ctrlKey) return
      if (selected.size === 0 || busy) return
      e.preventDefault()
      void deleteSelected()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected.size, busy, deleteSelected])

  useEffect(() => {
    if (!marquee) return
    function onMove(e: MouseEvent) {
      setMarquee((m) => (m ? { ...m, x1: e.clientX, y1: e.clientY } : m))
      const container = listRef.current
      if (!container) return
      // Convert client coords to container-content coords so items scrolled out of
      // view are still hit-tested correctly.
      const cr = container.getBoundingClientRect()
      const toContentY = (clientY: number, capturedScroll: number) =>
        clientY - cr.top + capturedScroll
      const y0 = toContentY(marquee!.y0, marquee!.scroll0)
      const y1 = toContentY(e.clientY, container.scrollTop)
      const top = Math.min(y0, y1)
      const bottom = Math.max(y0, y1)
      // Horizontal: no scroll, plain client coords offset by container left
      const x0 = marquee!.x0 - cr.left
      const x1 = e.clientX - cr.left
      const left = Math.min(x0, x1)
      const right = Math.max(x0, x1)
      const next = new Set<string>()
      container.querySelectorAll('[data-rd-selkey]').forEach((node) => {
        const r = node.getBoundingClientRect()
        const itemTop = r.top - cr.top + container.scrollTop
        const itemBottom = r.bottom - cr.top + container.scrollTop
        const itemLeft = r.left - cr.left
        const itemRight = r.right - cr.left
        const hit = !(itemRight < left || itemLeft > right || itemBottom < top || itemTop > bottom)
        if (hit) {
          const k = node.getAttribute('data-rd-selkey')
          if (k) next.add(k)
        }
      })
      setSelected(next)
    }
    function onUp() {
      setMarquee(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [marquee])

  function onListMouseDown(e: React.MouseEvent) {
    if (e.button !== 0 || busy) return
    const target = e.target as HTMLElement
    if (target.closest('[data-rd-selkey]')) return
    setSelected(new Set())
    setMarquee({ x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY, scroll0: listRef.current?.scrollTop ?? 0 })
  }

  const marqueeRect = marquee
    ? {
        left: Math.min(marquee.x0, marquee.x1),
        top: Math.min(marquee.y0, marquee.y1),
        width: Math.abs(marquee.x1 - marquee.x0),
        height: Math.abs(marquee.y1 - marquee.y0),
      }
    : null

  return (
    <div
      ref={listRef}
      className="relative min-h-0 flex-1 select-none overflow-y-auto px-6 py-5"
      onMouseDown={onListMouseDown}
    >
      {loading ? (
        <p className="text-sm text-filr-muted">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-filr-text">Nothing here.</p>
          <p className="mt-1 max-w-xs text-sm text-filr-muted">
            Deleted folders and documents appear here for 30 days before they are removed permanently.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <RecentlyDeletedRow
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              disabled={busy}
              onToggle={() => toggleSelect(item.id)}
            />
          ))}
        </ul>
      )}

      {marqueeRect ? (
        <div
          className="pointer-events-none fixed z-[100] border border-filr-accent/70 bg-filr-accent/10"
          style={marqueeRect}
        />
      ) : null}
    </div>
  )
}

function RecentlyDeletedRow({
  item,
  selected,
  disabled,
  onToggle,
}: {
  item: RecentlyDeletedItem
  selected: boolean
  disabled: boolean
  onToggle: () => void
}) {
  const isVault = item.kind === 'id'
  const kindLabel = item.kind === 'folder' ? 'Folder' : item.kind === 'document' ? 'Document' : 'Vault'

  return (
    <li
      data-rd-selkey={item.id}
      onClick={() => {
        if (disabled) return
        onToggle()
      }}
      className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-filr-bg/30 px-4 py-3 transition ${
        selected
          ? 'border-filr-accent ring-2 ring-filr-accent/60'
          : 'border-filr-border hover:border-filr-accent/40'
      } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-filr-surface-2 text-filr-muted">
        {item.kind === 'folder' ? <FolderIcon className="h-5 w-5" /> : <DocIcon className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-filr-text">{item.name}</p>
        <p className="text-xs text-filr-muted">
          {kindLabel} · {recentlyDeletedDaysLabel(item.deletedAt)} left
          {isVault ? ' · recover in the Filr app' : ''}
        </p>
      </div>
      {selected ? (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-filr-accent text-filr-accent-fg">
          <CheckIcon className="h-3 w-3" />
        </span>
      ) : null}
    </li>
  )
}
