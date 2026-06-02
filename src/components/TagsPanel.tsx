import { useState } from 'react'
import type { UserTag } from '../lib/types'
import { createTag, deleteTag, updateTag } from '../data/filr'
import { TAG_COLOR_ORDER, tagColorHex } from './TagChip'
import { PlusIcon, TrashIcon } from './icons'

type Props = {
  userId: string
  tags: UserTag[]
  onChanged: () => void
}

function nextColor(current: string): string {
  const idx = TAG_COLOR_ORDER.findIndex((c) => c === current)
  return TAG_COLOR_ORDER[(idx + 1) % TAG_COLOR_ORDER.length]
}

export default function TagsPanel({ userId, tags, onChanged }: Props) {
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState<string>('lightBlue')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const label = newLabel.trim()
    if (!label) return
    await run(async () => {
      await createTag(userId, label, newColor, tags.length)
      setNewLabel('')
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form onSubmit={handleAdd} className="flex shrink-0 items-center gap-2 border-b border-filr-border px-6 py-3">
        <button
          type="button"
          onClick={() => setNewColor(nextColor(newColor))}
          title="Change color"
          className="h-6 w-6 shrink-0 cursor-pointer rounded-full ring-2 ring-white/10 transition hover:scale-110"
          style={{ backgroundColor: tagColorHex(newColor) }}
        />
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New tag name"
          className="h-10 flex-1 rounded-lg border border-filr-border bg-filr-bg/60 px-3 text-sm text-filr-text outline-none transition placeholder:text-filr-muted/50 focus:border-filr-accent"
        />
        <button
          type="submit"
          disabled={busy || !newLabel.trim()}
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-filr-accent px-3 text-sm font-semibold text-filr-accent-fg transition hover:opacity-90 disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4" />
          Add
        </button>
      </form>

      {error ? <p className="shrink-0 px-6 pt-3 text-sm text-red-400">{error}</p> : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        {tags.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-filr-muted">No tags yet. Add one above.</p>
        ) : (
          tags.map((tag) => (
            <TagRow
              key={tag.id}
              tag={tag}
              disabled={busy}
              onColor={() => run(() => updateTag(userId, tag.id, { color: nextColor(tag.color) }))}
              onRename={(label) => run(() => updateTag(userId, tag.id, { label }))}
              onDelete={() => run(() => deleteTag(userId, tag.id))}
            />
          ))
        )}
      </div>
    </div>
  )
}

function TagRow({
  tag,
  disabled,
  onColor,
  onRename,
  onDelete,
}: {
  tag: UserTag
  disabled: boolean
  onColor: () => void
  onRename: (label: string) => void
  onDelete: () => void
}) {
  const [label, setLabel] = useState(tag.label)

  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-filr-surface-2/60">
      <button
        type="button"
        onClick={onColor}
        disabled={disabled}
        title="Change color"
        className="h-5 w-5 shrink-0 cursor-pointer rounded-full ring-2 ring-white/10 transition hover:scale-110"
        style={{ backgroundColor: tagColorHex(tag.color) }}
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => {
          const next = label.trim()
          if (next && next !== tag.label) onRename(next)
          else setLabel(tag.label)
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="h-9 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm text-filr-text outline-none transition hover:border-filr-border focus:border-filr-accent focus:bg-filr-bg/60"
      />
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        title="Delete tag"
        className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-filr-muted transition hover:text-red-400"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
