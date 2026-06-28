import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTheme } from './hooks/useTheme'
import { supabase } from './lib/supabase'
import type { Document, Folder, UserTag } from './lib/types'
import { type DragItem, getDragData, setDragData } from './lib/dnd'
import { type ClipboardState, wouldPasteIntoSameFolder } from './lib/clipboard'
import {
  applySortOption,
  filterByTags,
  readStoredSortOption,
  storeSortOption,
  type SortOption,
} from './lib/sortAndFilter'
import { applyFileItSuggestions } from './lib/applyFileIt'
import type { FileItItem, FileItSuggestion } from './lib/fileItPaths'
import {
  getStorageLimitBytes,
  getStorageWarningPercent,
  isStorageUsageAtWarningLevel,
  StorageLimitError,
  formatStorageSize,
} from './lib/storageLimits'
import {
  copyItemsToFolder,
  removeCopiedItems,
  createFolder,
  downloadDocumentPdfById,
  moveItemsToRecentlyDeleted,
  recoverRecentlyDeletedItems,
  fetchDocuments,
  fetchFolders,
  fetchTags,
  getStorageUsage,
  moveDocument,
  moveFolder,
  renameDocument,
  renameFolder,
  setDocumentTags,
  setFolderTags,
  upsertTags,
  uploadPdfDocument,
  uploadImageDocument,
} from './data/filr'
import { deleteAccount } from './lib/authService'
import AuthScreen from './components/AuthScreen'
import MobileAppPrompt from './components/MobileAppPrompt'
import { useDeviceKind } from './hooks/useDeviceKind'
import Topbar from './components/Topbar'
import Sidebar from './components/Sidebar'
import DocumentCard from './components/DocumentCard'
import DocumentViewer from './components/DocumentViewer'
import TagsModal from './components/TagsModal'
import FileDropOverlay from './components/FileDropOverlay'
import SettingsModal, { type SettingsSection, type SettingsSubsheet } from './components/SettingsModal'
import { useExternalFileDrop } from './hooks/useExternalFileDrop'
import { isPdfFile, isUploadableFile, UPLOAD_FILE_ACCEPT } from './lib/uploadFiles'
import MoveDialog from './components/MoveDialog'
import AddTagDialog from './components/AddTagDialog'
import RenameDialog from './components/RenameDialog'
import NewFolderDialog from './components/NewFolderDialog'
import FileItDialog from './components/FileItDialog'
import StorageAlertDialog from './components/StorageAlertDialog'
import ContextMenu, { type MenuAction } from './components/ContextMenu'
import Snackbar, { type ToastState } from './components/Snackbar'
import SortMenu from './components/SortMenu'
import TagFilterRow from './components/TagFilterRow'
import ItemTagCircles from './components/ItemTagCircles'
import TagChip from './components/TagChip'
import {
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  CutIcon,
  DownloadIcon,
  ExportIcon,
  FolderIcon,
  GridIcon,
  HomeIcon,
  ListIcon,
  MoveIcon,
  PasteIcon,
  PencilIcon,
  SortIcon,
  SparkleIcon,
  TagIcon,
  TrashIcon,
} from './components/icons'

export default function App() {
  const deviceKind = useDeviceKind()
  const { user, loading: authLoading } = useAuth()

  if (deviceKind === null || authLoading) {
    return (
      <div className="page-gradient flex min-h-screen items-center justify-center text-sm text-filr-muted">
        Loading…
      </div>
    )
  }
  if (deviceKind === 'phone') return <MobileAppPrompt />
  if (!user) return <AuthScreen />
  return <Workspace userId={user.id} email={user.email ?? null} />
}

import { SIDEBAR_PEEK, SIDEBAR_WIDTH } from './lib/layout'
const LIST_ROW =
  'flex cursor-pointer items-center gap-3 rounded-xl border bg-filr-surface px-4 py-3 text-left transition'

function parseKey(key: string): DragItem {
  const i = key.indexOf(':')
  return { type: key.slice(0, i) as 'document' | 'folder', id: key.slice(i + 1) }
}
const keyOf = (item: DragItem) => `${item.type}:${item.id}`

function storageWarningSessionKey(userId: string, isFreePlan: boolean): string {
  return `filr-web-storage-warn-${isFreePlan ? 'free-80' : 'paid-90'}-${userId}`
}

