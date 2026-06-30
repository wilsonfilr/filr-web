export const UPLOAD_FILE_ACCEPT = 'application/pdf,image/jpeg,.jpg,.jpeg,text/plain,.txt'

const MAX_TEXT_FILE_CHARS = 50_000

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export function isJpgFile(file: File): boolean {
  const lower = file.name.toLowerCase()
  return (
    file.type === 'image/jpeg' ||
    file.type === 'image/jpg' ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg')
  )
}

export function isTxtFile(file: File): boolean {
  const lower = file.name.toLowerCase()
  return file.type === 'text/plain' || lower.endsWith('.txt')
}

export function isUploadableFile(file: File): boolean {
  return isPdfFile(file) || isJpgFile(file) || isTxtFile(file)
}

export function readTextFileContent(file: File): Promise<string> {
  return file.text().then((text) => text.slice(0, MAX_TEXT_FILE_CHARS))
}

export { MAX_TEXT_FILE_CHARS }
