import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Document, Folder } from '../lib/types'
import { listActiveFolderShareLinks, revokeFolderShareLink } from '../lib/folderShareLinks'
import { listActiveDocumentShareLinks, revokeDocumentShareLink } from '../lib/documentShareLinks'
import ConfirmDialog from './ConfirmDialog'
import { DocIcon, FolderIcon, TrashIcon } from './icons'

type SharedLinkItem = {
  kind: 'folder' | 'document'
  targetId: string
  name: string
  token: string
}

type StopConfirmState =
  | { mode: 'one'; item: SharedLinkItem }
  | { mode: 'all'; count: number }
  | null

type Props = {
  userId: string
  folders: Folder[]
  documents: Document[]
}

export default function SharedLinksPanel({ userId, folders, documents }: Props) {
  const [items, setItems] = useState<SharedLinkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [stopConfirm, setStopConfirm] = useState<StopConfirmState>(null)
  const [stopConfirmError, setStopConfirmError] = useState<string | null>(null)

  const foldersById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders])
  const documentsById = useMemo(() => new Map(documents.map((d) => [d.id, d])), [documents])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [folderLinks, documentLinks] = await Promise.all([
        listActiveFolderShareLinks(userId),
        listActiveDocumentShareLinks(userId),
      ])
      const next: SharedLinkItem[] = [
        ...folderLinks.map((link) => ({
          kind: 'folder' as const,
          targetId: link.folder_id,
          name: foldersById.get(link.folder_id)?.name?.trim() || 'Untitled folder',
          token: link.token,
        })),
        ...documentLinks.map((link) => ({
          kind: 'document' as const,
          targetId: link.document_id,
          name: documentsById.get(link.document_id)?.title?.trim() || 'Untitled document',
          token: link.token,
        })),
      ]
      next.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      setItems(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load shared links.')
    } finally {
      setLoading(false)
    }
  }, [documentsById, foldersById, userId])

  useEffect(() => {
    void load()
  }, [load])

  async function revokeOne(item: SharedLinkItem) {
    if (item.kind === 'folder') {
      await revokeFolderShareLink(userId, item.targetId)
    } else {
      await revokeDocumentShareLink(userId, item.targetId)
    }
  }

  async function handleConfirmStop() {
    if (!stopConfirm) return
    setBusy(true)
    setStopConfirmError(null)
    try {
      if (stopConfirm.mode === 'one') {
        await revokeOne(stopConfirm.item)
      } else {
        await Promise.all(items.map((item) => revokeOne(item)))
      }
      setStopConfirm(null)
      await load()
    } catch (err) {
      setStopConfirmError(err instanceof Error ? err.message : 'Could not stop sharing.')
    } finally {
      setBusy(false)
    }
  }

  const stopConfirmTitle =
    stopConfirm?.mode === 'all'
      ? `Stop sharing all ${stopConfirm.count} links?`
      : stopConfirm
        ? `Stop sharing "${stopConfirm.item.name}"?`
        : ''

  const stopConfirmMessage =
    stopConfirm?.mode === 'all'
      ? 'Anyone with these links will no longer be able to open them.'
      : stopConfirm?.item.kind === 'folder'
        ? 'Anyone with the link will no longer be able to open this folder.'
        : 'Anyone with the link will no longer be able to open this document.'

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
      {loading ? (
        <p className="text-sm text-filr-muted">Loading shared links…</p>
      ) : error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-filr-muted">No shared links</p>
      ) : (
        <>
          {items.length > 1 ? (
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setStopConfirmError(null)
                  setStopConfirm({ mode: 'all', count: items.length })
                }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-filr-border px-3 py-2 text-sm font-semibold text-red-400 transition hover:border-red-400/60 hover:bg-red-500/10 disabled:opacity-60"
              >
                <TrashIcon className="h-4 w-4" />
                Stop all
              </button>
            </div>
          ) : null}
          <div className="overflow-hidden rounded-xl border border-filr-border bg-filr-surface">
            {items.map((item, index) => (
              <div
                key={`${item.kind}-${item.targetId}`}
                className={`flex items-center gap-3 px-4 py-3 ${
                  index > 0 ? 'border-t border-filr-border' : ''
                }`}
              >
                {item.kind === 'folder' ? (
                  <FolderIcon className="h-5 w-5 shrink-0 text-filr-accent" />
                ) : (
                  <DocIcon className="h-5 w-5 shrink-0 text-filr-accent" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-filr-text">{item.name}</p>
                  <p className="text-xs text-filr-muted">{item.kind === 'folder' ? 'Folder' : 'Document'}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setStopConfirmError(null)
                    setStopConfirm({ mode: 'one', item })
                  }}
                  className="shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-60"
                >
                  Stop
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {stopConfirm ? (
        <ConfirmDialog
          title={stopConfirmTitle}
          message={stopConfirmMessage}
          confirmLabel="Stop sharing"
          destructive
          busy={busy}
          busyLabel="Stopping…"
          error={stopConfirmError}
          onCancel={() => {
            if (busy) return
            setStopConfirm(null)
            setStopConfirmError(null)
          }}
          onConfirm={() => void handleConfirmStop()}
        />
      ) : null}
    </div>
  )
}
