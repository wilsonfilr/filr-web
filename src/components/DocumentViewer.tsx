import { useEffect, useState } from 'react'
import type { Document, UserTag } from '../lib/types'
import {
  downloadDocumentPdfById,
  listDocumentAssets,
  pdfStoragePath,
  renameDocument,
  softDeleteDocument,
} from '../data/filr'
import {
  downloadStorageObjectUrl,
  revokeStorageObjectUrl,
  storageObjectExists,
} from '../lib/storageAssets'
import { CloseIcon, DownloadIcon, TrashIcon } from './icons'
import TagChip from './TagChip'

type Props = {
  doc: Document
  userId: string
  tagsById: Map<string, UserTag>
  onClose: () => void
  onChanged: () => void
}

export default function DocumentViewer({ doc, userId, tagsById, onClose, onChanged }: Props) {
  const [pageUrls, setPageUrls] = useState<string[]>([])
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [hasPdf, setHasPdf] = useState(false)
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState(doc.title)
  const [savingTitle, setSavingTitle] = useState(false)
  const [busy, setBusy] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const objectUrls: string[] = []
    setLoading(true)
    ;(async () => {
      const { pdfPath, pagePaths } = await listDocumentAssets(userId, doc.id)
      const pages: string[] = []
      for (const path of pagePaths) {
        const url = await downloadStorageObjectUrl(path)
        if (!url) continue
        objectUrls.push(url)
        pages.push(url)
      }

      let pdf: string | null = null
      const path = pdfPath ?? pdfStoragePath(userId, doc.id)
      if (await storageObjectExists(path)) {
        pdf = await downloadStorageObjectUrl(path)
        if (pdf) objectUrls.push(pdf)
      }

      if (!active) return
      setHasPdf(Boolean(pdf))
      setPdfUrl(pdf)
      setPageUrls(pages)
      setLoading(false)
    })().catch((err) => {
      console.warn('[DocumentViewer] failed to load assets', err)
      if (!active) return
      setHasPdf(false)
      setPdfUrl(null)
      setPageUrls([])
      setLoading(false)
    })
    return () => {
      active = false
      for (const url of objectUrls) revokeStorageObjectUrl(url)
    }
  }, [doc.id, userId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function saveTitle() {
    const next = title.trim()
    if (!next || next === doc.title) {
      setTitle(doc.title)
      return
    }
    setSavingTitle(true)
    try {
      await renameDocument(userId, doc.id, next)
      onChanged()
    } finally {
      setSavingTitle(false)
    }
  }

  async function handleDownloadPdf() {
    setDownloadError(null)
    setDownloadingPdf(true)
    try {
      await downloadDocumentPdfById(userId, doc.id, title)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete “${doc.title}”? It will be in Recently Deleted for 30 days.`)) return
    setBusy(true)
    try {
      await softDeleteDocument(userId, doc)
      onChanged()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto flex h-full w-full max-w-5xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-filr-border bg-filr-surface px-4 py-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-base font-semibold text-filr-text outline-none transition hover:border-filr-border focus:border-filr-accent focus:bg-filr-bg/60"
          />
          {savingTitle && <span className="text-xs text-filr-muted">Saving…</span>}
          {hasPdf && (
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-1.5 rounded-lg border border-filr-border px-3 py-1.5 text-sm font-medium text-filr-text transition hover:border-filr-accent/60 disabled:opacity-60"
            >
              {downloadingPdf ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-filr-border border-t-filr-accent" />
              ) : (
                <DownloadIcon className="h-4 w-4" />
              )}
              {downloadingPdf ? 'Downloading…' : 'PDF'}
            </button>
          )}
          {downloadError ? <span className="text-xs text-red-400">{downloadError}</span> : null}
          <button
            onClick={handleDelete}
            disabled={busy}
            title="Delete document"
            className="inline-flex items-center justify-center rounded-lg border border-filr-border p-2 text-filr-muted transition hover:border-red-500/50 hover:text-red-300 disabled:opacity-50"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-filr-border p-2 text-filr-muted transition hover:border-filr-accent/60 hover:text-filr-text"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto bg-filr-bg/40 p-4 sm:p-8">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-filr-muted">
              Loading…
            </div>
          ) : pageUrls.length > 0 ? (
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
              {pageUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Page ${i + 1}`}
                  className="w-full rounded-lg border border-filr-border shadow-lg shadow-black/40"
                />
              ))}
            </div>
          ) : pdfUrl ? (
            <iframe
              title={doc.title}
              src={pdfUrl}
              className="mx-auto h-full w-full max-w-3xl rounded-lg border border-filr-border bg-white"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-filr-muted">
              <p>No file is available for this document yet.</p>
              {doc.ocrText ? (
                <p className="max-w-md whitespace-pre-wrap text-left text-filr-muted/80">
                  {doc.ocrText}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {doc.tagIds.length > 0 && (
          <footer className="flex flex-wrap gap-1.5 border-t border-filr-border bg-filr-surface px-4 py-3">
            {doc.tagIds.map((id) => {
              const tag = tagsById.get(id)
              return tag ? <TagChip key={id} tag={tag} /> : null
            })}
          </footer>
        )}
      </div>
    </div>
  )
}
