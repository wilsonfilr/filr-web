import { CloseIcon } from './icons'
import TagsPanel from './TagsPanel'
import type { UserTag } from '../lib/types'

type Props = {
  userId: string
  tags: UserTag[]
  onClose: () => void
  onChanged: () => void
}

export default function TagsModal({ userId, tags, onClose, onChanged }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-[80vh] max-h-[640px] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-filr-border bg-filr-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-filr-border px-5 py-4">
          <h2 className="text-base font-semibold text-filr-text">Tags</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-filr-muted transition hover:bg-filr-surface-2 hover:text-filr-text"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>
        <TagsPanel userId={userId} tags={tags} onChanged={onChanged} />
      </div>
    </div>
  )
}
