import { useEffect, useMemo, useState } from 'react'
import JSZip from 'jszip'
import { fetchSharedFolderByToken, type SharedFolderPayload } from '../lib/folderShareLinks'
import { DownloadIcon, FolderIcon } from './icons'

const IOS_APP_STORE_URL = 'https://apps.apple.com/app/id6769156788'

type SharedFolder = SharedFolderPayload['folders'][number]
type SharedFile = SharedFolderPayload['files'][number]

type TreeNode = {
  folder: SharedFolder
  children: TreeNode[]
  files: SharedFile[]
}

function buildFolderTree(payload: SharedFolderPayload): TreeNode | null {
  const root = payload.folders.find((f) => f.parentId === null)
  if (!root) return null

  const foldersById = new Map(payload.folders.map((f) => [f.id, f]))
  const filesByFolder = new Map<string, SharedFile[]>()
  for (const file of payload.files) {
    if (!file.folderId) continue
    const list = filesByFolder.get(file.folderId) ?? []
    list.push(file)
    filesByFolder.set(file.folderId, list)
  }

  const build = (folder: SharedFolder): TreeNode => ({
    folder,
    files: (filesByFolder.get(folder.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    children: payload.folders
      .filter((f) => f.parentId === folder.id)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(build),
  })

  if (!foldersById.has(root.id)) return null
  return build(root)
}

function folderPathSegments(
  folderId: string | null,
  foldersById: Map<string, SharedFolder>,
  rootName: string,
): string[] {
  if (folderId === null) return [rootName]
  const chain: string[] = []
  let cur: string | null = folderId
  while (cur) {
    const folder = foldersById.get(cur)
    if (!folder) break
    chain.unshift(folder.name)
    cur = folder.parentId
  }
  return chain.length > 0 ? chain : [rootName]
}

function TreeSection({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  return (
    <div className={depth > 0 ? 'ml-4 border-l border-[#2a3848] pl-4' : ''}>
      <div className="mb-2 flex items-center gap-2 py-2">
        <FolderIcon className="h-5 w-5 shrink-0 text-[#6DAFEF]" />
        <span className="text-sm font-semibold text-[#EBF3FE]">{node.folder.name}</span>
      </div>
      {node.files.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {node.files.map((file) => (
            <li key={file.id}>
              <a
                href={file.signedUrl}
                download={file.name}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-[#2a3848] bg-[#1D2A36] px-4 py-3 text-sm text-[#EBF3FE] transition hover:border-[#6DAFEF]/60"
              >
                <span className="min-w-0 truncate">{file.name}</span>
                <DownloadIcon className="h-4 w-4 shrink-0 text-[#6DAFEF]" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {node.children.map((child) => (
        <TreeSection key={child.folder.id} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

type Props = {
  token: string
}

export default function PublicSharePage({ token }: Props) {
  const [payload, setPayload] = useState<SharedFolderPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setUnavailable(false)
    void fetchSharedFolderByToken(token)
      .then((data) => {
        if (!active) return
        setPayload(data)
      })
      .catch(() => {
        if (!active) return
        setUnavailable(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [token])

  const tree = useMemo(() => (payload ? buildFolderTree(payload) : null), [payload])

  async function handleDownloadAll() {
    if (!payload || payload.files.length === 0) return
    setDownloadingAll(true)
    setDownloadError(null)
    try {
      const zip = new JSZip()
      const foldersById = new Map(payload.folders.map((f) => [f.id, f]))
      const usedPaths = new Set<string>()

      for (const file of payload.files) {
        const segments = folderPathSegments(file.folderId, foldersById, payload.folderName)
        let path = `${segments.join('/')}/${file.name}`
        if (usedPaths.has(path)) {
          const dot = file.name.lastIndexOf('.')
          const stem = dot > 0 ? file.name.slice(0, dot) : file.name
          const ext = dot > 0 ? file.name.slice(dot) : ''
          let n = 2
          while (usedPaths.has(`${segments.join('/')}/${stem} (${n})${ext}`)) n += 1
          path = `${segments.join('/')}/${stem} (${n})${ext}`
        }
        usedPaths.add(path)

        const response = await fetch(file.signedUrl)
        if (!response.ok) {
          throw new Error(`Could not download ${file.name}`)
        }
        const blob = await response.blob()
        zip.file(path, blob)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${payload.folderName.replace(/[<>:"/\\|?*]/g, '_') || 'shared-folder'}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed.')
    } finally {
      setDownloadingAll(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a1117] text-[#EBF3FE]">
      <div className="page-gradient min-h-screen">
        <div className="mx-auto max-w-3xl px-5 py-10">
          {loading ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#2a3848] border-t-[#6DAFEF]" />
              <p className="mt-4 text-sm text-[#9EA6B5]">Loading shared folder…</p>
            </div>
          ) : unavailable ? (
            <div className="rounded-2xl border border-[#2a3848] bg-[#1D2A36] px-6 py-12 text-center">
              <h1 className="text-xl font-semibold text-[#EBF3FE]">This link is no longer available</h1>
              <p className="mt-2 text-sm text-[#9EA6B5]">
                The owner may have stopped sharing, or the folder was removed.
              </p>
            </div>
          ) : payload && tree ? (
            <>
              <header className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6DAFEF]">Shared folder</p>
                <h1 className="mt-2 text-3xl font-semibold text-[#EBF3FE]">{payload.folderName}</h1>
                <p className="mt-2 text-sm text-[#9EA6B5]">
                  {payload.files.length} file{payload.files.length === 1 ? '' : 's'} · view and download without signing in
                </p>
                {payload.files.length > 0 ? (
                  <button
                    type="button"
                    disabled={downloadingAll}
                    onClick={() => void handleDownloadAll()}
                    className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#6DAFEF] px-5 py-3 text-sm font-semibold text-[#101922] transition hover:opacity-90 disabled:opacity-60"
                  >
                    {downloadingAll ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#101922]/30 border-t-[#101922]" />
                    ) : (
                      <DownloadIcon className="h-4 w-4" />
                    )}
                    Download All
                  </button>
                ) : null}
                {downloadError ? (
                  <p className="mt-3 text-sm text-red-300">{downloadError}</p>
                ) : null}
              </header>

              <section className="rounded-2xl border border-[#2a3848] bg-[#101922]/80 p-5">
                {payload.files.length === 0 && tree.children.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#9EA6B5]">This folder is empty.</p>
                ) : (
                  <TreeSection node={tree} />
                )}
              </section>
            </>
          ) : null}

          <footer className="mt-12 border-t border-[#2a3848] pt-6 text-center text-sm text-[#9EA6B5]">
            Shared via Filr —{' '}
            <a
              href={IOS_APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#6DAFEF] hover:underline"
            >
              Get the app
            </a>
          </footer>
        </div>
      </div>
    </div>
  )
}
