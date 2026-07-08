import { supabase } from './supabase'

export const FOLDER_SHARE_BASE_URL = 'https://web.myfilr.app/share'

export type FolderShareLinkRow = {
  id: string
  folder_id: string
  owner_id: string
  token: string
  created_at: string
  revoked_at: string | null
}

/** 256-bit unguessable token (64 hex chars). */
export function generateFolderShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function buildFolderShareUrl(token: string): string {
  return `${FOLDER_SHARE_BASE_URL}/${encodeURIComponent(token)}`
}

export async function getActiveFolderShareLink(
  ownerId: string,
  folderId: string,
): Promise<FolderShareLinkRow | null> {
  const { data, error } = await supabase
    .from('folder_share_links')
    .select('id, folder_id, owner_id, token, created_at, revoked_at')
    .eq('owner_id', ownerId)
    .eq('folder_id', folderId)
    .is('revoked_at', null)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

export async function createOrReuseFolderShareLink(
  ownerId: string,
  folderId: string,
): Promise<FolderShareLinkRow> {
  const existing = await getActiveFolderShareLink(ownerId, folderId)
  if (existing) return existing

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = generateFolderShareToken()
    const { data, error } = await supabase
      .from('folder_share_links')
      .insert({
        folder_id: folderId,
        owner_id: ownerId,
        token,
      })
      .select('id, folder_id, owner_id, token, created_at, revoked_at')
      .single()

    if (!error && data) return data

    if (error?.code === '23505') {
      const raced = await getActiveFolderShareLink(ownerId, folderId)
      if (raced) return raced
    } else if (error) {
      throw error
    }
  }

  throw new Error('Could not create share link')
}

export async function revokeFolderShareLink(ownerId: string, folderId: string): Promise<void> {
  const { error } = await supabase
    .from('folder_share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('owner_id', ownerId)
    .eq('folder_id', folderId)
    .is('revoked_at', null)
  if (error) throw error
}

export type SharedFolderPayload = {
  folderName: string
  folders: Array<{ id: string; name: string; parentId: string | null }>
  files: Array<{ id: string; name: string; folderId: string | null; signedUrl: string; kind: string }>
}

export async function fetchSharedFolderByToken(token: string): Promise<SharedFolderPayload> {
  const { data, error } = await supabase.functions.invoke('get-shared-folder', {
    body: { token },
  })
  if (error) throw error
  if (!data || typeof data !== 'object' || 'error' in (data as Record<string, unknown>)) {
    throw new Error('Link unavailable')
  }
  return data as SharedFolderPayload
}
