import type { Document, Folder } from './types'
import { folderPathSegments, type FileItItem, type FileItSuggestion } from './fileItPaths'
import { suggestFolderForDocument } from './fileit'

export type FileItItemInput = {
  id: string
  kind: 'folder' | 'document'
  name: string
  ocrText?: string
}

export type FileItSuggestResult = {
  suggestions: FileItSuggestion[]
  usedFallback: boolean
  errorMessage?: string
}

function resolveApiUrl(path: string): string {
  // Dev: same-origin so Vite proxies /fileit-suggest → EAS (browser cannot call EAS directly — CORS).
  if (import.meta.env.DEV && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`
  }
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
  if (base) return `${base}${path}`
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`
  }
  return path
}

function stripJsonFences(raw: string): string {
  let t = raw.trim()
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  }
  return t.trim()
}

function safeParseFileItSuggestions(text: string, itemIds: Set<string>): FileItSuggestion[] | null {
  const cleaned = stripJsonFences(text)
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return null
  }
  if (!Array.isArray(parsed)) return null
  const seen = new Set<string>()
  const out: FileItSuggestion[] = []
  for (const row of parsed) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const itemId = typeof r.itemId === 'string' ? r.itemId : ''
    const destinationSegmentsRaw = Array.isArray(r.destinationSegments) ? r.destinationSegments : []
    if (!itemId || !itemIds.has(itemId) || seen.has(itemId)) continue
    const destinationSegments = destinationSegmentsRaw
      .filter((v): v is string => typeof v === 'string')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6)
    if (destinationSegments.length === 0) continue
    const newFromIndexRaw = typeof r.newFromIndex === 'number' ? r.newFromIndex : destinationSegments.length - 1
    const newFromIndex = Math.max(0, Math.min(destinationSegments.length - 1, Math.floor(newFromIndexRaw)))
    out.push({ itemId, destinationSegments, newFromIndex })
    seen.add(itemId)
  }
  return out
}

function clientFallbackSuggestions(
  items: FileItItem[],
  folders: Folder[],
  documents: Document[],
): FileItSuggestion[] {
  const foldersById = new Map(folders.map((f) => [f.id, f]))
  const docsById = new Map(documents.map((d) => [d.id, d]))
  return items.map((item) => {
    if (item.kind === 'document') {
      const doc = docsById.get(item.id)
      const match = doc ? suggestFolderForDocument(doc, folders) : null
      if (match) {
        const segments = folderPathSegments(match.folderId, foldersById)
        return {
          itemId: item.id,
          destinationSegments: segments.length > 0 ? segments : [match.folderName],
          newFromIndex: segments.length,
        }
      }
    }
    return { itemId: item.id, destinationSegments: ['Inbox'], newFromIndex: 0 }
  })
}

async function readJsonResponse(res: Response): Promise<{ ok?: boolean; text?: string; error?: string } | null> {
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return null
  }
  try {
    return (await res.json()) as { ok?: boolean; text?: string; error?: string }
  } catch {
    return null
  }
}

export async function suggestFileItDestinations(params: {
  items: FileItItem[]
  folderNames: string[]
  folders: Folder[]
  documents: Document[]
  previousSuggestions?: FileItSuggestion[]
}): Promise<FileItSuggestResult> {
  const { items, folderNames, folders, documents, previousSuggestions } = params
  if (items.length === 0) return { suggestions: [], usedFallback: false }

  const docsById = new Map(documents.map((d) => [d.id, d]))
  const itemIds = new Set(items.map((i) => i.id))
  const fallback = clientFallbackSuggestions(items, folders, documents)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)

  try {
    const input: FileItItemInput[] = items.map((i) => {
      const doc = i.kind === 'document' ? docsById.get(i.id) : undefined
      const ocrText = doc?.ocrText?.trim()
      return {
        id: i.id,
        kind: i.kind,
        name: i.name,
        ...(ocrText ? { ocrText: ocrText.slice(0, 500) } : {}),
      }
    })

    const url = resolveApiUrl('/fileit-suggest')
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ items: input, folderNames, previousSuggestions }),
    })

    const payload = await readJsonResponse(res)
    if (!payload) {
      return {
        suggestions: fallback,
        usedFallback: true,
        errorMessage: `AI endpoint unavailable (${url})`,
      }
    }
    if (!res.ok || !payload.ok || typeof payload.text !== 'string') {
      return {
        suggestions: fallback,
        usedFallback: true,
        errorMessage: payload.error ?? `HTTP ${res.status}`,
      }
    }

    const parsed = safeParseFileItSuggestions(payload.text, itemIds)
    if (!parsed || parsed.length === 0) {
      return {
        suggestions: fallback,
        usedFallback: true,
        errorMessage: 'Invalid response from AI',
      }
    }

    const existing = new Set(parsed.map((p) => p.itemId))
    for (const item of items) {
      if (!existing.has(item.id)) {
        const fb = fallback.find((f) => f.itemId === item.id)
        if (fb) parsed.push(fb)
      }
    }
    return { suggestions: parsed, usedFallback: false }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      suggestions: fallback,
      usedFallback: true,
      errorMessage: controller.signal.aborted ? 'Request timed out' : msg,
    }
  } finally {
    clearTimeout(timeout)
  }
}
