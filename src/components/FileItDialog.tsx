import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  groupFileItSuggestions,
  type FileItFolderRow,
  type FileItItem,
  type FileItSuggestion,
} from '../lib/fileItPaths'
import { suggestFileItDestinations } from '../lib/fileItAi'
import type { Document, Folder } from '../lib/types'
import { ChevronRightIcon, CloseIcon, DocIcon, FolderIcon, SparkleIcon } from './icons'

type Props = {
  items: FileItItem[]
  folders: Folder[]
  documents: Document[]
  onClose: () => void
  onAccept: (suggestions: FileItSuggestion[]) => void | Promise<void>
}

function suggestionsEqual(a: FileItSuggestion[], b: FileItSuggestion[]): boolean {
  if (a.length !== b.length) return false
  return a.every((s, i) => {
    const t = b[i]
    if (!t || s.itemId !== t.itemId) return false
    return (
      s.newFromIndex === t.newFromIndex &&
      s.destinationSegments.length === t.destinationSegments.length &&
      s.destinationSegments.every((seg, j) => seg === t.destinationSegments[j])
    )
  })
}

export default function FileItDialog({ items, folders, documents, onClose, onAccept }: Props) {
  const [phase, setPhase] = useState<'loading' | 'suggestion'>('loading')
  const [statusText, setStatusText] = useState('AI is analyzing your items…')
  const [usingFallback, setUsingFallback] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [suggestions, setSuggestions] = useState<FileItSuggestion[]>([])
  const suggestionsRef = useRef<FileItSuggestion[]>([])
  const [suggestionHistory, setSuggestionHistory] = useState<FileItSuggestion[][]>([])
  const [suggestionHistoryIndex, setSuggestionHistoryIndex] = useState(0)
  const suggestionHistoryRef = useRef<FileItSuggestion[][]>([])
  const activeReqRef = useRef(0)
  const itemsKey = useMemo(() => items.map((i) => i.id).join('\u0001'), [items])

  const folderNames = useMemo(() => folders.map((f) => f.name), [folders])
  const existingFolders = useMemo<FileItFolderRow[]>(
    () => folders.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId })),
    [folders],
  )

  useEffect(() => {
    suggestionsRef.current = suggestions
  }, [suggestions])

  useEffect(() => {
    suggestionHistoryRef.current = suggestionHistory
  }, [suggestionHistory])

  const runSuggestion = useCallback(
    async (isRetry: boolean) => {
      if (items.length === 0) return
      const reqId = Date.now()
      activeReqRef.current = reqId
      setPhase('loading')
      setStatusText(isRetry ? 'Asking for a different suggestion…' : 'AI is analyzing your items…')

      try {
        const { suggestions: next, usedFallback, errorMessage } = await suggestFileItDestinations({
          items,
          folderNames,
          folders,
          documents,
          previousSuggestions: isRetry ? suggestionsRef.current : undefined,
        })

        if (activeReqRef.current !== reqId) return

        const prev = suggestionsRef.current
        setSuggestions(next)
        setUsingFallback(usedFallback)

        if (isRetry) {
          const unchanged = suggestionsEqual(prev, next)
          const nextHistory = unchanged
            ? suggestionHistoryRef.current
            : [...suggestionHistoryRef.current, next]
          suggestionHistoryRef.current = nextHistory
          setSuggestionHistory(nextHistory)
          setSuggestionHistoryIndex(nextHistory.length - 1)
        } else {
          const initialHistory = [next]
          suggestionHistoryRef.current = initialHistory
          setSuggestionHistory(initialHistory)
          setSuggestionHistoryIndex(0)
        }

        if (usedFallback) {
          setStatusText(
            errorMessage
              ? `Using offline matching — ${errorMessage}`
              : 'Using offline folder matching',
          )
        } else if (isRetry && suggestionsEqual(prev, next)) {
          setStatusText('AI returned the same suggestion — try again')
        } else {
          setStatusText("Here's a suggestion")
        }
      } finally {
        if (activeReqRef.current === reqId) {
          setPhase('suggestion')
        }
      }
    },
    [documents, folderNames, folders, items],
  )

  const navigateSuggestion = useCallback((direction: -1 | 1) => {
    setSuggestionHistoryIndex((idx) => {
      const history = suggestionHistoryRef.current
      const nextIdx = Math.max(0, Math.min(history.length - 1, idx + direction))
      const entry = history[nextIdx]
      if (entry) setSuggestions(entry)
      return nextIdx
    })
  }, [])

  useEffect(() => {
    setSuggestions([])
    setSuggestionHistory([])
    setSuggestionHistoryIndex(0)
    suggestionHistoryRef.current = []
    setUsingFallback(false)
    void runSuggestion(false)
  }, [itemsKey, runSuggestion])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !accepting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, accepting])

  const groupedSuggestions = useMemo(
    () => groupFileItSuggestions(suggestions, items, existingFolders),
    [suggestions, items, existingFolders],
  )

  const canNavigateLeft = phase === 'suggestion' && suggestionHistoryIndex > 0 && suggestionHistory.length > 1
  const canNavigateRight =
    phase === 'suggestion' && suggestionHistoryIndex < suggestionHistory.length - 1
  const canAccept = phase === 'suggestion' && suggestions.length > 0

  async function handleAccept() {
    if (!canAccept || accepting) return
    setAccepting(true)
    try {
      await onAccept(suggestions)
    } catch {
      setAccepting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={accepting ? undefined : onClose}
    >
      <div
        className="relative flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-filr-border bg-filr-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {accepting ? (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-filr-bg/70 backdrop-blur-[2px]"
            aria-busy="true"
            aria-label="Filing items"
          >
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-filr-border border-t-filr-accent" />
          </div>
        ) : null}
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-filr-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-filr-text">File it</h2>
            <p className="mt-0.5 text-sm text-filr-muted">{statusText}</p>
            {usingFallback && phase === 'suggestion' && !import.meta.env.DEV ? (
              <p className="mt-1 text-xs text-filr-muted/80">
                Set <code className="text-filr-text">VITE_API_BASE_URL</code> for AI suggestions.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={accepting}
            aria-label="Close"
            className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1.5 text-filr-muted transition hover:bg-filr-surface-2 hover:text-filr-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="shrink-0 border-b border-filr-border px-5 py-3">
          <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((item) => (
              <div
                key={item.id}
                className="inline-flex max-w-[160px] shrink-0 items-center gap-2 rounded-full border border-filr-border bg-filr-surface-2 px-2.5 py-1 text-[13px] font-medium text-filr-text"
              >
                {item.kind === 'folder' ? (
                  <FolderIcon className="h-3.5 w-3.5 shrink-0 text-filr-accent/80" />
                ) : item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="h-4 w-3.5 shrink-0 rounded-sm object-cover"
                  />
                ) : (
                  <DocIcon className="h-3.5 w-3.5 shrink-0 text-filr-muted" />
                )}
                <span className="truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {phase === 'loading' ? (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={`skel-${item.id}`}
                  className="h-16 animate-pulse rounded-xl border border-filr-border bg-filr-bg/40"
                />
              ))}
            </div>
          ) : groupedSuggestions.length === 0 ? (
            <p className="py-6 text-center text-sm text-filr-muted">No suggestions available.</p>
          ) : (
            <div className="space-y-2">
              {groupedSuggestions.map((group) => {
                const namesLabel = group.itemNames.join(', ')
                const hasNew = group.firstNewFolderIndex < group.destinationSegments.length
                return (
                  <div
                    key={group.groupKey}
                    className="rounded-xl border border-filr-border bg-filr-bg/30 px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-filr-surface-2">
                        {group.hasFolder ? (
                          <FolderIcon className="h-4 w-4 text-filr-accent/80" />
                        ) : group.firstDocumentThumbnailUri ? (
                          <img
                            src={group.firstDocumentThumbnailUri}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <DocIcon className="h-4 w-4 text-filr-muted" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-filr-text">{namesLabel}</p>
                        <p className="mt-1 text-xs leading-relaxed text-filr-muted">
                          {group.destinationSegments.map((seg, i) => (
                            <span
                              key={`${group.groupKey}-${i}`}
                              className={i >= group.firstNewFolderIndex ? 'font-medium text-filr-accent' : undefined}
                            >
                              {i > 0 ? ' › ' : ''}
                              {seg}
                            </span>
                          ))}
                        </p>
                      </div>
                      {hasNew ? (
                        <span className="shrink-0 rounded-full bg-filr-accent/15 px-2 py-0.5 text-[11px] font-semibold text-filr-accent">
                          New
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-filr-border px-5 py-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!canNavigateLeft || accepting}
              onClick={() => navigateSuggestion(-1)}
              aria-label="Previous suggestion"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-filr-muted transition hover:bg-filr-surface-2 hover:text-filr-text disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRightIcon className="h-4 w-4 rotate-180" />
            </button>
            <button
              type="button"
              disabled={phase === 'loading' || accepting}
              onClick={() => void runSuggestion(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-filr-text transition hover:bg-filr-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SparkleIcon className="h-4 w-4 text-filr-accent" />
              Try again
            </button>
            <button
              type="button"
              disabled={!canNavigateRight || accepting}
              onClick={() => navigateSuggestion(1)}
              aria-label="Next suggestion"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-filr-muted transition hover:bg-filr-surface-2 hover:text-filr-text disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={accepting}
              className="cursor-pointer rounded-lg border border-filr-border px-3 py-2 text-sm font-medium text-filr-muted transition hover:text-filr-text disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canAccept || accepting}
              onClick={() => void handleAccept()}
              className="cursor-pointer rounded-lg bg-filr-accent px-4 py-2 text-sm font-semibold text-filr-accent-fg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Accept
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
