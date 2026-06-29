import { useState } from 'react'
import { InfoIcon } from './icons'

export const WEB_UPLOAD_INFO_MESSAGE =
  'Smart Filing and full-text search are only available when scanning documents in the Filr app on iPhone.'

type Props = {
  className?: string
}

export default function WebUploadInfoTip({ className = '' }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((value) => !value)
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-filr-muted transition hover:bg-filr-bg/80 hover:text-filr-accent"
        aria-label="About Smart Filing on web uploads"
        aria-expanded={open}
      >
        <InfoIcon className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-20 cursor-default"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
          />
          <div
            role="tooltip"
            className="absolute left-1/2 top-full z-30 mt-1.5 w-56 -translate-x-1/2 rounded-lg border border-filr-border bg-filr-surface px-3 py-2 text-left text-xs leading-snug text-filr-text shadow-lg shadow-black/30 sm:w-64"
            onClick={(e) => e.stopPropagation()}
          >
            {WEB_UPLOAD_INFO_MESSAGE}
          </div>
        </>
      ) : null}
    </span>
  )
}
