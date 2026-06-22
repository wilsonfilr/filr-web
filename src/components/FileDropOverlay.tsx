import { UploadIcon } from './icons'

type Props = {
  visible: boolean
  folderName: string
  uploading: boolean
}

export default function FileDropOverlay({ visible, folderName, uploading }: Props) {
  if (!visible && !uploading) return null

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[55] flex items-center justify-center bg-filr-bg/70 p-6 backdrop-blur-sm transition-opacity duration-150 ${
        visible || uploading ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden={!visible && !uploading}
    >
      <div
        className={`flex max-w-md flex-col items-center rounded-2xl border-2 border-dashed px-10 py-12 text-center shadow-2xl transition ${
          visible
            ? 'border-filr-accent bg-filr-surface/95 ring-4 ring-filr-accent/25'
            : 'border-filr-border bg-filr-surface/90'
        }`}
      >
        <div
          className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
            visible ? 'bg-filr-accent/15 text-filr-accent' : 'bg-filr-surface-2 text-filr-muted'
          }`}
        >
          <UploadIcon className="h-7 w-7" />
        </div>
        <p className="text-lg font-semibold text-filr-text">
          {uploading ? 'Uploading…' : 'Drop files here'}
        </p>
        <p className="mt-2 text-sm text-filr-muted">
          {uploading ? (
            <>Adding to {folderName}</>
          ) : (
            <>
              Release to upload to{' '}
              <span className="font-medium text-filr-text">{folderName}</span>
            </>
          )}
        </p>
        {!uploading ? (
          <p className="mt-3 text-xs text-filr-muted/80">PDF or JPG</p>
        ) : null}
      </div>
    </div>
  )
}
