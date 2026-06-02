import type { Document, Folder } from './types'

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'at', 'my', 'your',
  'document', 'documents', 'file', 'files', 'folder', 'scan', 'scans', 'new', 'misc',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
}

/**
 * Lightweight, client-side folder suggestion: score each folder's name tokens
 * against the document's title + OCR text and return the best match.
 * (The mobile app uses an Anthropic-backed endpoint; this keeps secrets server-side.)
 */
export function suggestFolderForDocument(
  doc: Document,
  folders: Folder[],
): { folderId: string; folderName: string } | null {
  const haystack = new Set(tokenize(`${doc.title} ${doc.ocrText}`))
  if (haystack.size === 0) return null

  let best: { folderId: string; folderName: string; score: number } | null = null
  for (const folder of folders) {
    const nameTokens = tokenize(folder.name)
    if (nameTokens.length === 0) continue
    let score = 0
    for (const token of nameTokens) {
      if (haystack.has(token)) score += 1
    }
    // Normalize lightly so short, fully-matching names win over long partial ones.
    const ratio = score / nameTokens.length
    const weighted = score + ratio
    if (weighted > 0 && (!best || weighted > best.score)) {
      best = { folderId: folder.id, folderName: folder.name, score: weighted }
    }
  }

  return best ? { folderId: best.folderId, folderName: best.folderName } : null
}
