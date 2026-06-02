import { useState } from 'react'
import { CloseIcon } from './icons'

type Props = {
  initialName: string
  kind: 'document' | 'folder'
  onRename: (name: string) => void
  onClose: () => void
}

export default function RenameDialog({ initialName, kind, onRename, onClose }: Props) {
  const [name, setName] = useState(initialName)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const next = name.trim()
    if (!next) return
    onRename(next)
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={submit}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-filr-border bg-filr-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-filr-border px-5 py-4">
          <h2 className="text-base font-semibold text-filr-text">
            Rename {kind === 'folder' ? 'folder' : 'document'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-filr-muted transition hover:bg-filr-surface-2 hover:text-filr-text"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>
        <div className="px-5 py-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onFocus={(e) => e.target.select()}
            className="h-11 w-full rounded-lg border border-filr-border bg-filr-bg/60 px-3 text-sm text-filr-text outline-none transition focus:border-filr-accent"
          />
        </div>
        <footer className="flex justify-end gap-2 border-t border-filr-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-filr-border px-3 py-2 text-sm font-medium text-filr-muted transition hover:text-filr-text"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-lg bg-filr-accent px-4 py-2 text-sm font-semibold text-filr-accent-fg transition hover:opacity-90 disabled:opacity-50"
          >
            Save
          </button>
        </footer>
      </form>
    </div>
  )
}
