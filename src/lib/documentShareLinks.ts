import { supabase } from './supabase'
import { FOLDER_SHARE_BASE_URL } from './folderShareLinks'

export const DOCUMENT_SHARE_TOKEN_PREFIX = 'doc_'

export type DocumentShareLinkRow = {
  id: string
  document_id: string
  owner_id: string
  token: string
  created_at: string
  revoked_at: string | null
}

/** 256-bit unguessable token with doc_ prefix (64 hex chars). */
export function generateDocumentShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${DOCUMENT_SHARE_TOKEN_PREFIX}${hex}`
}

export function isDocumentShareToken(token: string): boolean {
  return token.startsWith(DOCUMENT_SHARE_TOKEN_PREFIX)
}

export function buildDocumentShareUrl(token: string): string {
  return `${FOLDER_SHARE_BASE_URL}/${encodeURIComponent(token)}`
}

export async function listActiveDocumentShareLinks(ownerId: string): Promise<DocumentShareLinkRow[]> {
  const { data, error } = await supabase
    .from('document_share_links')
    .select('id, document_id, owner_id, token, created_at, revoked_at')
    .eq('owner_id', ownerId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getActiveDocumentShareLink(
  ownerId: string,
  documentId: string,
): Promise<DocumentShareLinkRow | null> {
  const { data, error } = await supabase
    .from('document_share_links')
    .select('id, document_id, owner_id, token, created_at, revoked_at')
    .eq('owner_id', ownerId)
    .eq('document_id', documentId)
    .is('revoked_at', null)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

export async function createOrReuseDocumentShareLink(
  ownerId: string,
  documentId: string,
): Promise<DocumentShareLinkRow> {
  const existing = await getActiveDocumentShareLink(ownerId, documentId)
  if (existing) return existing

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = generateDocumentShareToken()
    const { data, error } = await supabase
      .from('document_share_links')
      .insert({
        document_id: documentId,
        owner_id: ownerId,
        token,
      })
      .select('id, document_id, owner_id, token, created_at, revoked_at')
      .single()

    if (!error && data) return data

    if (error?.code === '23505') {
      const raced = await getActiveDocumentShareLink(ownerId, documentId)
      if (raced) return raced
    } else if (error) {
      throw error
    }
  }

  throw new Error('Could not create share link')
}

export async function revokeDocumentShareLink(ownerId: string, documentId: string): Promise<void> {
  const { error } = await supabase
    .from('document_share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('owner_id', ownerId)
    .eq('document_id', documentId)
    .is('revoked_at', null)
  if (error) throw error
}

export type SharedDocumentPayload = {
  name: string
  signedUrl: string
  kind: string
}

export async function fetchSharedDocumentByToken(token: string): Promise<SharedDocumentPayload> {
  const { data, error } = await supabase.functions.invoke('get-shared-document', {
    body: { token },
  })
  if (error) throw error
  if (!data || typeof data !== 'object' || 'error' in (data as Record<string, unknown>)) {
    throw new Error('Link unavailable')
  }
  return data as SharedDocumentPayload
}
