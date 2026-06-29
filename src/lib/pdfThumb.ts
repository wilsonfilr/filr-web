/**
 * Render the first page of a PDF to a JPEG data URL, used as a thumbnail when a
 * document has no scanned page image (e.g. PDFs uploaded from the web).
 * pdf.js is loaded lazily so it stays out of the initial bundle.
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
      return await renderPdfPageToDataUrl(pdf, 1, maxWidth, cacheKey)
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

/** Render page 1 from raw PDF bytes (used during upload before storage is available). */
export async function renderPdfFirstPageFromBytes(
  data: ArrayBuffer,
  maxWidth = 480,
): Promise<string | null> {
  const pdfData = data.slice(0)
  try {
    const pdfjs = await getPdfjs()
    const pdf = await pdfjs.getDocument({ data: pdfData }).promise
    return await renderPdfPageToDataUrl(pdf, 1, maxWidth)
  } catch (err) {
    console.warn('[pdfThumb] renderPdfFirstPageFromBytes failed', err)
    return null
  }
}

async function renderPdfPageToDataUrl(
  pdf: Awaited<ReturnType<Awaited<ReturnType<typeof getPdfjs>>['getDocument']>['promise']>,
  pageNum: number,
  maxWidth: number,
  cacheKey?: string,
): Promise<string | null> {
  try {
    const page = await pdf.getPage(pageNum)
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
    if (cacheKey) cache.set(cacheKey, dataUrl)
    void pdf.destroy()
    return dataUrl
  } catch (err) {
    console.warn('[pdfThumb] renderPdfPageToDataUrl failed', err)
    void pdf.destroy()
    return null
  }
}
