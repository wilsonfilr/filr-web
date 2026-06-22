export const UPLOAD_FILE_ACCEPT = 'application/pdf,image/jpeg,.jpg,.jpeg'

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

export function isUploadableFile(file: File): boolean {
  return isPdfFile(file) || isJpgFile(file)
}
