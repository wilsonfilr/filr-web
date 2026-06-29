/**
 * Extract plain text from a PDF using pdf.js.
 */

import { getPdfjs } from './pdfjsClient'

const MAX_PDF_TEXT_CHARS = 50_000

/** Read all pages from raw PDF bytes; returns '' on any failure. */
export async function extractPdfTextFromBytes(data: ArrayBuffer): Promise<string> {
  // Copy before pdf.js — the worker may transfer/detach the underlying buffer.
  const pdfData = data.slice(0)
  try {
    const pdfjs = await getPdfjs()
    const pdf = await pdfjs.getDocument({ data: pdfData }).promise
    const parts: string[] = []
    let totalChars = 0

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      if (totalChars >= MAX_PDF_TEXT_CHARS) {
        break
      }
      const page = await pdf.getPage(pageNum)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (pageText.length > 0) {
        parts.push(pageText)
        totalChars += pageText.length + 1
      }
    }

    const numPages = pdf.numPages
    void pdf.destroy()
    const text = parts.join('\n').slice(0, MAX_PDF_TEXT_CHARS)
    console.log('[pdfText] extractPdfTextFromBytes', {
      pages: numPages,
      chars: text.length,
      preview: text.slice(0, 120),
    })
    return text
  } catch (err) {
    console.warn('[pdfText] extractPdfTextFromBytes failed', err)
    return ''
  }
}

/** Read all pages from a PDF File; returns '' on any failure. */
export async function extractPdfTextFromFile(file: File): Promise<string> {
  console.log('[pdfText] extractPdfTextFromFile called', { name: file.name, size: file.size })
  try {
    const data = await file.arrayBuffer()
    return await extractPdfTextFromBytes(data)
  } catch (err) {
    console.warn('[pdfText] extractPdfTextFromFile failed', err)
    return ''
  }
}
