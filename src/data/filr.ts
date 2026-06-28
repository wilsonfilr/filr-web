import { supabase, DOCUMENTS_BUCKET } from '../lib/supabase'
import { extractPdfTextFromFile } from '../lib/pdfText'
import { StorageLimitError, wouldExceedStorageLimit } from '../lib/storageLimits'
import { resolveUniqueName } from '../lib/resolveUniqueName'
import {
  collectDocsInFolders,
  expandFolderIdsWithDescendants,
  normalizeDeletedAt,
  purgeExpiredRecentlyDeleted,
  type RecentlyDeletedItem,
} from '../lib/recentlyDeleted'
import { topLevelSelectedFolderIds } from '../lib/clipboard'
import type { DragItem } from '../lib/dnd'
import type { Document, Folder, UserTag, VaultEntry, VaultExtraCard } from '../lib/types'

/** Storage paths must match the mobile app (see services/cloudSync.ts + documentCloudAssetsSync.ts). */
function pdfStoragePath(userId: string, documentId: string): string {
  return `${userId}/${documentId}.pdf`
}

function pageImageStoragePath(userId: string, documentId: string, pageIndex: number): string {
  return `${userId}/${documentId}_p${pageIndex}.jpg`
}

function normalizeTagIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((id): id is string => typeof id === 'string' && id.length > 0)
}

async function siblingFolderNames(
  userId: string,
  parentId: string | null,
  excludeFolderId?: string,
): Promise<string[]> {
  let query = supabase.from('folders').select('id, name').eq('user_id', userId)
  query = parentId === null ? query.is('parent_id', null) : query.eq('parent_id', parentId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? [])
    .filter((row) => row.id !== excludeFolderId)
    .map((row) => row.name ?? 'Untitled')
}

async function siblingDocumentTitles(
  userId: string,
  folderId: string | null,
  excludeDocumentId?: string,
): Promise<string[]> {
  let query = supabase.from('documents').select('id, title').eq('user_id', userId)
  query = folderId === null ? query.is('folder_id', null) : query.eq('folder_id', folderId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? [])
    .filter((row) => row.id !== excludeDocumentId)
    .map((row) => row.title ?? 'Untitled')
}

export async function fetchFolders(userId: string): Promise<Folder[]> {
  const { data, error } = await supabase
    .from('folders')
    .select('id, name, parent_id, tag_ids, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((f) => ({
    id: f.id,
    name: f.name ?? 'Untitled',
    parentId: f.parent_id ?? null,
    tagIds: normalizeTagIds(f.tag_ids),
    createdAt: f.created_at ?? null,
  }))
}

export async function fetchDocuments(userId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, folder_id, ocr_text, tag_ids, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((d) => ({
    id: d.id,
    title: d.title ?? 'Untitled',
    folderId: d.folder_id ?? null,
    ocrText: d.ocr_text ?? '',
    tagIds: normalizeTagIds(d.tag_ids),
    createdAt: d.created_at ?? null,
  }))
}

export async function fetchTags(userId: string): Promise<UserTag[]> {
  const { data, error } = await supabase
    .from('user_tags')
    .select('id, label, color, sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? [])
    .filter((row) => row?.id && row?.label)
    .map((row) => ({ id: row.id, label: row.label, color: row.color ?? 'neutral' }))
}

/** List the storage object names for a single document (pdf + scanned page images). */
export async function listDocumentAssets(
  userId: string,
  documentId: string,
): Promise<{ pdfPath: string | null; pagePaths: string[] }> {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).list(userId, {
    limit: 1000,
  })
  if (error || !data) return { pdfPath: null, pagePaths: [] }

  let pdfPath: string | null = null
  const pages: { index: number; path: string }[] = []
  const pageRegex = new RegExp(`^${documentId}_p(\\d+)\\.jpg$`)

  for (const obj of data) {
    if (obj.name === `${documentId}.pdf`) {
      pdfPath = `${userId}/${obj.name}`
      continue
    }
    const match = obj.name.match(pageRegex)
    if (match) {
      pages.push({ index: Number(match[1]), path: `${userId}/${obj.name}` })
    }
  }

  pages.sort((a, b) => a.index - b.index)
  return { pdfPath, pagePaths: pages.map((p) => p.path) }
}

