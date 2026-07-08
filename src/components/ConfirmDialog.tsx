type Props = {
  title: string
  message: string
  confirmLabel: string
  destructive?: boolean
  busy?: boolean
  busyLabel?: string
  error?: string | null
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  destructive = false,
  busy = false,
  busyLabel,
  error,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-filr-border bg-filr-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="space-y-2 px-5 py-5">
          <h2 id="confirm-dialog-title" className="text-base font-semibold text-filr-text">
            {title}
          </h2>
          <p id="confirm-dialog-message" className="text-sm leading-relaxed text-filr-muted">
            {message}
          </p>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
        <footer className="flex justify-end gap-2 border-t border-filr-border px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-filr-border px-3 py-2 text-sm font-medium text-filr-muted transition hover:text-filr-text disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
              destructive
                ? 'bg-red-500 text-white hover:bg-red-400'
                : 'bg-filr-accent text-filr-accent-fg hover:opacity-90'
            }`}
          >
            {busy ? (busyLabel ?? confirmLabel) : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}
