import { useEffect, useState } from 'react'
import type { VaultEntry } from '../lib/types'
import { createSignedUrl, fetchVaultEntries } from '../data/filr'

type Props = {
  userId: string
}

export default function VaultPanel({ userId }: Props) {
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      const list = await fetchVaultEntries(userId)
      if (!active) return
      setEntries(list)
      setLoading(false)
      const urls: Record<string, string> = {}
      await Promise.all(
        list.flatMap((entry) =>
          entry.photoPaths.map(async (path) => {
            const url = await createSignedUrl(path, 3600)
            if (url) urls[path] = url
          }),
        ),
      )
      if (active) setPhotoUrls(urls)
    })()
    return () => {
      active = false
    }
  }, [userId])

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <p className="text-sm text-filr-muted">Loading your vault…</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-filr-text">Your vault is empty.</p>
            <p className="mt-1 max-w-xs text-sm text-filr-muted">
              Add ID cards, passports and other sensitive documents from the Filr mobile app.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <VaultCard key={entry.id} entry={entry} photoUrls={photoUrls} onOpenPhoto={setLightbox} />
            ))}
          </div>
        )}
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-6"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      ) : null}
    </>
  )
}

function VaultCard({
  entry,
  photoUrls,
  onOpenPhoto,
}: {
  entry: VaultEntry
  photoUrls: Record<string, string>
  onOpenPhoto: (url: string) => void
}) {
  const fields: { label: string; value: string }[] = []
  if (entry.showNameCard && entry.personName) {
    fields.push({ label: entry.personNameLabel || 'Name', value: entry.personName })
  }
  if (entry.showIdNumberCard && entry.idNumber) {
    fields.push({ label: entry.idNumberLabel || 'Number', value: entry.idNumber })
  }
  for (const c of entry.extraInfoCards ?? []) {
    if (c.value) fields.push({ label: c.title || 'Info', value: c.value })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-filr-border bg-filr-bg/30">
      <div className="flex items-center justify-between border-b border-filr-border px-4 py-3">
        <p className="text-sm font-semibold text-filr-text">{entry.title || entry.kind}</p>
        <span className="rounded-full border border-filr-border px-2 py-0.5 text-[11px] font-medium text-filr-muted">
          {entry.kind}
        </span>
      </div>

      {fields.length > 0 ? (
        <dl className="divide-y divide-filr-border/60 px-4">
          {fields.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-xs uppercase tracking-wide text-filr-muted">{f.label}</dt>
              <dd className="truncate text-sm font-medium text-filr-text">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {entry.photoPaths.length > 0 ? (
        <div className="flex flex-wrap gap-2 px-4 pb-4 pt-3">
          {entry.photoPaths.map((path) => {
            const url = photoUrls[path]
            return (
              <button
                key={path}
                type="button"
                onClick={() => url && onOpenPhoto(url)}
                className="h-24 w-36 cursor-pointer overflow-hidden rounded-lg border border-filr-border bg-filr-bg/60 transition hover:border-filr-accent/60"
              >
                {url ? (
                  <img src={url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-filr-border border-t-filr-accent/70" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
