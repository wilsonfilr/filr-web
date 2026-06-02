import { useMemo, useState } from 'react'
import type { Folder } from '../lib/types'
import { CloseIcon, FolderIcon, HomeIcon } from './icons'

type Props = {
  folders: Folder[]
  count: number
  canSelect: (targetFolderId: string | null) => boolean
  onMove: (targetFolderId: string | null) => void
  onClose: () => void
}

type Row = { id: string | null; name: string; depth: number }

export default function MoveDialog({ folders, count, canSelect, onMove, onClose }: Props) {
  const [target, setTarget] = useState<string | null>(null)

  const rows = useMemo<Row[]>(() => {
    const childrenByParent = new Map<string | null, Folder[]>()
    for (const f of folders) {
      const list = childrenByParent.get(f.parentId) ?? []
      list.push(f)
      childrenByParent.set(f.parentId, list)
    }
    const out: Row[] = [{ id: null, name: 'Home', depth: 0 }]
    const walk = (parentId: string | null, depth: number) => {
      for (const f of childrenByParent.get(parentId) ?? []) {
        out.push({ id: f.id, name: f.name, depth })
        walk(f.id, depth + 1)
      }
    }
    walk(null, 1)
    return out
  }, [folders])

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-filr-border bg-filr-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-filr-border px-5 py-4">
          <h2 className="text-base font-semibold text-filr-text">
            Move {count} {count === 1 ? 'item' : 'items'}
          </h2>
          <button
            onClick={onClose}
            className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-filr-muted transition hover:bg-filr-surface-2 hover:text-filr-text"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {rows.map((row) => {
            const selectable = canSelect(row.id)
            const active = target === row.id
            return (
              <button
                key={row.id ?? 'home'}
                disabled={!selectable}
                onClick={() => setTarget(row.id)}
                style={{ paddingLeft: `${row.depth * 16 + 12}px` }}
                className={`flex w-full items-center gap-2 rounded-lg py-2 pr-3 text-sm transition ${
                  active
                    ? 'bg-filr-accent/15 text-filr-text ring-1 ring-filr-accent/60'
                    : selectable
                      ? 'text-filr-text hover:bg-filr-surface-2'
                      : 'cursor-not-allowed text-filr-muted/40'
                }`}
              >
                {row.id === null ? (
                  <HomeIcon className="h-4 w-4 shrink-0" />
                ) : (
                  <FolderIcon className="h-4 w-4 shrink-0 text-filr-accent/80" />
                )}
                <span className="truncate">{row.name}</span>
              </button>
            )
          })}
        </div>

        <footer className="flex justify-end gap-2 border-t border-filr-border px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-filr-border px-3 py-2 text-sm font-medium text-filr-muted transition hover:text-filr-text"
          >
            Cancel
          </button>
          <button
            disabled={!canSelect(target)}
            onClick={() => onMove(target)}
            className="rounded-lg bg-filr-accent px-4 py-2 text-sm font-semibold text-filr-accent-fg transition hover:opacity-90 disabled:opacity-50"
          >
            Move here
          </button>
        </footer>
      </div>
    </div>
  )
}
