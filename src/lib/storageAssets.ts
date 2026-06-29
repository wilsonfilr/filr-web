import { supabase, DOCUMENTS_BUCKET } from './supabase'

export async function storageObjectExists(path: string): Promise<boolean> {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).exists(path)
  if (error) {
    console.warn('[filr] storageObjectExists failed', { path, error: error.message })
    return false
  }
  return data === true
}

export async function downloadStorageObject(path: string): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).download(path)
  if (error || !data) {
    console.warn('[filr] downloadStorageObject failed', { path, error: error?.message })
    return null
  }
  return data
}

export async function downloadStorageObjectUrl(path: string): Promise<string | null> {
  const blob = await downloadStorageObject(path)
  if (!blob) return null
  return URL.createObjectURL(blob)
}

export function revokeStorageObjectUrl(url: string | null | undefined): void {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}
