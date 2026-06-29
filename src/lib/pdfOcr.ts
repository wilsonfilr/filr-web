/**
 * PDF text extraction via OCR.space (same provider as the iOS app).
 */

const OCR_SPACE_ENDPOINT = 'https://api.ocr.space/parse/image'
const MAX_OCR_TEXT_CHARS = 50_000

function ocrSpaceApiKey(): string {
  return import.meta.env.VITE_OCR_SPACE_API_KEY?.trim() || 'helloworld'
}

type OcrSpaceResponse = {
  IsErroredOnProcessing?: boolean
  ErrorMessage?: string | string[]
  ErrorDetails?: string
  ParsedResults?: Array<{ ParsedText?: string }>
}

function parseOcrSpaceResponse(payload: OcrSpaceResponse | null): string {
  if (!payload || payload.IsErroredOnProcessing) {
    const message = Array.isArray(payload?.ErrorMessage)
      ? payload.ErrorMessage.join(' ')
      : payload?.ErrorMessage || payload?.ErrorDetails || 'OCR.space rejected this file.'
    console.warn('[pdfOcr] provider error', message)
    return ''
  }
  const text = (payload.ParsedResults ?? [])
    .map((r) => r.ParsedText ?? '')
    .filter((t) => t.trim().length > 0)
    .join('\n')
    .trim()
  return text.slice(0, MAX_OCR_TEXT_CHARS)
}

export async function extractPdfTextViaOcrSpace(file: File): Promise<string> {
  console.log('[pdfOcr] extractPdfTextViaOcrSpace called', { name: file.name, size: file.size })
  try {
    const form = new FormData()
    form.append('apikey', ocrSpaceApiKey())
    form.append('language', 'eng')
    form.append('isOverlayRequired', 'false')
    form.append('detectOrientation', 'true')
    form.append('OCREngine', '2')
    form.append('isCreateSearchablePdf', 'false')
    form.append('filetype', 'PDF')
    form.append('file', file, file.name || 'document.pdf')

    const response = await fetch(OCR_SPACE_ENDPOINT, { method: 'POST', body: form })
    if (!response.ok) {
      const raw = await response.text().catch(() => '')
      console.warn('[pdfOcr] HTTP error', response.status, raw.slice(0, 180))
      return ''
    }
    const payload = (await response.json()) as OcrSpaceResponse
    const text = parseOcrSpaceResponse(payload)
    console.log('[pdfOcr] extractPdfTextViaOcrSpace result', {
      chars: text.length,
      preview: text.slice(0, 120),
    })
    return text
  } catch (err) {
    console.warn('[pdfOcr] extractPdfTextViaOcrSpace failed', err)
    return ''
  }
}

export async function extractPdfTextViaOcrSpaceUrl(pdfUrl: string): Promise<string> {
  console.log('[pdfOcr] extractPdfTextViaOcrSpaceUrl called', { pdfUrl: pdfUrl.slice(0, 120) })
  try {
    const form = new FormData()
    form.append('apikey', ocrSpaceApiKey())
    form.append('language', 'eng')
    form.append('isOverlayRequired', 'false')
    form.append('detectOrientation', 'true')
    form.append('OCREngine', '2')
    form.append('isCreateSearchablePdf', 'false')
    form.append('filetype', 'PDF')
    form.append('url', pdfUrl)

    const response = await fetch(OCR_SPACE_ENDPOINT, { method: 'POST', body: form })
    if (!response.ok) {
      const raw = await response.text().catch(() => '')
      console.warn('[pdfOcr] HTTP error (url)', response.status, raw.slice(0, 180))
      return ''
    }
    const payload = (await response.json()) as OcrSpaceResponse
    const text = parseOcrSpaceResponse(payload)
    console.log('[pdfOcr] extractPdfTextViaOcrSpaceUrl result', {
      chars: text.length,
      preview: text.slice(0, 120),
    })
    return text
  } catch (err) {
    console.warn('[pdfOcr] extractPdfTextViaOcrSpaceUrl failed', err)
    return ''
  }
}
