/**
 * Render the first page of a PDF to a JPEG data URL for card thumbnails.
 */

import { getPdfjs } from './pdfjsClient'

const cache = new Map<string, string>()
const inFlight = new Map<string, Promise<string | null>>()

export async function renderPdfFirstPage(
  cacheKey: string,
  url: string,
  maxWidth = 480,
): Promise<string | null> {
  const cached = cache.get(cacheKey)
  if (cached) return cached
  const pending = inFlight.get(cacheKey)
  if (pending) return pending

  const task = (async () => {
    try {
      const pdfjs = await getPdfjs()
      const pdf = await pdfjs.getDocument({ url }).promise
      const page = await pdf.getPage(1)
      const base = page.getViewport({ scale: 1 })
      const scale = Math.min(2, maxWidth / base.width)
      const viewport = page.getViewport({ scale })

      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      await page.render({ canvas, canvasContext: ctx, viewport }).promise
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
      cache.set(cacheKey, dataUrl)
      void pdf.destroy()
      return dataUrl
    } catch (err) {
      console.warn('[pdfThumb] renderPdfFirstPage failed', { cacheKey, err })
      return null
    } finally {
      inFlight.delete(cacheKey)
    }
  })()

  inFlight.set(cacheKey, task)
  return task
}
