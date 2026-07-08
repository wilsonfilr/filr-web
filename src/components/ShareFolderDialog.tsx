import { useCallback, useEffect, useState } from 'react'
import {
  buildFolderShareUrl,
  createOrReuseFolderShareLink,
  getActiveFolderShareLink,
  revokeFolderShareLink,
  type FolderShareLinkRow,
} from '../lib/folderShareLinks'
import {
  buildDocumentShareUrl,
  createOrReuseDocumentShareLink,
  getActiveDocumentShareLink,
  revokeDocumentShareLink,
  type DocumentShareLinkRow,
} from '../lib/documentShareLinks'
import { copyTextToClipboard } from '../lib/clipboard'
import ConfirmDialog from './ConfirmDialog'
import { CloseIcon, CopyIcon, ExportIcon } from './icons'

type FolderProps = {
  kind: 'folder'
  folderId: string
  folderName: string
  userId: string
  onClose: () => void
}

type DocumentProps = {
  kind: 'document'
  documentId: string
  documentName: string
  userId: string
  onClose: () => void
}

type Props = FolderProps | DocumentProps

export default function ShareFolderDialog(props: Props) {
  const { userId, onClose } = props
  const isFolder = props.kind === 'folder'
  const targetId = isFolder ? props.folderId : props.documentId
  const targetName = isFolder ? props.folderName : props.documentName
  const dialogTitle = isFolder ? 'Share folder' : 'Share document'

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState<FolderShareLinkRow | DocumentShareLinkRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false)
  const [stopConfirmError, setStopConfirmError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (isFolder) {
        const active = await getActiveFolderShareLink(userId, targetId)
        if (active) {
          setLink(active)
          return
        }
        const created = await createOrReuseFolderShareLink(userId, targetId)
        setLink(created)
        return
      }
      const active = await getActiveDocumentShareLink(userId, targetId)
      if (active) {
        setLink(active)
        return
      }
      const created = await createOrReuseDocumentShareLink(userId, targetId)
      setLink(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create share link.')
    } finally {
      setLoading(false)
    }
  }, [isFolder, targetId, userId])

  useEffect(() => {
    void load()
  }, [load])

  const shareUrl = link
    ? isFolder
      ? buildFolderShareUrl(link.token)
      : buildDocumentShareUrl(link.token)
    : null

  async function handleCopy() {
    if (!shareUrl) return
    const ok = await copyTextToClipboard(shareUrl)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleStopSharing() {
    setBusy(true)
    setStopConfirmError(null)
    try {
      if (isFolder) {
        await revokeFolderShareLink(userId, targetId)
      } else {
        await revokeDocumentShareLink(userId, targetId)
      }
      setLink(null)
      setStopConfirmOpen(false)
      onClose()
    } catch (err) {
      setStopConfirmError(err instanceof Error ? err.message : 'Could not stop sharing.')
    } finally {
      setBusy(false)
    }
  }

  const stopConfirmTitle = `Stop sharing "${targetName}"?`
  const stopConfirmMessage = isFolder
    ? 'Anyone with the link will no longer be able to open this folder.'
    : 'Anyone with the link will no longer be able to open this document.'

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-[#2a3848] bg-[#1D2A36] p-5 shadow-xl"
        role="dialog"
        aria-labelledby="share-link-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="share-link-title" className="text-lg font-semibold text-[#EBF3FE]">
              {dialogTitle}
            </h2>
            <p className="mt-1 text-sm text-[#9EA6B5]">{targetName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#2a3848] p-2 text-[#9EA6B5] transition hover:border-[#6DAFEF]/50 hover:text-[#EBF3FE]"
            aria-label="Close"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-[#9EA6B5]">Preparing link…</p>
        ) : error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
        ) : shareUrl ? (
          <>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#9EA6B5]">
              Anyone with this link can view and download
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-[#2a3848] bg-[#101922] px-3 py-2.5">
              <ExportIcon className="h-4 w-4 shrink-0 text-[#6DAFEF]" />
              <p className="min-w-0 flex-1 truncate text-sm text-[#EBF3FE]">{shareUrl}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#6DAFEF] px-4 py-2.5 text-sm font-semibold text-[#101922] transition hover:opacity-90"
              >
                <CopyIcon className="h-4 w-4" />
                {copied ? 'Copied' : 'Copy Link'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setStopConfirmError(null)
                  setStopConfirmOpen(true)
                }}
                className="inline-flex cursor-pointer items-center rounded-xl border border-[#2a3848] px-4 py-2.5 text-sm font-semibold text-[#EBF3FE] transition hover:border-red-400/60 hover:text-red-300 disabled:opacity-60"
              >
                Stop Sharing
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>

    {stopConfirmOpen ? (
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
          setStopConfirmOpen(false)
          setStopConfirmError(null)
        }}
        onConfirm={() => void handleStopSharing()}
      />
    ) : null}
    </>
  )
}
