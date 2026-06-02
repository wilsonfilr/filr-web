import { useEffect, useRef, type RefObject } from 'react'
import type { SortOption } from '../lib/sortAndFilter'
import { CheckIcon, TagIcon } from './icons'

type Props = {
  sortOption: SortOption
  tagFilterOpen: boolean
  anchorRef: RefObject<HTMLElement | null>
  onToggleTagFilter: () => void
  onToggleNameSort: () => void
  onToggleUpdatedSort: () => void
  onClose: () => void
}

export default function SortMenu({
  sortOption,
  tagFilterOpen,
  anchorRef,
  onToggleTagFilter,
  onToggleNameSort,
  onToggleUpdatedSort,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const target = e.target as Node
      if (ref.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, anchorRef])

  const nameActive = sortOption === 'name-asc' || sortOption === 'name-desc'
  const updatedActive = sortOption === 'updated-asc' || sortOption === 'updated-desc'

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-xl border border-filr-border bg-filr-surface py-1 shadow-2xl shadow-black/40"
    >
      <button
        type="button"
        onClick={() => {
          onToggleTagFilter()
          onClose()
        }}
        className="flex w-full cursor-pointer items-center gap-3 border-b border-filr-border px-3 py-2.5 text-left text-sm font-medium text-filr-text transition hover:bg-filr-surface-2"
      >
        <span className="flex h-[19px] w-[19px] shrink-0 items-center justify-center">
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
              tagFilterOpen ? 'border-filr-accent bg-filr-accent' : 'border-filr-muted/50 bg-transparent'
            }`}
          >
            {tagFilterOpen ? <span className="h-1.5 w-1.5 rounded-full bg-filr-accent-fg" /> : null}
          </span>
        </span>
        <span className="flex-1">Tags</span>
        <TagIcon className="h-4 w-4 text-filr-muted" />
      </button>

      <button
        type="button"
        onClick={() => {
          onToggleNameSort()
          onClose()
        }}
        className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm text-filr-text transition hover:bg-filr-surface-2"
      >
        <span className="flex h-[19px] w-[19px] shrink-0 items-center justify-center text-filr-text">
          {nameActive ? <CheckIcon className="h-[19px] w-[19px]" /> : null}
        </span>
        <span className="flex-1">Name</span>
        <span className="w-4 text-center text-filr-muted">{nameActive ? (sortOption === 'name-desc' ? '↓' : '↑') : ''}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onToggleUpdatedSort()
          onClose()
        }}
        className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm text-filr-text transition hover:bg-filr-surface-2"
      >
        <span className="flex h-[19px] w-[19px] shrink-0 items-center justify-center text-filr-text">
          {updatedActive ? <CheckIcon className="h-[19px] w-[19px]" /> : null}
        </span>
        <span className="flex-1">Last edited</span>
        <span className="w-4 text-center text-filr-muted">
          {updatedActive ? (sortOption === 'updated-asc' ? '↑' : '↓') : ''}
        </span>
      </button>
    </div>
  )
}
