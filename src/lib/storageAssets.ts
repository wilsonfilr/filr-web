import { supabase, DOCUMENTS_BUCKET } from './supabase'

type DownloadOptions = { silent?: boolean }

/** Download a private storage object using the authenticated session (RLS). */
export async function downloadStorageObject(
  path: string,
  options?: DownloadOptions,
): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).download(path)
  if (error || !data) {
    if (!options?.silent) {
      console.warn('[filr] downloadStorageObject failed', { path, error: error?.message })
    }
    return null
  }
  return data
}

/** Download and return a blob object URL. Caller must revoke when done. */
export async function downloadStorageObjectUrl(
  path: string,
  options?: DownloadOptions,
): Promise<string | null> {
  const blob = await downloadStorageObject(path, options)
  if (!blob) return null
  return URL.createObjectURL(blob)
}

export function revokeStorageObjectUrl(url: string | null | undefined): void {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}
