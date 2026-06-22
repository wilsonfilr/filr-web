import { useEffect, useRef, useState } from 'react'

export type ToastState = {
  message: string
  undo?: () => void
  /** Show a spinner and keep the snackbar visible until replaced or dismissed. */
  loading?: boolean
}

export default function Snackbar({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  // Re-arm only when the toast itself changes, not on every parent re-render.
  useEffect(() => {
    setLeaving(false)
    if (toast.loading) {
      return
    }
    const hide = setTimeout(() => setLeaving(true), 4200)
    const remove = setTimeout(() => dismissRef.current(), 4500)
    return () => {
      clearTimeout(hide)
      clearTimeout(remove)
    }
  }, [toast])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <div
        className={`pointer-events-auto flex items-center gap-3 rounded-xl border border-filr-border bg-filr-surface px-4 py-3 shadow-xl shadow-black/40 transition-all duration-300 ${
          leaving ? 'translate-y-3 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        {toast.loading ? (
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-filr-border border-t-filr-accent"
            aria-hidden
          />
        ) : null}
        <span className="text-sm text-filr-text">{toast.message}</span>
        {toast.undo && (
          <button
            onClick={() => {
              toast.undo?.()
              onDismiss()
            }}
            className="rounded-md px-2 py-1 text-sm font-semibold text-filr-accent transition hover:bg-filr-surface-2"
          >
            Undo
          </button>
        )}
      </div>
    </div>
  )
}
