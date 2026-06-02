import { useEffect, useMemo, useState } from 'react'
import type { UserTag } from '../lib/types'
import { createTag } from '../data/filr'
import { CheckIcon, CloseIcon, PlusMarkIcon } from './icons'
import { tagColorHex, TAG_COLOR_ORDER } from './TagChip'

type Props = {
  userId: string
  tags: UserTag[]
  initialTagIds: string[]
  onApply: (tagIds: string[], tagDefs: UserTag[]) => void
  onClose: () => void
  onTagsChanged: () => void
}

function pickColor(seed: string, index: number): string {
  if (!seed) return TAG_COLOR_ORDER[(index % (TAG_COLOR_ORDER.length - 1)) + 1]
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return TAG_COLOR_ORDER[(Math.abs(h) % (TAG_COLOR_ORDER.length - 1)) + 1]
}

export default function AddTagDialog({
  userId,
  tags,
  initialTagIds,
  onApply,
  onClose,
  onTagsChanged,
}: Props) {
  const [localTags, setLocalTags] = useState<UserTag[]>(tags)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(initialTagIds))
  const [customLabels, setCustomLabels] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setLocalTags(tags)
  }, [tags])

  useEffect(() => {
    setSelectedIds(new Set(initialTagIds))
    setCustomLabels([])
    setQuery('')
  }, [initialTagIds])

  const trimmedQuery = query.trim()
  const queryLower = trimmedQuery.toLowerCase()

  const displayTags = useMemo(() => {
    const customPreviews: UserTag[] = customLabels
      .filter((label) => !localTags.some((t) => t.label.trim().toLowerCase() === label.trim().toLowerCase()))
      .map((label, i) => ({
        id: `custom-preview-${label}`,
        label,
        color: pickColor(label, i),
      }))
    const all = [...localTags, ...customPreviews]
    if (!queryLower) return all
    return all.filter((t) => t.label.toLowerCase().includes(queryLower))
  }, [localTags, customLabels, queryLower])

  const exactMatch = localTags.some((t) => t.label.trim().toLowerCase() === queryLower)

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleCustom(label: string) {
    setCustomLabels((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
    )
  }

  async function handleApply() {
    setBusy(true)
    try {
      let nextTags = [...localTags]
      const created: UserTag[] = []

      for (const label of customLabels) {
        const trimmed = label.trim()
        if (!trimmed) continue
        const existing = nextTags.find((t) => t.label.trim().toLowerCase() === trimmed.toLowerCase())
        if (existing) {
          created.push(existing)
          continue
        }
        const color = pickColor(trimmed, nextTags.length)
        const tag = await createTag(userId, trimmed, color, nextTags.length)
        nextTags = [...nextTags, tag]
        created.push(tag)
      }

      setLocalTags(nextTags)
      onTagsChanged()

      const idSet = new Set<string>([...selectedIds])
      for (const t of created) idSet.add(t.id)

      const tagDefs = [...idSet]
        .map((id) => nextTags.find((t) => t.id === id))
        .filter((t): t is UserTag => Boolean(t))

      onApply([...idSet], tagDefs)
    } finally {
      setBusy(false)
    }
  }

  const selectedTagsForChips = useMemo(() => {
    const chips: UserTag[] = []
    for (const id of selectedIds) {
      const t = localTags.find((x) => x.id === id)
      if (t) chips.push(t)
    }
    for (const label of customLabels) {
      const t = localTags.find((x) => x.label.trim().toLowerCase() === label.trim().toLowerCase())
      if (t && !chips.some((c) => c.id === t.id)) chips.push(t)
      else if (!t) chips.push({ id: `custom-preview-${label}`, label, color: pickColor(label, 0) })
    }
    return chips
  }, [selectedIds, customLabels, localTags])

  const canApply = !busy

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/60 sm:items-center sm:p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-filr-border bg-filr-surface shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-filr-border" />
        </div>

        <header className="relative flex items-center justify-center border-b border-filr-border px-5 py-4">
          <h2 className="text-base font-semibold text-filr-text">Tags</h2>
          <button
            onClick={onClose}
            className="absolute right-4 inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-filr-muted transition hover:bg-filr-surface-2 hover:text-filr-text"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        {selectedTagsForChips.length > 0 ? (
          <div className="border-b border-filr-border px-4 py-3">
            <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {selectedTagsForChips.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() =>
                    tag.id.startsWith('custom-preview-') ? toggleCustom(tag.label) : toggleId(tag.id)
                  }
                  className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-filr-border bg-filr-surface-2 px-2.5 text-[13px] font-medium text-filr-text transition hover:bg-filr-bg/80"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: tagColorHex(tag.color) }}
                  />
                  {tag.label}
                  <CloseIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {displayTags.length === 0 && !trimmedQuery ? (
            <p className="py-6 text-center text-sm text-filr-muted">No tags yet — search below to add one.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {displayTags.map((tag) => {
                const isPreview = tag.id.startsWith('custom-preview-')
                const selected = isPreview
                  ? customLabels.includes(tag.label)
                  : selectedIds.has(tag.id)
                const hex = tagColorHex(tag.color)
                return (
                  <button
                    key={tag.id}
                    onClick={() => (isPreview ? toggleCustom(tag.label) : toggleId(tag.id))}
                    className={`flex h-[50px] cursor-pointer items-center justify-between rounded-[18px] bg-filr-bg/60 px-3.5 transition ${
                      selected ? 'scale-[0.98]' : ''
                    }`}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: hex }} />
                      <span className="truncate text-sm font-medium" style={{ color: hex }}>
                        {tag.label}
                      </span>
                    </span>
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition ${
                        selected ? 'bg-filr-accent text-filr-accent-fg' : 'bg-filr-surface-2 text-filr-muted'
                      }`}
                    >
                      {selected ? <CheckIcon className="h-3.5 w-3.5" /> : <PlusMarkIcon className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                )
              })}

              {trimmedQuery && !exactMatch && !customLabels.includes(trimmedQuery) ? (
                <button
                  onClick={() => toggleCustom(trimmedQuery)}
                  className="flex h-[50px] cursor-pointer items-center justify-between rounded-[18px] border border-dashed border-filr-border px-3.5 transition hover:border-filr-accent/50"
                >
                  <span className="truncate text-sm font-medium text-filr-text">{trimmedQuery}</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-filr-accent text-filr-accent-fg">
                    <PlusMarkIcon className="h-3.5 w-3.5" />
                  </span>
                </button>
              ) : null}
            </div>
          )}
        </div>

        <div className="border-t border-filr-border bg-filr-surface px-4 pb-4 pt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or add a tag"
            autoFocus
            className="mb-3 h-11 w-full rounded-xl border border-filr-border bg-filr-bg/60 px-3 text-sm text-filr-text outline-none transition placeholder:text-filr-muted/50 focus:border-filr-accent"
          />

          <button
            disabled={!canApply}
            onClick={() => void handleApply()}
            className="w-full cursor-pointer rounded-xl bg-filr-accent py-2.5 text-sm font-semibold text-filr-accent-fg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
