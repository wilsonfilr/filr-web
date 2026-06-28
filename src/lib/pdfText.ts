/**
 * Extract plain text from a PDF File using pdf.js (same worker setup as pdfThumb.ts).
 */

type PdfJs = typeof import('pdfjs-dist')

const MAX_PDF_TEXT_CHARS = 50_000

let pdfjsPromise: Promise<PdfJs> | null = null

async function getPdfjs(): Promise<PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist')
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjs
    })()
  }
  return pdfjsPromise
}

/** Read all pages from a PDF file; returns '' on any failure. */
export async function extractPdfTextFromFile(file: File): Promise<string> {
  try {
    const pdfjs = await getPdfjs()
    const data = await file.arrayBuffer()
    const pdf = await pdfjs.getDocument({ data }).promise
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

    void pdf.destroy()
    return parts.join('\n').slice(0, MAX_PDF_TEXT_CHARS)
  } catch {
    return ''
  }
}
