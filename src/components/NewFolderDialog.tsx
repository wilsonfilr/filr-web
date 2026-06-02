import { useState } from 'react'
import { CloseIcon, FolderIcon } from './icons'

type Props = {
  parentName: string
  onCreate: (name: string) => void
  onClose: () => void
}

export default function NewFolderDialog({ parentName, onCreate, onClose }: Props) {
  const [name, setName] = useState('Untitled folder')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const next = name.trim()
    if (!next) return
    onCreate(next)
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={submit}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-filr-border bg-filr-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-filr-muted transition hover:bg-filr-surface-2 hover:text-filr-text"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center px-6 pt-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-filr-accent/15 ring-1 ring-filr-accent/30">
            <FolderIcon className="h-7 w-7 text-filr-accent" />
          </div>
          <h2 className="text-lg font-semibold text-filr-text">New folder</h2>
          <p className="mt-1 text-sm text-filr-muted">
            Create a folder in <span className="font-medium text-filr-text">{parentName}</span>
          </p>
        </div>

        <div className="px-6 pb-2 pt-5">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-filr-muted">
            Folder name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onFocus={(e) => e.target.select()}
            placeholder="Untitled folder"
            className="h-11 w-full rounded-lg border border-filr-border bg-filr-bg/60 px-3 text-sm text-filr-text outline-none transition placeholder:text-filr-muted/50 focus:border-filr-accent focus:ring-2 focus:ring-filr-accent/30"
          />
        </div>

        <div className="flex gap-2 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-filr-border px-3 py-2.5 text-sm font-medium text-filr-muted transition hover:text-filr-text"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex-1 rounded-lg bg-filr-accent px-3 py-2.5 text-sm font-semibold text-filr-accent-fg transition hover:opacity-90 disabled:opacity-50"
          >
            Create folder
          </button>
        </div>
      </form>
    </div>
  )
}
