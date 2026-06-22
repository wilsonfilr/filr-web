type Props = {
  title: string
  message: string
  primaryLabel: string
  onPrimary: () => void
  onClose: () => void
}

export default function StorageAlertDialog({ title, message, primaryLabel, onPrimary, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-filr-border bg-filr-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-labelledby="storage-alert-title"
        aria-describedby="storage-alert-message"
      >
        <div className="space-y-2 px-5 py-5">
          <h2 id="storage-alert-title" className="text-base font-semibold text-filr-text">
            {title}
          </h2>
          <p id="storage-alert-message" className="text-sm leading-relaxed text-filr-muted">
            {message}
          </p>
        </div>
        <footer className="flex justify-end gap-2 border-t border-filr-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-filr-border px-3 py-2 text-sm font-medium text-filr-muted transition hover:text-filr-text"
          >
            Maybe Later
          </button>
          <button
            type="button"
            onClick={onPrimary}
            className="rounded-lg bg-filr-accent px-4 py-2 text-sm font-semibold text-filr-accent-fg transition hover:opacity-90"
          >
            {primaryLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}
