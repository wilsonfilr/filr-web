export type Folder = {
  id: string
  name: string
  parentId: string | null
  tagIds: string[]
  createdAt: string | null
}

export type Document = {
  id: string
  title: string
  folderId: string | null
  ocrText: string
  tagIds: string[]
  createdAt: string | null
}

export type UserTag = {
  id: string
  label: string
  color: string
}

export type VaultExtraCard = {
  id: string
  title: string
  value: string
}

export type VaultEntry = {
  id: string
  kind: string
  title: string
  personNameLabel?: string
  personName?: string
  idNumberLabel?: string
  idNumber?: string
  showNameCard?: boolean
  showIdNumberCard?: boolean
  extraInfoCards?: VaultExtraCard[]
  photoPaths: string[]
}