async function sumStorageInPrefix(prefix: string): Promise<number> {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).list(prefix, { limit: 1000 })
  if (error || !data) return 0
  let total = 0
  for (const item of data) {
    if (item.id == null) {
      total += await sumStorageInPrefix(`${prefix}${item.name}/`)
    } else {
      total += item.metadata?.size ?? 0
    }
  }
  return total
}

/** Total bytes stored in the documents bucket for a user (PDFs, page images, vault photos). */
export async function getStorageUsage(userId: string): Promise<number> {
  return sumStorageInPrefix(`${userId}/`)
}

export async function createSignedUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, expiresInSeconds)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

function sanitizeDownloadFilename(title: string): string {
  const base = title.trim() || 'document'
  const safe = base.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/\.+$/, '')
  return safe.toLowerCase().endsWith('.pdf') ? safe : `${safe}.pdf`
}

/** Download a PDF via a short-lived signed URL fetched as a blob — never navigates to Supabase. */
export async function downloadDocumentPdf(
  storagePath: string,
  title: string,
  expiresInSeconds = 60,
): Promise<void> {
  const signedUrl = await createSignedUrl(storagePath, expiresInSeconds)
  if (!signedUrl) throw new Error('Could not prepare download.')

  const response = await fetch(signedUrl)
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}).`)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = sanitizeDownloadFilename(title)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function downloadDocumentPdfById(
  userId: string,
  documentId: string,
  title: string,
): Promise<void> {
  await downloadDocumentPdf(pdfStoragePath(userId, documentId), title)
}

/** Read-only ID Vault entries. Photos live in the documents bucket under {userId}/vault/. */
export async function fetchVaultEntries(userId: string): Promise<VaultEntry[]> {
  const { data, error } = await supabase
    .from('id_vault_entries')
    .select('id, kind, title, payload, photo_paths')
    .eq('user_id', userId)
    .order('updated_at', { ascending: true })
  if (error || !data) return []
  return data.map((row) => {
    const payload = (row.payload ?? {}) as Record<string, unknown>
    const extraRaw = Array.isArray(payload.extraInfoCards) ? payload.extraInfoCards : []
    const extraInfoCards: VaultExtraCard[] = extraRaw
      .map((c) => {
        if (!c || typeof c !== 'object') return null
        const r = c as Record<string, unknown>
        return {
          id: typeof r.id === 'string' ? r.id : Math.random().toString(36),
          title: typeof r.title === 'string' ? r.title : '',
          value: typeof r.value === 'string' ? r.value : '',
        }
      })
      .filter((c): c is VaultExtraCard => Boolean(c))
    return {
      id: row.id,
      kind: row.kind ?? 'ID Card',
      title: row.title ?? '',
      personNameLabel: typeof payload.personNameLabel === 'string' ? payload.personNameLabel : 'Name',
      personName: typeof payload.personName === 'string' ? payload.personName : '',
      idNumberLabel: typeof payload.idNumberLabel === 'string' ? payload.idNumberLabel : 'Number',
      idNumber: typeof payload.idNumber === 'string' ? payload.idNumber : '',
      showNameCard: payload.showNameCard !== false,
      showIdNumberCard: payload.showIdNumberCard !== false,
      extraInfoCards,
      photoPaths: Array.isArray(row.photo_paths)
        ? row.photo_paths.filter((p): p is string => typeof p === 'string')
        : [],
    }
  })
}

export async function createFolder(
  userId: string,
  name: string,
  parentId: string | null,
): Promise<Folder> {
  const id = crypto.randomUUID()
  const siblings = await siblingFolderNames(userId, parentId)
  const finalName = resolveUniqueName(name.trim() || 'Untitled folder', siblings)
  const { error } = await supabase.from('folders').insert({
    id,
    user_id: userId,
    name: finalName,
    parent_id: parentId,
    tag_ids: [],
  })
  if (error) throw error
  return { id, name: finalName, parentId, tagIds: [], createdAt: new Date().toISOString() }
}

export async function renameFolder(userId: string, folderId: string, name: string): Promise<void> {
  const { data: row, error: fetchError } = await supabase
    .from('folders')
    .select('parent_id')
    .eq('user_id', userId)
    .eq('id', folderId)
    .maybeSingle()
  if (fetchError) throw fetchError
  if (!row) throw new Error('Folder not found')
  const parentId = row.parent_id ?? null
  const siblings = await siblingFolderNames(userId, parentId, folderId)
  const finalName = resolveUniqueName(name.trim() || 'Untitled folder', siblings)
  const { error } = await supabase
    .from('folders')
    .update({ name: finalName })
    .eq('user_id', userId)
    .eq('id', folderId)
  if (error) throw error
}

export async function deleteFolder(userId: string, folderId: string): Promise<void> {
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('user_id', userId)
    .eq('id', folderId)
  if (error) throw error
}

async function removeDocumentRows(userId: string, documentIds: string[]): Promise<void> {
  if (documentIds.length === 0) return
  const { error } = await supabase.from('documents').delete().eq('user_id', userId).in('id', documentIds)
  if (error) throw error
}

async function removeFolderRows(userId: string, folderIds: string[]): Promise<void> {
  if (folderIds.length === 0) return
  const { error } = await supabase.from('folders').delete().eq('user_id', userId).in('id', folderIds)
  if (error) throw error
}

export async function purgeDocumentAssets(userId: string, documentIds: string[]): Promise<void> {
  for (const documentId of documentIds) {
    const { pdfPath, pagePaths } = await listDocumentAssets(userId, documentId)
    const paths = [pdfPath, ...pagePaths].filter((p): p is string => Boolean(p))
    if (paths.length > 0) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove(paths)
    }
  }
}

function rowToRecentlyDeletedItem(row: {
  id: string
  name: string
  kind: string
  deleted_at: number | string
  thumb_uri: string | null
  payload: Record<string, unknown> | null
}): RecentlyDeletedItem | null {
  if (!row?.id || !row?.name) return null
  const kind = row.kind
  if (kind !== 'folder' && kind !== 'document' && kind !== 'id') return null
  const payload = row.payload ?? {}
  return {
    id: row.id,
    name: row.name,
    kind,
    deletedAt: normalizeDeletedAt(Number(row.deleted_at)),
    ...(row.thumb_uri ? { thumbUri: row.thumb_uri } : {}),
    ...(payload.folder ? { folder: payload.folder as RecentlyDeletedItem['folder'] } : {}),
    ...(payload.document ? { document: payload.document as RecentlyDeletedItem['document'] } : {}),
  }
}

function recentlyDeletedToRow(userId: string, item: RecentlyDeletedItem) {
  const payload: Record<string, unknown> = {}
  if (item.folder) payload.folder = item.folder
  if (item.document) payload.document = item.document
  return {
    user_id: userId,
    id: item.id,
    name: item.name,
    kind: item.kind,
    deleted_at: item.deletedAt,
    thumb_uri: item.thumbUri ?? null,
    payload,
  }
}

export async function fetchRecentlyDeletedItems(userId: string): Promise<RecentlyDeletedItem[]> {
  const { data, error } = await supabase
    .from('recently_deleted_items')
    .select('id, name, kind, deleted_at, thumb_uri, payload')
    .eq('user_id', userId)
    .order('deleted_at', { ascending: false })
  if (error) throw error
  const items = (data ?? [])
    .map((row) => rowToRecentlyDeletedItem(row))
    .filter((item): item is RecentlyDeletedItem => Boolean(item))
  const { kept, expired } = purgeExpiredRecentlyDeleted(items)
  if (expired.length > 0) {
    await permanentlyDeleteRecentlyDeleted(userId, expired)
  }
  return kept
}

export async function upsertRecentlyDeletedItems(userId: string, items: RecentlyDeletedItem[]): Promise<void> {
  if (items.length === 0) return
  const rows = items.map((item) => recentlyDeletedToRow(userId, item))
  const { error } = await supabase.from('recently_deleted_items').upsert(rows, { onConflict: 'user_id,id' })
  if (error) throw error
}

export async function deleteRecentlyDeletedRows(userId: string, itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) return
  const { error } = await supabase.from('recently_deleted_items').delete().eq('user_id', userId).in('id', itemIds)
  if (error) throw error
}

export async function moveItemsToRecentlyDeleted(
  userId: string,
  allFolders: Folder[],
  allDocuments: Document[],
  selectedFolderIds: string[],
  selectedDocumentIds: string[],
): Promise<RecentlyDeletedItem[]> {
  const folderIdsToRemove = expandFolderIdsWithDescendants(selectedFolderIds, allFolders)
  const docIdsToRemove = new Set(selectedDocumentIds)
  for (const docId of collectDocsInFolders(folderIdsToRemove, allDocuments)) {
    docIdsToRemove.add(docId)
  }

  const removedFolders = allFolders.filter((f) => folderIdsToRemove.has(f.id))
  const removedDocs = allDocuments.filter((d) => docIdsToRemove.has(d.id))
  const now = Date.now()

  const entries: RecentlyDeletedItem[] = [
    ...removedFolders.map((f) => ({
      id: f.id,
      name: f.name,
      kind: 'folder' as const,
      deletedAt: now,
      folder: {
        parentId: f.parentId,
        ...(f.tagIds.length ? { tagIds: f.tagIds } : {}),
      },
    })),
    ...removedDocs.map((d) => ({
      id: d.id,
      name: d.title,
      kind: 'document' as const,
      deletedAt: now,
      document: {
        folderId: d.folderId,
        textContent: d.ocrText,
        ...(d.tagIds.length ? { tagIds: d.tagIds } : {}),
      },
    })),
  ]

  if (entries.length > 0) {
    await upsertRecentlyDeletedItems(userId, entries)
  }
  await removeFolderRows(userId, [...folderIdsToRemove])
  await removeDocumentRows(userId, [...docIdsToRemove])
  return entries
}

export async function softDeleteDocument(userId: string, doc: Document): Promise<void> {
  await moveItemsToRecentlyDeleted(userId, [], [doc], [], [doc.id])
}

export async function recoverRecentlyDeletedItems(
  userId: string,
  items: RecentlyDeletedItem[],
  existingFolders: Folder[],
  existingDocuments: Document[],
): Promise<void> {
  const folderItems = items.filter((i) => i.kind === 'folder')
  const docItems = items.filter((i) => i.kind === 'document')

  for (const item of folderItems) {
    const parentId = item.folder?.parentId ?? null
    const siblings = existingFolders.filter((f) => f.parentId === parentId && f.id !== item.id).map((f) => f.name)
    const name = resolveUniqueName(item.name, siblings)
    const { error } = await supabase.from('folders').insert({
      id: item.id,
      user_id: userId,
      name,
      parent_id: parentId,
      tag_ids: item.folder?.tagIds ?? [],
    })
    if (error) throw error
    existingFolders.push({ id: item.id, name, parentId, tagIds: item.folder?.tagIds ?? [], createdAt: null })
  }

  for (const item of docItems) {
    const folderId = item.document?.folderId ?? null
    const siblings = existingDocuments
      .filter((d) => d.folderId === folderId && d.id !== item.id)
      .map((d) => d.title)
    const title = resolveUniqueName(item.name, siblings)
    const { error } = await supabase.from('documents').insert({
      id: item.id,
      user_id: userId,
      folder_id: folderId,
      title,
      ocr_text: item.document?.textContent ?? '',
      tag_ids: item.document?.tagIds ?? [],
    })
    if (error) throw error
    existingDocuments.push({
      id: item.id,
      title,
      folderId,
      ocrText: item.document?.textContent ?? '',
      tagIds: item.document?.tagIds ?? [],
      createdAt: null,
    })
  }

  await deleteRecentlyDeletedRows(
    userId,
    items.filter((i) => i.kind === 'folder' || i.kind === 'document').map((i) => i.id),
  )
}

export async function permanentlyDeleteRecentlyDeleted(
  userId: string,
  items: RecentlyDeletedItem[],
): Promise<void> {
  if (items.length === 0) return
  const documentIds = items.filter((i) => i.kind === 'document').map((i) => i.id)
  if (documentIds.length > 0) {
    await purgeDocumentAssets(userId, documentIds)
    await removeDocumentRows(userId, documentIds)
  }
  await deleteRecentlyDeletedRows(
    userId,
    items.map((i) => i.id),
  )
}

function documentStorageBytesFromListing(documentId: string, listing: Map<string, number>): number {
  let total = listing.get(`${documentId}.pdf`) ?? 0
  const pagePrefix = `${documentId}_p`
  for (const [name, size] of listing) {
    if (name.startsWith(pagePrefix) && name.endsWith('.jpg')) {
      total += size
    }
  }
  return total
}

async function listUserDocumentStorageSizes(userId: string): Promise<Map<string, number>> {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).list(userId, { limit: 1000 })
  if (error || !data) return new Map()
  const listing = new Map<string, number>()
  for (const obj of data) {
    if (obj.id != null) {
      listing.set(obj.name, obj.metadata?.size ?? 0)
    }
  }
  return listing
}

function resolveDocumentIdsForCopy(
  items: DragItem[],
  allFolders: Folder[],
  allDocuments: Document[],
): string[] {
  const folderIds = items.filter((i) => i.type === 'folder').map((i) => i.id)
  const docIds = new Set(items.filter((i) => i.type === 'document').map((i) => i.id))
  const topLevelFolderIds = topLevelSelectedFolderIds(folderIds, allFolders)
  const expandedFolderIds = expandFolderIdsWithDescendants(topLevelFolderIds, allFolders)
  const folderDocIds = collectDocsInFolders(expandedFolderIds, allDocuments)
  for (const docId of folderDocIds) {
    docIds.delete(docId)
  }
  return [...new Set([...folderDocIds, ...docIds])]
}

/** Bytes that would be added to storage when copying these items (duplicate of PDFs + page images). */
export async function estimateCopyItemsBytes(
  userId: string,
  items: DragItem[],
  allFolders: Folder[],
  allDocuments: Document[],
): Promise<number> {
  const documentIds = resolveDocumentIdsForCopy(items, allFolders, allDocuments)
  if (documentIds.length === 0) {
    return 0
  }
  const listing = await listUserDocumentStorageSizes(userId)
  let total = 0
  for (const documentId of documentIds) {
    total += documentStorageBytesFromListing(documentId, listing)
  }
  return total
}

async function copyStorageObject(fromPath: string, toPath: string): Promise<void> {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).download(fromPath)
  if (error) throw error
  if (!data) throw new Error('Could not copy file')
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(toPath, data, { upsert: true, contentType: data.type || undefined })
  if (uploadError) throw uploadError
}

export async function copyDocumentToFolder(
  userId: string,
  document: Document,
  targetFolderId: string | null,
): Promise<Document> {
  const newId = crypto.randomUUID()
  const siblings = await siblingDocumentTitles(userId, targetFolderId)
  const title = resolveUniqueName(document.title, siblings)

  const { pdfPath, pagePaths } = await listDocumentAssets(userId, document.id)
  if (pdfPath) {
    await copyStorageObject(pdfPath, pdfStoragePath(userId, newId))
  }
  for (const pagePath of pagePaths) {
    const fileName = pagePath.split('/').pop() ?? ''
    const match = fileName.match(/_p(\d+)\.jpg$/)
    if (match) {
      await copyStorageObject(pagePath, `${userId}/${newId}_p${match[1]}.jpg`)
    }
  }

  const { error } = await supabase.from('documents').insert({
    id: newId,
    user_id: userId,
    folder_id: targetFolderId,
    title,
    ocr_text: document.ocrText,
    tag_ids: document.tagIds,
  })
  if (error) throw error
  return { ...document, id: newId, title, folderId: targetFolderId }
}

export type CopyItemsResult = {
  folderIds: string[]
  documentIds: string[]
}

async function copyFolderTree(
  userId: string,
  folder: Folder,
  targetParentId: string | null,
  allFolders: Folder[],
  allDocuments: Document[],
): Promise<CopyItemsResult> {
  const newId = crypto.randomUUID()
  const siblings = await siblingFolderNames(userId, targetParentId)
  const name = resolveUniqueName(folder.name, siblings)
  const { error: insertError } = await supabase.from('folders').insert({
    id: newId,
    user_id: userId,
    name,
    parent_id: targetParentId,
    tag_ids: folder.tagIds,
  })
  if (insertError) throw insertError

  const created: CopyItemsResult = { folderIds: [newId], documentIds: [] }

  for (const child of allFolders.filter((f) => f.parentId === folder.id)) {
    const childCreated = await copyFolderTree(userId, child, newId, allFolders, allDocuments)
    created.folderIds.push(...childCreated.folderIds)
    created.documentIds.push(...childCreated.documentIds)
  }
  for (const doc of allDocuments.filter((d) => d.folderId === folder.id)) {
    const copied = await copyDocumentToFolder(userId, doc, newId)
    created.documentIds.push(copied.id)
  }
  return created
}

export async function copyItemsToFolder(
  userId: string,
  items: DragItem[],
  targetFolderId: string | null,
  allFolders: Folder[],
  allDocuments: Document[],
  options?: { storageLimitBytes?: number },
): Promise<CopyItemsResult> {
  if (options?.storageLimitBytes != null) {
    const additionalBytes = await estimateCopyItemsBytes(userId, items, allFolders, allDocuments)
    const used = await getStorageUsage(userId)
    if (wouldExceedStorageLimit(used, options.storageLimitBytes, additionalBytes)) {
      throw new StorageLimitError(used, options.storageLimitBytes)
    }
  }

  const folderIds = items.filter((i) => i.type === 'folder').map((i) => i.id)
  const docIds = new Set(items.filter((i) => i.type === 'document').map((i) => i.id))

  const topLevelFolderIds = topLevelSelectedFolderIds(folderIds, allFolders)
  const expandedFolderIds = expandFolderIdsWithDescendants(topLevelFolderIds, allFolders)
  for (const docId of collectDocsInFolders(expandedFolderIds, allDocuments)) {
    docIds.delete(docId)
  }

  const created: CopyItemsResult = { folderIds: [], documentIds: [] }

  for (const folderId of topLevelFolderIds) {
    const folder = allFolders.find((f) => f.id === folderId)
    if (folder) {
      const treeCreated = await copyFolderTree(userId, folder, targetFolderId, allFolders, allDocuments)
      created.folderIds.push(...treeCreated.folderIds)
      created.documentIds.push(...treeCreated.documentIds)
    }
  }
  for (const docId of docIds) {
    const doc = allDocuments.find((d) => d.id === docId)
    if (doc) {
      const copied = await copyDocumentToFolder(userId, doc, targetFolderId)
      created.documentIds.push(copied.id)
    }
  }
  return created
}

/** Undo a copy-paste by removing the newly created duplicates (not the originals). */
export async function removeCopiedItems(userId: string, created: CopyItemsResult): Promise<void> {
  if (created.documentIds.length > 0) {
    await purgeDocumentAssets(userId, created.documentIds)
    await removeDocumentRows(userId, created.documentIds)
  }
  if (created.folderIds.length > 0) {
    await removeFolderRows(userId, [...created.folderIds].reverse())
  }
}

export async function moveFolder(
  userId: string,
  folderId: string,
  parentId: string | null,
): Promise<void> {
  const { data: row, error: fetchError } = await supabase
    .from('folders')
    .select('name')
    .eq('user_id', userId)
    .eq('id', folderId)
    .maybeSingle()
  if (fetchError) throw fetchError
  if (!row) throw new Error('Folder not found')
  const siblings = await siblingFolderNames(userId, parentId, folderId)
  const finalName = resolveUniqueName(row.name ?? 'Untitled folder', siblings)
  const { error } = await supabase
    .from('folders')
    .update({ parent_id: parentId, name: finalName })
    .eq('user_id', userId)
    .eq('id', folderId)
  if (error) throw error
}

export async function upsertTags(userId: string, tags: UserTag[]): Promise<void> {
  if (tags.length === 0) return
  const rows = tags.map((tag, index) => ({
    user_id: userId,
    id: tag.id,
    label: tag.label,
    color: tag.color,
    sort_order: index,
  }))
  const { error } = await supabase.from('user_tags').upsert(rows, { onConflict: 'user_id,id' })
  if (error) throw error
}

export async function createTag(
  userId: string,
  label: string,
  color: string,
  sortOrder: number,
): Promise<UserTag> {
  const id = `tag-${Date.now()}`
  const { error } = await supabase.from('user_tags').insert({
    user_id: userId,
    id,
    label,
    color,
    sort_order: sortOrder,
  })
  if (error) throw error
  return { id, label, color }
}

export async function updateTag(
  userId: string,
  tagId: string,
  patch: { label?: string; color?: string },
): Promise<void> {
  const { error } = await supabase
    .from('user_tags')
    .update(patch)
    .eq('user_id', userId)
    .eq('id', tagId)
  if (error) throw error
}

/** Remove a tag id from every document and folder that references it. */
async function removeTagFromItems(userId: string, tagId: string): Promise<void> {
  for (const table of ['documents', 'folders'] as const) {
    const { data, error } = await supabase
      .from(table)
      .select('id, tag_ids')
      .eq('user_id', userId)
      .contains('tag_ids', [tagId])
    if (error || !data) continue
    await Promise.all(
      data.map((row) => {
        const next = normalizeTagIds(row.tag_ids).filter((t) => t !== tagId)
        return supabase
          .from(table)
          .update({ tag_ids: next })
          .eq('user_id', userId)
          .eq('id', row.id)
      }),
    )
  }
}

export async function deleteTag(userId: string, tagId: string): Promise<void> {
  // Strip the tag from any documents/folders first so no dangling references remain.
  await removeTagFromItems(userId, tagId)
  const { error } = await supabase
    .from('user_tags')
    .delete()
    .eq('user_id', userId)
    .eq('id', tagId)
  if (error) throw error
}

export async function setDocumentTags(
  userId: string,
  documentId: string,
  tagIds: string[],
): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ tag_ids: tagIds })
    .eq('user_id', userId)
    .eq('id', documentId)
  if (error) throw error
}

export async function setFolderTags(
  userId: string,
  folderId: string,
  tagIds: string[],
): Promise<void> {
  const { error } = await supabase
    .from('folders')
    .update({ tag_ids: tagIds })
    .eq('user_id', userId)
    .eq('id', folderId)
  if (error) throw error
}

export async function renameDocument(
  userId: string,
  documentId: string,
  title: string,
): Promise<void> {
  const { data: row, error: fetchError } = await supabase
    .from('documents')
    .select('folder_id')
    .eq('user_id', userId)
    .eq('id', documentId)
    .maybeSingle()
  if (fetchError) throw fetchError
  if (!row) throw new Error('Document not found')
  const folderId = row.folder_id ?? null
  const siblings = await siblingDocumentTitles(userId, folderId, documentId)
  const finalTitle = resolveUniqueName(title.trim() || 'Untitled', siblings)
  const { error } = await supabase
    .from('documents')
    .update({ title: finalTitle })
    .eq('user_id', userId)
    .eq('id', documentId)
  if (error) throw error
}

export async function moveDocument(
  userId: string,
  documentId: string,
  folderId: string | null,
): Promise<void> {
  const { data: row, error: fetchError } = await supabase
    .from('documents')
    .select('title')
    .eq('user_id', userId)
    .eq('id', documentId)
    .maybeSingle()
  if (fetchError) throw fetchError
  if (!row) throw new Error('Document not found')
  const siblings = await siblingDocumentTitles(userId, folderId, documentId)
  const finalTitle = resolveUniqueName(row.title ?? 'Untitled', siblings)
  const { error } = await supabase
    .from('documents')
    .update({ folder_id: folderId, title: finalTitle })
    .eq('user_id', userId)
    .eq('id', documentId)
  if (error) throw error
}

/** Upload a PDF picked on the computer: store the file then create the document row. */
export async function uploadPdfDocument(
  userId: string,
  file: File,
  folderId: string | null,
  options?: { storageLimitBytes?: number; onStatus?: (message: string) => void },
): Promise<Document> {
  const id = crypto.randomUUID()
  const baseTitle = file.name.replace(/\.pdf$/i, '').trim() || 'Untitled'
  const siblings = await siblingDocumentTitles(userId, folderId)
  const title = resolveUniqueName(baseTitle, siblings)

  if (options?.storageLimitBytes != null) {
    const used = await getStorageUsage(userId)
    if (wouldExceedStorageLimit(used, options.storageLimitBytes, file.size)) {
      throw new StorageLimitError(used, options.storageLimitBytes)
    }
  }

  options?.onStatus?.('Reading document...')
  const extractedText = await extractPdfTextFromFile(file)

  options?.onStatus?.('Uploading...')
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(pdfStoragePath(userId, id), file, {
      upsert: true,
      contentType: 'application/pdf',
    })
  if (uploadError) throw uploadError

  const { error: insertError } = await supabase.from('documents').insert({
    id,
    user_id: userId,
    folder_id: folderId,
    title,
    ocr_text: extractedText,
    tag_ids: [],
  })
  if (insertError) throw insertError

  return {
    id,
    title,
    folderId,
    ocrText: extractedText,
    tagIds: [],
    createdAt: new Date().toISOString(),
  }
}

/** Upload a JPG/JPEG image: store as page 0 then create the document row (matches mobile scans). */
export async function uploadImageDocument(
  userId: string,
  file: File,
  folderId: string | null,
  options?: { storageLimitBytes?: number },
): Promise<Document> {
  const id = crypto.randomUUID()
  const baseTitle = file.name.replace(/\.jpe?g$/i, '').trim() || 'Untitled'
  const siblings = await siblingDocumentTitles(userId, folderId)
  const title = resolveUniqueName(baseTitle, siblings)

  if (options?.storageLimitBytes != null) {
    const used = await getStorageUsage(userId)
    if (wouldExceedStorageLimit(used, options.storageLimitBytes, file.size)) {
      throw new StorageLimitError(used, options.storageLimitBytes)
    }
  }

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(pageImageStoragePath(userId, id, 0), file, {
      upsert: true,
      contentType: 'image/jpeg',
    })
  if (uploadError) throw uploadError

  const { error: insertError } = await supabase.from('documents').insert({
    id,
    user_id: userId,
    folder_id: folderId,
    title,
    ocr_text: '',
    tag_ids: [],
  })
  if (insertError) throw insertError

  return {
    id,
    title,
    folderId,
    ocrText: '',
    tagIds: [],
    createdAt: new Date().toISOString(),
  }
}
