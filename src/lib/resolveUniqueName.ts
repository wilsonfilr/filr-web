/** Ensure a name is unique among siblings (case-insensitive). Appends " 2", " 3", … when needed. */
export function resolveUniqueName(baseName: string, existingNames: string[]): string {
  const normalized = new Set(existingNames.map((name) => name.trim().toLowerCase()))
  const trimmed = baseName.trim()
  if (!normalized.has(trimmed.toLowerCase())) {
    return trimmed
  }
  let index = 2
  while (normalized.has(`${trimmed} ${index}`.toLowerCase())) {
    index += 1
  }
  return `${trimmed} ${index}`
}