function Workspace({ userId, email }: { userId: string; email: string | null }) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [tags, setTags] = useState<UserTag[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [uploading, setUploading] = useState(false)
  const [theme, setTheme] = useTheme()
  const [tagsOpen, setTagsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsInitialSection, setSettingsInitialSection] = useState<SettingsSection>('general')
  const [settingsInitialSubsheet, setSettingsInitialSubsheet] = useState<SettingsSubsheet | null>(null)
  const [userPlan, setUserPlan] = useState<'free' | 'premium'>('free')
  const [addonGb, setAddonGb] = useState(0)
  const isFreePlan = userPlan === 'free'
  const [folderView, setFolderView] = useState<'grid' | 'list'>(() =>
    localStorage.getItem('filr-folder-view') === 'list' ? 'list' : 'grid',
  )
  const [documentView, setDocumentView] = useState<'grid' | 'list'>(() =>
    localStorage.getItem('filr-document-view') === 'list' ? 'list' : 'grid',
  )

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [newFolderParent, setNewFolderParent] = useState<string | null | undefined>(undefined)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dragItems, setDragItems] = useState<DragItem[] | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null | undefined>(undefined)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; actions: MenuAction[] } | null>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [moveItems, setMoveItems] = useState<DragItem[] | null>(null)
  const [addTagItems, setAddTagItems] = useState<DragItem[] | null>(null)
  const [renameItem, setRenameItem] = useState<DragItem | null>(null)
  const [fileItItems, setFileItItems] = useState<FileItItem[] | null>(null)
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [sortOption, setSortOption] = useState<SortOption>(readStoredSortOption)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [tagFilterOpen, setTagFilterOpen] = useState(false)
  const [activeTagIds, setActiveTagIds] = useState<string[]>([])
  const [storageAlert, setStorageAlert] = useState<{
    title: string
    message: string
    primaryLabel: string
    onPrimary: () => void
  } | null>(null)

  const mainRef = useRef<HTMLElement>(null)
  const sortMenuAnchorRef = useRef<HTMLDivElement>(null)
  const isFirstLoadRef = useRef(true)
  const pasteInProgressRef = useRef(false)
  const syncCountRef = useRef(0)
  const selectionAnchorRef = useRef<string | null>(null)
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const isInitial = isFirstLoadRef.current
    if (isInitial) {
      setLoading(true)
    } else {
      syncCountRef.current += 1
      setSyncing(true)
    }
    try {
      const [f, d, t] = await Promise.all([fetchFolders(userId), fetchDocuments(userId), fetchTags(userId)])
      setFolders(f)
      setDocuments(d)
      setTags(t)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your library.')
    } finally {
      if (isInitial) {
        isFirstLoadRef.current = false
        setLoading(false)
      } else {
        syncCountRef.current -= 1
        if (syncCountRef.current <= 0) {
          syncCountRef.current = 0
          setSyncing(false)
        }
      }
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('plan, addon_gb')
        .eq('user_id', userId)
        .maybeSingle()
      if (cancelled) {
        return
      }
      setUserPlan(data?.plan === 'monthly' || data?.plan === 'annual' ? 'premium' : 'free')
      setAddonGb(typeof data?.addon_gb === 'number' ? data.addon_gb : 0)
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  const storageLimitBytes = useMemo(
    () => getStorageLimitBytes(!isFreePlan, addonGb),
    [addonGb, isFreePlan],
  )

  const openStorageUpgrade = useCallback(() => {
    setSettingsInitialSection('account')
    setSettingsInitialSubsheet(isFreePlan ? 'premium-upgrade' : 'storage-upgrade')
    setSettingsOpen(true)
    setStorageAlert(null)
  }, [isFreePlan])

  const showStorageLimitAlert = useCallback(
    (limitBytes: number = storageLimitBytes) => {
      const limitLabel = formatStorageSize(limitBytes)
      if (isFreePlan) {
        setStorageAlert({
          title: 'Storage limit reached',
          message: `You've used your ${limitLabel} of free storage. Upgrade to Filr Premium for more space.`,
          primaryLabel: 'Upgrade',
          onPrimary: openStorageUpgrade,
        })
        return
      }
      setStorageAlert({
        title: 'Storage limit reached',
        message: `You've reached your ${limitLabel} storage limit. Add more storage with a storage upgrade subscription.`,
        primaryLabel: 'Get More Storage',
        onPrimary: openStorageUpgrade,
      })
    },
    [isFreePlan, openStorageUpgrade, storageLimitBytes],
  )

  const maybeShowStorageUsageWarning = useCallback(
    async () => {
      if (storageLimitBytes <= 0) {
        return
      }
      try {
        const used = await getStorageUsage(userId)
        if (!isStorageUsageAtWarningLevel(used, storageLimitBytes, !isFreePlan)) {
          return
        }
        const sessionKey = storageWarningSessionKey(userId, isFreePlan)
        if (sessionStorage.getItem(sessionKey)) {
          return
        }
        sessionStorage.setItem(sessionKey, '1')
        const limitLabel = formatStorageSize(storageLimitBytes)
        const warningPercent = getStorageWarningPercent(!isFreePlan)
        if (isFreePlan) {
          setStorageAlert({
            title: 'Storage almost full',
            message: `You've used at least ${warningPercent}% of your ${limitLabel} free storage. Upgrade to Filr Premium for more space.`,
            primaryLabel: 'Upgrade',
            onPrimary: openStorageUpgrade,
          })
          return
        }
        setStorageAlert({
          title: 'Storage almost full',
          message: `You've used at least ${warningPercent}% of your ${limitLabel} storage. Add more storage with a storage upgrade subscription.`,
          primaryLabel: 'Get More Storage',
          onPrimary: openStorageUpgrade,
        })
      } catch {
        // Ignore usage check failures — hard limits still apply on upload/paste.
      }
    },
    [isFreePlan, openStorageUpgrade, storageLimitBytes, userId],
  )

  useEffect(() => {
    void maybeShowStorageUsageWarning()
  }, [maybeShowStorageUsageWarning])

  // Live sync from mobile or other tabs — no manual refresh needed.
  useEffect(() => {
    const channel = supabase
      .channel(`filr-web-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_tags', filter: `user_id=eq.${userId}` },
        () => void load(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'folders', filter: `user_id=eq.${userId}` },
        () => void load(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents', filter: `user_id=eq.${userId}` },
        () => void load(),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, load])

  const tagsById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const foldersById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders])
  const docsById = useMemo(() => new Map(documents.map((d) => [d.id, d])), [documents])

  const documentCounts = useMemo(() => {
    const map = new Map<string | null, number>()
    for (const d of documents) map.set(d.folderId, (map.get(d.folderId) ?? 0) + 1)
    return map
  }, [documents])

  const trimmedQuery = query.trim().toLowerCase()
  const isSearching = trimmedQuery.length > 0

  const visibleSubfolders = useMemo(() => {
    const scoped = folders.filter((f) => f.parentId === selectedFolderId)
    const filtered = filterByTags(scoped, activeTagIds)
    return applySortOption(
      filtered,
      sortOption,
      (f) => f.name,
      (f) => ({ id: f.id, createdAt: f.createdAt }),
    )
  }, [folders, selectedFolderId, activeTagIds, sortOption])

  const searchFolderHits = useMemo(() => {
    if (!isSearching) {
      return []
    }
    return folders.filter((f) => f.name.toLowerCase().includes(trimmedQuery))
  }, [folders, isSearching, trimmedQuery])

  const visibleDocuments = useMemo(() => {
    let scoped = documents
    if (isSearching) {
      scoped = documents.filter((d) => {
        if (d.title.toLowerCase().includes(trimmedQuery)) {
          return true
        }
        if (isFreePlan) {
          return false
        }
        return d.ocrText.toLowerCase().includes(trimmedQuery)
      })
    } else {
      scoped = documents.filter((d) => d.folderId === selectedFolderId)
    }
    const filtered = filterByTags(scoped, activeTagIds)
    return applySortOption(
      filtered,
      sortOption,
      (d) => d.title,
      (d) => ({ id: d.id, createdAt: d.createdAt }),
    )
  }, [documents, isSearching, trimmedQuery, selectedFolderId, activeTagIds, sortOption, isFreePlan])

  const orderedItems = useMemo<DragItem[]>(
    () => [
      ...visibleSubfolders.map((f) => ({ type: 'folder' as const, id: f.id })),
      ...visibleDocuments.map((d) => ({ type: 'document' as const, id: d.id })),
    ],
    [visibleSubfolders, visibleDocuments],
  )

  const breadcrumbs = useMemo(() => {
    const chain: Folder[] = []
    let current = selectedFolderId ? foldersById.get(selectedFolderId) : undefined
    while (current) {
      chain.unshift(current)
      current = current.parentId ? foldersById.get(current.parentId) : undefined
    }
    return chain
  }, [selectedFolderId, foldersById])

  function changeSortOption(next: SortOption) {
    setSortOption(next)
    storeSortOption(next)
  }

  function toggleNameSort() {
    changeSortOption(sortOption === 'name-asc' ? 'name-desc' : 'name-asc')
  }

  function toggleUpdatedSort() {
    changeSortOption(sortOption === 'updated-desc' ? 'updated-asc' : 'updated-desc')
  }

  function toggleTagFilterBar() {
    if (tagFilterOpen && activeTagIds.length === 0) {
      setTagFilterOpen(false)
      return
    }
    setTagFilterOpen((open) => !open)
  }

  function toggleActiveTag(tagId: string) {
    setActiveTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))
  }

  const hasActiveTagFilter = activeTagIds.length > 0
  const tagFilterKey = useMemo(
    () => (activeTagIds.length > 0 ? [...activeTagIds].sort().join(',') : 'all'),
    [activeTagIds],
  )

  /** Hide the empty Documents block when a folder only contains subfolders (not when fully empty). */
  const hideDocumentsSection =
    !isSearching && visibleDocuments.length === 0 && visibleSubfolders.length > 0

  const addTagInitialIds = useMemo(() => {
    const ids = new Set<string>()
    if (!addTagItems) return []
    for (const it of addTagItems) {
      const tagIds =
        it.type === 'document'
          ? (docsById.get(it.id)?.tagIds ?? [])
          : (foldersById.get(it.id)?.tagIds ?? [])
      for (const id of tagIds) ids.add(id)
    }
    return [...ids]
  }, [addTagItems, docsById, foldersById])

  // ---- Selection helpers ----
  const isSelected = useCallback((item: DragItem) => selected.has(keyOf(item)), [selected])
  const selectedList = useCallback((): DragItem[] => [...selected].map(parseKey), [selected])
  const clearSelection = useCallback(() => setSelected(new Set()), [])

  const toggleSelect = useCallback((item: DragItem) => {
    setSelected((prev) => {
      const next = new Set(prev)
      const k = keyOf(item)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }, [])

  const handleItemSelect = useCallback(
    (e: React.MouseEvent, item: DragItem) => {
      const k = keyOf(item)
      if (e.shiftKey) {
        e.preventDefault()
        const anchor = selectionAnchorRef.current
        if (anchor !== null) {
          const ai = orderedItems.findIndex((i) => keyOf(i) === anchor)
          const ci = orderedItems.findIndex((i) => keyOf(i) === k)
          if (ai !== -1 && ci !== -1) {
            const [lo, hi] = ai < ci ? [ai, ci] : [ci, ai]
            const rangeKeys = orderedItems.slice(lo, hi + 1).map(keyOf)
            setSelected((prev) =>
              e.metaKey || e.ctrlKey ? new Set([...prev, ...rangeKeys]) : new Set(rangeKeys),
            )
            return
          }
        }
      }
      // Cmd/Ctrl only, or Shift with no anchor: toggle and update anchor
      toggleSelect(item)
      selectionAnchorRef.current = k
    },
    [orderedItems, toggleSelect],
  )

  const dragPayloadFor = useCallback(
    (item: DragItem): DragItem[] => {
      if (selected.has(keyOf(item)) && selected.size > 1) return [...selected].map(parseKey)
      return [item]
    },
    [selected],
  )

  const itemName = useCallback(
    (item: DragItem): string =>
      item.type === 'document'
        ? (docsById.get(item.id)?.title ?? 'document')
        : (foldersById.get(item.id)?.name ?? 'folder'),
    [docsById, foldersById],
  )

  const isDescendant = useCallback(
    (folderId: string, maybeDescendantId: string | null): boolean => {
      let current = maybeDescendantId ? foldersById.get(maybeDescendantId) : undefined
      while (current) {
        if (current.id === folderId) return true
        current = current.parentId ? foldersById.get(current.parentId) : undefined
      }
      return false
    },
    [foldersById],
  )

  const canMoveInto = useCallback(
    (items: DragItem[] | null, target: string | null): boolean => {
      if (!items || items.length === 0) return false
      return items.every(
        (it) => it.type === 'document' || (it.id !== target && !(target && isDescendant(it.id, target))),
      )
    },
    [isDescendant],
  )

  const canDropOn = useCallback(
    (target: string | null) => canMoveInto(dragItems, target),
    [dragItems, canMoveInto],
  )

  // ---- Mutations ----
  async function performMove(items: DragItem[], target: string | null, options?: { clearClipboard?: boolean }) {
    setDragItems(null)
    setDragOverFolderId(undefined)
    const valid = items.filter(
      (it) => it.type === 'document' || (it.id !== target && !(target && isDescendant(it.id, target))),
    )
    if (valid.length === 0) return
    const prev = valid.map((it) => ({
      it,
      from:
        it.type === 'document'
          ? (docsById.get(it.id)?.folderId ?? null)
          : (foldersById.get(it.id)?.parentId ?? null),
    }))
    const toName = target == null ? 'Home' : (foldersById.get(target)?.name ?? 'folder')
    const message =
      valid.length === 1 ? `Moved “${itemName(valid[0])}” to ${toName}` : `Moved ${valid.length} items to ${toName}`
    try {
      for (const it of valid) {
        if (it.type === 'document') await moveDocument(userId, it.id, target)
        else await moveFolder(userId, it.id, target)
      }
      await load()
      clearSelection()
      if (options?.clearClipboard) setClipboard(null)
      setToast({
        message,
        undo: async () => {
          for (const p of prev) {
            if (p.it.type === 'document') await moveDocument(userId, p.it.id, p.from)
            else await moveFolder(userId, p.it.id, p.from)
          }
          await load()
        },
      })
    } catch (err) {
      setToast(null)
      setError(err instanceof Error ? err.message : 'Could not move item.')
    }
  }

  async function performPaste(targetFolderId: string | null) {
    if (!clipboard?.items.length || pasteInProgressRef.current) return
    if (wouldPasteIntoSameFolder(clipboard.items, targetFolderId, foldersById, docsById)) {
      setToast({ message: "Can't paste into the same folder." })
      return
    }
    if (!canMoveInto(clipboard.items, targetFolderId)) {
      setToast({ message: "Can't paste here." })
      return
    }
    const items = clipboard.items
    const mode = clipboard.mode
    const toName = targetFolderId == null ? 'Home' : (foldersById.get(targetFolderId)?.name ?? 'folder')
    const count = items.length
    const verb = mode === 'cut' ? 'Moving' : 'Pasting'
    const progressMessage =
      count === 1 ? `${verb} “${itemName(items[0])}” to ${toName}…` : `${verb} ${count} items to ${toName}…`

    pasteInProgressRef.current = true
    setToast({ message: progressMessage, loading: true })
    try {
      if (mode === 'cut') {
        await performMove(items, targetFolderId, { clearClipboard: true })
        return
      }
      const created = await copyItemsToFolder(userId, items, targetFolderId, folders, documents, {
        storageLimitBytes: getStorageLimitBytes(!isFreePlan, addonGb),
      })
      await load()
      clearSelection()
      setClipboard(null)
      setToast({
        message:
          count === 1 ? `Copied “${itemName(items[0])}” to ${toName}` : `Copied ${count} items to ${toName}`,
        undo: async () => {
          await removeCopiedItems(userId, created)
          await load()
        },
      })
      void maybeShowStorageUsageWarning()
    } catch (err) {
      setToast(null)
      if (err instanceof StorageLimitError) {
        showStorageLimitAlert(err.limitBytes)
      } else {
        setError(err instanceof Error ? err.message : 'Could not paste items.')
      }
    } finally {
      pasteInProgressRef.current = false
    }
  }

  function schedulePaste(targetFolderId: string | null) {
    setContextMenu(null)
    requestAnimationFrame(() => {
      void performPaste(targetFolderId)
    })
  }

  function performCopy(items: DragItem[]) {
    setClipboard({ mode: 'copy', items })
    setToast({
      message: items.length === 1 ? `Copied “${itemName(items[0])}”` : `Copied ${items.length} items`,
    })
  }

  function performCut(items: DragItem[]) {
    setClipboard({ mode: 'cut', items })
    setToast({
      message: items.length === 1 ? `Cut “${itemName(items[0])}”` : `Cut ${items.length} items`,
    })
  }

  async function performDelete(items: DragItem[]) {
    const label = items.length === 1 ? `“${itemName(items[0])}”` : `${items.length} items`
    if (
      !window.confirm(
        `Delete ${label}? ${items.length === 1 ? 'It' : 'They'} will be in Recently Deleted for 30 days.`,
      )
    )
      return
    try {
      const folderIds = items.filter((i) => i.type === 'folder').map((i) => i.id)
      const docIds = items.filter((i) => i.type === 'document').map((i) => i.id)
      const deletedEntries = await moveItemsToRecentlyDeleted(userId, folders, documents, folderIds, docIds)
      const removedFolderIds = new Set(deletedEntries.filter((e) => e.kind === 'folder').map((e) => e.id))
      const removedDocIds = new Set(deletedEntries.filter((e) => e.kind === 'document').map((e) => e.id))
      const libraryFolders = folders.filter((f) => !removedFolderIds.has(f.id))
      const libraryDocuments = documents.filter((d) => !removedDocIds.has(d.id))
      await load()
      clearSelection()
      setToast({
        message:
          items.length === 1 ? `Moved ${label} to Recently Deleted` : `Moved ${items.length} items to Recently Deleted`,
        undo: async () => {
          await recoverRecentlyDeletedItems(userId, deletedEntries, [...libraryFolders], [...libraryDocuments])
          await load()
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete item.')
    }
  }

  function openFileIt(items: DragItem[]) {
    const hasDoc = items.some((i) => i.type === 'document')
    if (!hasDoc) {
      setToast({ message: 'File it works on documents only.' })
      return
    }
    setFileItItems(
      items.map((it) => ({
        id: it.id,
        kind: it.type === 'folder' ? 'folder' : 'document',
        name: itemName(it),
      })),
    )
  }

  async function acceptFileIt(suggestions: FileItSuggestion[]) {
    if (!fileItItems) return
    const picked = [...fileItItems]
    try {
      const { movedCount, toName, undo } = await applyFileItSuggestions(
        userId,
        picked,
        suggestions,
        folders,
        documents,
      )
      await load()
      clearSelection()
      setFileItItems(null)
      if (movedCount === 0) {
        setToast({ message: 'Nothing was filed.' })
        return
      }
      const singleName =
        movedCount === 1
          ? (picked.find((it) => suggestions.some((s) => s.itemId === it.id))?.name ?? 'Item')
          : `${movedCount} items`
      setToast({
        message:
          movedCount === 1 ? `Filed “${singleName}” into ${toName}` : `Filed ${movedCount} items into ${toName}`,
        undo: async () => {
          await undo()
          await load()
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File it failed.')
      throw err
    }
  }

  async function applyTags(items: DragItem[], tagIds: string[], tagDefs: UserTag[], initialTagIds: string[]) {
    try {
      await upsertTags(userId, tagDefs)
      const selectedSet = new Set(tagIds)
      const removed = initialTagIds.filter((id) => !selectedSet.has(id))

      for (const it of items) {
        const current =
          it.type === 'document'
            ? (docsById.get(it.id)?.tagIds ?? [])
            : (foldersById.get(it.id)?.tagIds ?? [])

        const next = [...current.filter((id) => !removed.includes(id))]
        for (const id of tagIds) {
          if (!next.includes(id)) next.push(id)
        }

        if (it.type === 'document') {
          await setDocumentTags(userId, it.id, next)
        } else {
          await setFolderTags(userId, it.id, next)
        }
      }
      await load()
      setAddTagItems(null)
      clearSelection()
      setToast({
        message:
          tagIds.length === 0
            ? `Removed tags from ${items.length} ${items.length === 1 ? 'item' : 'items'}`
            : `Updated tags on ${items.length} ${items.length === 1 ? 'item' : 'items'}`,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add tags.')
    }
  }

  async function performRename(item: DragItem, name: string) {
    try {
      if (item.type === 'document') await renameDocument(userId, item.id, name)
      else await renameFolder(userId, item.id, name)
      await load()
      setRenameItem(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename item.')
    }
  }

  async function performDownload(items: DragItem[]) {
    const docs = items.filter((i) => i.type === 'document')
    if (docs.length === 0) return
    setDownloading(true)
    setToast({
      message: docs.length === 1 ? 'Downloading…' : `Downloading ${docs.length} documents…`,
    })
    try {
      for (const it of docs) {
        await downloadDocumentPdfById(userId, it.id, docsById.get(it.id)?.title ?? 'document')
      }
      if (docs.length === 1) {
        setToast({ message: `Downloaded “${itemName(docs[0])}”` })
      } else {
        setToast({ message: `Downloaded ${docs.length} documents` })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.')
    } finally {
      setDownloading(false)
    }
  }

  function handleCreateFolder(parentId: string | null) {
    setNewFolderParent(parentId)
  }

  async function confirmCreateFolder(name: string) {
    const parentId = newFolderParent ?? null
    setNewFolderParent(undefined)
    try {
      await createFolder(userId, name, parentId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create folder.')
    }
  }

  const handleUpload = useCallback(
    async (files: FileList) => {
      const all = Array.from(files)
      const uploadable = all.filter(isUploadableFile)
      const rejectedCount = all.length - uploadable.length

      if (uploadable.length === 0) {
        if (rejectedCount > 0) {
          setToast({
            message:
              rejectedCount === 1
                ? 'Only PDF and JPG files can be uploaded.'
                : `${rejectedCount} files skipped — only PDF and JPG files are supported.`,
          })
        }
        return
      }

      setUploading(true)
      setError(null)
      try {
        const storageLimitBytes = getStorageLimitBytes(!isFreePlan, addonGb)
        for (const file of uploadable) {
          if (isPdfFile(file)) {
            await uploadPdfDocument(userId, file, selectedFolderId, {
              storageLimitBytes,
              onStatus: (message) => setToast({ message, loading: true }),
            })
          } else {
            setToast({ message: 'Uploading...', loading: true })
            await uploadImageDocument(userId, file, selectedFolderId, { storageLimitBytes })
          }
        }
        setToast(null)
        await load()
        if (rejectedCount > 0) {
          setToast({
            message: `Uploaded ${uploadable.length} file${uploadable.length === 1 ? '' : 's'}. ${rejectedCount} unsupported file${rejectedCount === 1 ? '' : 's'} skipped.`,
          })
        }
        void maybeShowStorageUsageWarning()
      } catch (err) {
        if (err instanceof StorageLimitError) {
          showStorageLimitAlert(err.limitBytes)
        } else {
          setError(err instanceof Error ? err.message : 'Upload failed.')
        }
      } finally {
        setUploading(false)
      }
    },
    [addonGb, isFreePlan, userId, selectedFolderId, load, maybeShowStorageUsageWarning, showStorageLimitAlert],
  )

  const externalFileDragActive = useExternalFileDrop(handleUpload)

  const uploadFolderName =
    selectedFolderId == null ? 'Home' : (foldersById.get(selectedFolderId)?.name ?? 'this folder')

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  async function handleDeleteAccount() {
    await deleteAccount()
    setSettingsOpen(false)
    setSettingsInitialSubsheet(null)
  }

  // ---- Context menu ----
  function openContextMenu(e: React.MouseEvent, item: DragItem) {
    e.preventDefault()
    e.stopPropagation()
    const items = isSelected(item) ? selectedList() : [item]
    if (!isSelected(item)) setSelected(new Set([keyOf(item)]))
    let actions = buildMenuActions(items)
    if (clipboard?.items.length && item.type === 'folder') {
      actions = [
        {
          label: 'Paste into this folder',
          icon: <PasteIcon className="h-4 w-4" />,
          onClick: () => schedulePaste(item.id),
        },
        ...actions,
      ]
    }
    setContextMenu({ x: e.clientX, y: e.clientY, actions })
  }

  function openBackgroundMenu(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest('[data-selkey]')) return
    e.preventDefault()
    const actions: MenuAction[] = []
    if (clipboard?.items.length) {
      actions.push({
        label: 'Paste',
        icon: <PasteIcon className="h-4 w-4" />,
        onClick: () => schedulePaste(selectedFolderId),
      })
    }
    actions.push(
      {
        label: 'New folder',
        icon: <FolderIcon className="h-4 w-4" />,
        onClick: () => void handleCreateFolder(selectedFolderId),
      },
      {
        label: 'Upload',
        icon: <ExportIcon className="h-4 w-4" />,
        onClick: () => uploadInputRef.current?.click(),
      },
    )
    setContextMenu({ x: e.clientX, y: e.clientY, actions })
  }

  function buildMenuActions(items: DragItem[]): MenuAction[] {
    const hasDoc = items.some((i) => i.type === 'document')
    const single = items.length === 1
    const actions: MenuAction[] = [
      { label: 'Copy', icon: <CopyIcon className="h-4 w-4" />, onClick: () => performCopy(items) },
      { label: 'Cut', icon: <CutIcon className="h-4 w-4" />, onClick: () => performCut(items) },
      { label: 'Move to…', icon: <MoveIcon className="h-4 w-4" />, onClick: () => setMoveItems(items) },
      {
        label: 'Rename',
        icon: <PencilIcon className="h-4 w-4" />,
        disabled: !single,
        onClick: () => setRenameItem(items[0]),
      },
      { label: 'Add tag', icon: <TagIcon className="h-4 w-4" />, onClick: () => setAddTagItems(items) },
    ]
    if (hasDoc) {
      actions.push({ label: 'File it', icon: <SparkleIcon className="h-4 w-4" />, onClick: () => openFileIt(items) })
      actions.push({
        label: downloading ? 'Downloading…' : 'Download',
        icon: downloading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-filr-border border-t-filr-accent" />
        ) : (
          <DownloadIcon className="h-4 w-4" />
        ),
        disabled: downloading,
        onClick: () => void performDownload(items),
      })
    }
    actions.push({
      label: 'Delete',
      icon: <TrashIcon className="h-4 w-4" />,
      destructive: true,
      onClick: () => void performDelete(items),
    })
    return actions
  }

  // ---- Marquee selection ----
  useEffect(() => {
    if (!marquee) return
    function onMove(e: MouseEvent) {
      setMarquee((m) => (m ? { ...m, x1: e.clientX, y1: e.clientY } : m))
      const left = Math.min(marquee!.x0, e.clientX)
      const right = Math.max(marquee!.x0, e.clientX)
      const top = Math.min(marquee!.y0, e.clientY)
      const bottom = Math.max(marquee!.y0, e.clientY)
      const next = new Set<string>()
      mainRef.current?.querySelectorAll('[data-selkey]').forEach((node) => {
        const r = node.getBoundingClientRect()
        const hit = !(r.right < left || r.left > right || r.bottom < top || r.top > bottom)
        if (hit) {
          const k = node.getAttribute('data-selkey')
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

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      const el = target as HTMLElement | null
      return Boolean(el?.closest('input, textarea, select, [contenteditable="true"]'))
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return

      const meta = e.metaKey || e.ctrlKey

      if (meta) {
        if (e.key === 'c' || e.key === 'C') {
          const items = selectedList()
          if (items.length === 0) return
          e.preventDefault()
          performCopy(items)
        } else if (e.key === 'x' || e.key === 'X') {
          const items = selectedList()
          if (items.length === 0) return
          e.preventDefault()
          performCut(items)
        } else if (e.key === 'v' || e.key === 'V') {
          if (!clipboard?.items.length) return
          e.preventDefault()
          void schedulePaste(selectedFolderId)
        }
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (settingsOpen || selectedDoc || moveItems || addTagItems || renameItem || tagsOpen || fileItItems) return
        const items = selectedList()
        if (items.length === 0) return
        e.preventDefault()
        void performDelete(items)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    clipboard,
    selectedList,
    selectedFolderId,
    foldersById,
    docsById,
    folders,
    documents,
    userId,
    settingsOpen,
    selectedDoc,
    moveItems,
    addTagItems,
    renameItem,
    tagsOpen,
    fileItItems,
  ])

  function onMainMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('[data-selkey]') || target.closest('[data-no-marquee]')) return
    selectionAnchorRef.current = null
    clearSelection()
    setMarquee({ x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY })
  }

  function navigate(folderId: string | null) {
    selectionAnchorRef.current = null
    setSelectedFolderId(folderId)
    setQuery('')
    clearSelection()
  }

  function changeFolderView(v: 'grid' | 'list') {
    setFolderView(v)
    localStorage.setItem('filr-folder-view', v)
  }

  function changeDocumentView(v: 'grid' | 'list') {
    setDocumentView(v)
    localStorage.setItem('filr-document-view', v)
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
    <div data-theme={theme} className="flex h-screen flex-col bg-filr-bg text-filr-text">
      <FileDropOverlay
        visible={externalFileDragActive}
        folderName={uploadFolderName}
        uploading={uploading}
      />
      <Topbar
        query={query}
        onQueryChange={(q) => {
          setQuery(q)
          clearSelection()
        }}
        email={email}
        uploading={uploading}
        syncing={syncing}
        onUpload={handleUpload}
        onSignOut={handleSignOut}
        theme={theme}
        onThemeChange={setTheme}
        onManageTags={() => setTagsOpen(true)}
        onOpenSettings={() => {
          setSettingsInitialSection('general')
          setSettingsInitialSubsheet(null)
          setSettingsOpen(true)
        }}
        isFreePlan={isFreePlan}
        onUpgrade={() => {
          setSettingsInitialSection('account')
          setSettingsInitialSubsheet('premium-upgrade')
          setSettingsOpen(true)
        }}
        sidebarOpen={sidebarOpen}
      />

      <input
        ref={uploadInputRef}
        type="file"
        accept={UPLOAD_FILE_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleUpload(e.target.files)
          e.target.value = ''
        }}
      />

      <div className="flex min-h-0 flex-1">
        <div
          className="shrink-0 overflow-hidden transition-[width] duration-300 ease-out"
          style={{ width: sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_PEEK }}
        >
          <Sidebar
            folders={folders}
            documentCounts={documentCounts}
            selectedFolderId={selectedFolderId}
            collapsed={!sidebarOpen}
            onSelect={navigate}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            dragItems={dragItems}
            onDragStartFolder={(folderId) => {
              const items = dragPayloadFor({ type: 'folder', id: folderId })
              setDragItems(items)
              return items
            }}
            onDragEnd={() => setDragItems(null)}
            onDropItem={(target, items) => void performMove(items, target)}
            canDropOn={canDropOn}
          />
        </div>

        <main
          ref={mainRef}
          onMouseDown={onMainMouseDown}
          onContextMenu={openBackgroundMenu}
          className="relative min-w-0 flex-1 select-none overflow-y-auto"
        >
          {loading ? (
            <LibraryLoadingState />
          ) : (
          <div className="mx-auto max-w-6xl px-6 py-6">
            {/* Breadcrumbs, sort, and tag filter */}
            <div className="mb-5" data-no-marquee>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-sm">
                  {isSearching ? (
                    <h2 className="text-lg font-semibold text-filr-text">Search results for “{query.trim()}”</h2>
                  ) : (
                    <>
                      <BreadcrumbCrumb
                        label="Home"
                        icon={
                          <HomeIcon filled={selectedFolderId === null} className="h-4 w-4 shrink-0 -translate-y-px" />
                        }
                        active={selectedFolderId === null}
                        onClick={() => navigate(null)}
                        droppable={dragItems !== null && canDropOn(null)}
                        over={dragOverFolderId === null}
                        onOver={() => setDragOverFolderId(null)}
                        onLeave={() => setDragOverFolderId((c) => (c === null ? undefined : c))}
                        onDrop={(e) => {
                          const items = getDragData(e)
                          if (items && canDropOn(null)) {
                            e.preventDefault()
                            void performMove(items, null)
                          }
                        }}
                      />
                      {breadcrumbs.map((f) => (
                        <span key={f.id} className="flex items-center gap-1.5">
                          <ChevronRightIcon className="h-3.5 w-3.5 text-filr-muted/50" />
                          <BreadcrumbCrumb
                            label={f.name}
                            active={selectedFolderId === f.id}
                            onClick={() => navigate(f.id)}
                            droppable={dragItems !== null && canDropOn(f.id)}
                            over={dragOverFolderId === f.id}
                            onOver={() => setDragOverFolderId(f.id)}
                            onLeave={() => setDragOverFolderId((c) => (c === f.id ? undefined : c))}
                            onDrop={(e) => {
                              const items = getDragData(e)
                              if (items && canDropOn(f.id)) {
                                e.preventDefault()
                                void performMove(items, f.id)
                              }
                            }}
                          />
                        </span>
                      ))}
                    </>
                  )}
                </div>
                <div ref={sortMenuAnchorRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setSortMenuOpen((open) => !open)}
                    title="Sort and filter"
                    aria-label="Sort and filter"
                    aria-expanded={sortMenuOpen}
                    className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border transition ${
                      sortMenuOpen || tagFilterOpen || hasActiveTagFilter
                        ? 'border-filr-accent/60 bg-filr-accent/10 text-filr-accent'
                        : 'border-filr-border bg-filr-surface-2/60 text-filr-muted hover:border-filr-accent/40 hover:text-filr-text'
                    }`}
                  >
                    <SortIcon className="h-4 w-4" />
                  </button>
                  {sortMenuOpen ? (
                    <SortMenu
                      anchorRef={sortMenuAnchorRef}
                      sortOption={sortOption}
                      tagFilterOpen={tagFilterOpen}
                      onToggleTagFilter={toggleTagFilterBar}
                      onToggleNameSort={toggleNameSort}
                      onToggleUpdatedSort={toggleUpdatedSort}
                      onClose={() => setSortMenuOpen(false)}
                    />
                  ) : null}
                </div>
              </div>
              <div
                className={`filr-tag-row-panel grid transition-[grid-template-rows] duration-300 ease-out ${
                  tagFilterOpen && !isSearching ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
                aria-hidden={!tagFilterOpen || isSearching}
              >
                <div className="min-h-0 overflow-hidden">
                  <TagFilterRow
                    tags={tags}
                    activeTagIds={activeTagIds}
                    theme={theme}
                    visible={tagFilterOpen && !isSearching}
                    onToggleTag={toggleActiveTag}
                    onManageTags={() => setTagsOpen(true)}
                  />
                </div>
              </div>
            </div>

            {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

            <>
                {isSearching && searchFolderHits.length > 0 && (
                  <section className="mb-8">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-filr-muted">Folders</h3>
                    <div className="flex flex-col gap-2">
                      {searchFolderHits.map((folder) => {
                        const item: DragItem = { type: 'folder', id: folder.id }
                        return (
                          <div
                            key={folder.id}
                            data-selkey={`folder:${folder.id}`}
                            onClick={() => {
                              setQuery('')
                              navigate(folder.id)
                            }}
                            onContextMenu={(e) => openContextMenu(e, item)}
                            className={`${LIST_ROW} cursor-pointer border-filr-border hover:border-filr-accent/60`}
                          >
                            <FolderIcon className="h-5 w-5 shrink-0 text-filr-accent/80" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-filr-text">{folder.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )}

                {!isSearching && visibleSubfolders.length > 0 && (
                  <section className="mb-8">
                    <div className="mb-3 flex items-center justify-between gap-3" data-no-marquee>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-filr-muted">Folders</h3>
                      <ViewToggle view={folderView} onChange={changeFolderView} />
                    </div>
                    <div
                      key={`${folderView}-${tagFilterKey}-${selectedFolderId ?? 'home'}`}
                      className={`filr-view-enter ${
                        folderView === 'grid'
                          ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'
                          : 'flex flex-col gap-2'
                      }`}
                    >
                      {visibleSubfolders.map((folder) => {
                        const item: DragItem = { type: 'folder', id: folder.id }
                        const sel = isSelected(item)
                        const over = dragOverFolderId === folder.id && canDropOn(folder.id)
                        return (
                          <div
                            key={folder.id}
                            data-selkey={`folder:${folder.id}`}
                            draggable
                            onDragStart={(e) => {
                              const items = dragPayloadFor(item)
                              setDragData(e, items)
                              setDragItems(items)
                            }}
                            onDragEnd={() => {
                              setDragItems(null)
                              setDragOverFolderId(undefined)
                            }}
                            onDragOver={(e) => {
                              if (dragItems && canDropOn(folder.id)) {
                                e.preventDefault()
                                setDragOverFolderId(folder.id)
                              }
                            }}
                            onDragLeave={() => setDragOverFolderId((c) => (c === folder.id ? undefined : c))}
                            onDrop={(e) => {
                              const items = getDragData(e)
                              if (items && canDropOn(folder.id)) {
                                e.preventDefault()
                                void performMove(items, folder.id)
                              }
                            }}
                            onClick={(e) => {
                              if (e.metaKey || e.ctrlKey || e.shiftKey) handleItemSelect(e, item)
                              else navigate(folder.id)
                            }}
                            onContextMenu={(e) => openContextMenu(e, item)}
                            className={`${LIST_ROW} ${
                              over
                                ? 'border-filr-accent ring-1 ring-filr-accent/60'
                                : sel
                                  ? 'border-filr-accent ring-2 ring-filr-accent/60'
                                  : 'border-filr-border hover:border-filr-accent/60'
                            }`}
                          >
                            <FolderIcon className="h-5 w-5 shrink-0 text-filr-accent/80" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-filr-text">{folder.name}</span>
                            {folderView === 'list' && folder.tagIds.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {folder.tagIds.slice(0, 3).map((id) => {
                                  const tag = tagsById.get(id)
                                  return tag ? <TagChip key={id} tag={tag} /> : null
                                })}
                              </div>
                            ) : (
                              <ItemTagCircles tagIds={folder.tagIds} tagsById={tagsById} />
                            )}
                            {sel ? (
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-filr-accent text-filr-accent-fg">
                                <CheckIcon className="h-3 w-3" />
                              </span>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )}

                {!hideDocumentsSection && (
                <section>
                  {!isSearching && (
                    <div className="mb-3 flex items-center justify-between gap-3" data-no-marquee>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-filr-muted">Documents</h3>
                      <ViewToggle view={documentView} onChange={changeDocumentView} />
                    </div>
                  )}
                  {visibleDocuments.length === 0 &&
                  (!isSearching || searchFolderHits.length === 0) ? (
                    <EmptyState isSearching={isSearching} tagFiltered={hasActiveTagFilter} />
                  ) : visibleDocuments.length > 0 ? (
                    <div
                      key={`${documentView}-${tagFilterKey}-${selectedFolderId ?? 'home'}`}
                      className={`filr-view-enter ${
                        documentView === 'grid'
                          ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                          : 'flex flex-col gap-2'
                      }`}
                    >
                      {visibleDocuments.map((doc) => (
                        <DocumentCard
                          key={doc.id}
                          doc={doc}
                          userId={userId}
                          tagsById={tagsById}
                          selected={isSelected({ type: 'document', id: doc.id })}
                          view={documentView}
                          listRowClass={LIST_ROW}
                          onOpen={setSelectedDoc}
                          onItemSelect={handleItemSelect}
                          onContextMenu={openContextMenu}
                          dragPayloadFor={dragPayloadFor}
                          onDragStart={setDragItems}
                          onDragEnd={() => setDragItems(null)}
                        />
                      ))}
                    </div>
                  ) : null}
                </section>
                )}
              </>
          </div>
          )}

          {!loading && marqueeRect && (
            <div
              className="pointer-events-none fixed z-40 rounded-sm border border-filr-accent/70 bg-filr-accent/10"
              style={marqueeRect}
            />
          )}
        </main>
      </div>

      {selectedDoc && (
        <DocumentViewer
          doc={selectedDoc}
          userId={userId}
          tagsById={tagsById}
          onClose={() => setSelectedDoc(null)}
          onChanged={() => void load()}
        />
      )}

      {tagsOpen && (
        <TagsModal userId={userId} tags={tags} onClose={() => setTagsOpen(false)} onChanged={() => void load()} />
      )}

      {settingsOpen && (
        <SettingsModal
          email={email}
          theme={theme}
          plan={userPlan}
          addonGb={addonGb}
          userId={userId}
          tags={tags}
          folders={folders}
          documents={documents}
          initialSection={settingsInitialSection}
          initialSubsheet={settingsInitialSubsheet}
          onThemeChange={setTheme}
          onLibraryChanged={() => void load()}
          onSignOut={handleSignOut}
          onDeleteAccount={handleDeleteAccount}
          onClose={() => {
            setSettingsOpen(false)
            setSettingsInitialSubsheet(null)
          }}
        />
      )}

      {moveItems && (
        <MoveDialog
          folders={folders}
          count={moveItems.length}
          canSelect={(target) => canMoveInto(moveItems, target)}
          onMove={(target) => {
            void performMove(moveItems, target)
            setMoveItems(null)
          }}
          onClose={() => setMoveItems(null)}
        />
      )}

      {addTagItems && (
        <AddTagDialog
          userId={userId}
          tags={tags}
          initialTagIds={addTagInitialIds}
          onApply={(tagIds, tagDefs) => void applyTags(addTagItems, tagIds, tagDefs, addTagInitialIds)}
          onClose={() => setAddTagItems(null)}
          onTagsChanged={() => void load()}
        />
      )}

      {renameItem && (
        <RenameDialog
          initialName={itemName(renameItem)}
          kind={renameItem.type}
          onRename={(name) => void performRename(renameItem, name)}
          onClose={() => setRenameItem(null)}
        />
      )}

      {fileItItems && (
        <FileItDialog
          items={fileItItems}
          folders={folders}
          documents={documents}
          onClose={() => setFileItItems(null)}
          onAccept={(suggestions) => void acceptFileIt(suggestions)}
        />
      )}

      {newFolderParent !== undefined && (
        <NewFolderDialog
          parentName={newFolderParent == null ? 'Home' : (foldersById.get(newFolderParent)?.name ?? 'folder')}
          onCreate={(name) => void confirmCreateFolder(name)}
          onClose={() => setNewFolderParent(undefined)}
        />
      )}

      {storageAlert ? (
        <StorageAlertDialog
          title={storageAlert.title}
          message={storageAlert.message}
          primaryLabel={storageAlert.primaryLabel}
          onPrimary={storageAlert.onPrimary}
          onClose={() => setStorageAlert(null)}
        />
      ) : null}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          actions={contextMenu.actions}
          onClose={() => setContextMenu(null)}
        />
      )}

      {toast && <Snackbar toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function BreadcrumbCrumb({
  label,
  icon,
  active,
  onClick,
  droppable,
  over,
  onOver,
  onLeave,
  onDrop,
}: {
  label: string
  icon?: React.ReactNode
  active: boolean
  onClick: () => void
  droppable: boolean
  over: boolean
  onOver: () => void
  onLeave: () => void
  onDrop: (e: React.DragEvent) => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={(e) => {
        if (droppable) {
          e.preventDefault()
          onOver()
        }
      }}
      onDragLeave={onLeave}
      onDrop={onDrop}
      className={`inline-flex cursor-pointer items-center overflow-visible rounded py-0.5 pl-1 pr-1.5 transition hover:text-filr-text ${
        icon ? 'gap-2' : 'px-1.5'
      } ${
        over
          ? 'bg-filr-accent/15 text-filr-text ring-1 ring-filr-accent/60'
          : active
            ? 'font-semibold text-filr-text'
            : 'text-filr-muted'
      }`}
    >
      {icon ? (
        <span className="inline-flex shrink-0 items-center justify-center overflow-visible p-px">{icon}</span>
      ) : null}
      <span className="leading-none">{label}</span>
    </button>
  )
}

function ViewToggle({ view, onChange }: { view: 'grid' | 'list'; onChange: (v: 'grid' | 'list') => void }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-filr-border bg-filr-surface p-0.5">
      <button
        onClick={() => onChange('list')}
        title="List view"
        aria-label="List view"
        className={`cursor-pointer rounded-md p-1.5 transition ${
          view === 'list' ? 'bg-filr-surface-2 text-filr-text' : 'text-filr-muted hover:bg-filr-surface-2/60 hover:text-filr-text'
        }`}
      >
        <ListIcon className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange('grid')}
        title="Grid view"
        aria-label="Grid view"
        className={`cursor-pointer rounded-md p-1.5 transition ${
          view === 'grid' ? 'bg-filr-surface-2 text-filr-text' : 'text-filr-muted hover:bg-filr-surface-2/60 hover:text-filr-text'
        }`}
      >
        <GridIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

function LibraryLoadingState() {
  return (
    <div className="flex h-full min-h-[min(100%,calc(100vh-4rem))] flex-col items-center justify-center">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-filr-border border-t-filr-accent"
        aria-hidden="true"
      />
      <p className="mt-4 text-sm text-filr-muted" role="status">
        Loading your files...
      </p>
    </div>
  )
}

function EmptyState({ isSearching, tagFiltered }: { isSearching: boolean; tagFiltered?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-filr-border bg-filr-surface/30 px-6 py-16 text-center">
      <p className="text-sm font-medium text-filr-text">
        {isSearching
          ? 'No documents match your search.'
          : tagFiltered
            ? 'No items match the selected tags.'
            : 'Nothing here yet.'}
      </p>
      <p className="mt-1 max-w-sm text-sm text-filr-muted">
        {isSearching
          ? 'Try a different title or some words from the document.'
          : tagFiltered
            ? 'Try selecting different tags, or clear the tag filter.'
            : 'Scan documents in the Filr app, or upload PDFs and JPGs from this computer — they’ll appear here.'}
      </p>
    </div>
  )
}
