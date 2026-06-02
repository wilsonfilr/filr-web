import { useEffect, useMemo, useState } from 'react'
import type { Folder } from '../lib/types'
import { type DragItem, getDragData, setDragData } from '../lib/dnd'
import { ChevronRightIcon, FolderIcon, HomeIcon, SidebarToggleIcon } from './icons'

type Props = {
  folders: Folder[]
  documentCounts: Map<string | null, number>
  selectedFolderId: string | null
  collapsed: boolean
  onSelect: (folderId: string | null) => void
  onToggleSidebar: () => void
  dragItems: DragItem[] | null
  onDragStartFolder: (folderId: string) => DragItem[]
  onDragEnd: () => void
  onDropItem: (targetFolderId: string | null, items: DragItem[]) => void
  canDropOn: (targetFolderId: string | null) => boolean
}

export default function Sidebar(props: Props) {
  const {
    folders,
    documentCounts,
    selectedFolderId,
    collapsed,
    onSelect,
    onToggleSidebar,
    dragItems,
    canDropOn,
    onDropItem,
  } = props

  const [homeDragOver, setHomeDragOver] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const foldersById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders])

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, Folder[]>()
    for (const f of folders) {
      const list = map.get(f.parentId) ?? []
      list.push(f)
      map.set(f.parentId, list)
    }
    return map
  }, [folders])

  useEffect(() => {
    if (!selectedFolderId) return
    setExpanded((prev) => {
      const next = new Set(prev)
      let current = foldersById.get(selectedFolderId)
      while (current) {
        next.add(current.id)
        current = current.parentId ? foldersById.get(current.parentId) : undefined
      }
      return next
    })
  }, [selectedFolderId, foldersById])

  const onToggleExpand = (folderId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })

  const totalDocs = useMemo(
    () => Array.from(documentCounts.values()).reduce((a, b) => a + b, 0),
    [documentCounts],
  )

  const homeDroppable = dragItems !== null && canDropOn(null)

  if (collapsed) {
    return (
      <aside className="flex h-full w-12 shrink-0 flex-col border-r border-filr-border bg-filr-surface/40">
        <div className="flex w-full justify-center px-3 pt-3">
          <button
            onClick={onToggleSidebar}
            title="Show sidebar"
            aria-label="Show sidebar"
            className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-filr-muted transition hover:bg-filr-surface-2 hover:text-filr-text"
          >
            <SidebarToggleIcon className="h-4 w-4" />
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-filr-border bg-filr-surface/40">
      <div className="flex items-center px-3 py-3">
        <button
          onClick={onToggleSidebar}
          title="Hide sidebar"
          aria-label="Hide sidebar"
          className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-filr-muted transition hover:bg-filr-surface-2 hover:text-filr-text"
        >
          <SidebarToggleIcon className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <button
          onClick={() => onSelect(null)}
          onDragOver={(e) => {
            if (homeDroppable) {
              e.preventDefault()
              setHomeDragOver(true)
            }
          }}
          onDragLeave={() => setHomeDragOver(false)}
          onDrop={(e) => {
            setHomeDragOver(false)
            const items = getDragData(e)
            if (items && canDropOn(null)) {
              e.preventDefault()
              onDropItem(null, items)
            }
          }}
          className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm transition ${
            homeDragOver
              ? 'bg-filr-accent/15 ring-1 ring-filr-accent/60'
              : selectedFolderId === null
                ? 'bg-filr-surface-2 text-filr-text'
                : 'text-filr-muted hover:bg-filr-surface-2/60 hover:text-filr-text'
          }`}
        >
          <HomeIcon filled={selectedFolderId === null} className="h-4 w-4 shrink-0 -translate-y-px" />
          <span className="flex-1 text-left">Home</span>
          <span className="text-xs text-filr-muted/70">{totalDocs}</span>
        </button>

        <div className="mt-1 flex flex-col">
          {(childrenByParent.get(null) ?? []).map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              depth={0}
              childrenByParent={childrenByParent}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              {...props}
            />
          ))}
        </div>
      </nav>
    </aside>
  )
}

type FolderNodeProps = {
  folder: Folder
  depth: number
  childrenByParent: Map<string | null, Folder[]>
  documentCounts: Map<string | null, number>
  selectedFolderId: string | null
  onSelect: (folderId: string | null) => void
  dragItems: DragItem[] | null
  onDragStartFolder: (folderId: string) => DragItem[]
  onDragEnd: () => void
  onDropItem: (targetFolderId: string | null, items: DragItem[]) => void
  canDropOn: (targetFolderId: string | null) => boolean
  expanded: Set<string>
  onToggleExpand: (folderId: string) => void
}

function FolderNode({
  folder,
  depth,
  childrenByParent,
  documentCounts,
  selectedFolderId,
  onSelect,
  dragItems,
  onDragStartFolder,
  onDragEnd,
  onDropItem,
  canDropOn,
  expanded,
  onToggleExpand,
}: FolderNodeProps) {
  const [dragOver, setDragOver] = useState(false)
  const children = childrenByParent.get(folder.id) ?? []
  const hasChildren = children.length > 0
  const count = documentCounts.get(folder.id) ?? 0
  const isSelected = selectedFolderId === folder.id
  const isOpen = expanded.has(folder.id)
  const droppable = dragItems !== null && canDropOn(folder.id)

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => {
          const items = onDragStartFolder(folder.id)
          setDragData(e, items)
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          if (droppable) {
            e.preventDefault()
            setDragOver(true)
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          setDragOver(false)
          const items = getDragData(e)
          if (items && canDropOn(folder.id)) {
            e.preventDefault()
            onDropItem(folder.id, items)
          }
        }}
        className={`group flex items-center gap-1 rounded-lg pr-2 transition ${
          dragOver
            ? 'bg-filr-accent/15 ring-1 ring-filr-accent/60'
            : isSelected
              ? 'bg-filr-surface-2 text-filr-text'
              : 'text-filr-muted hover:bg-filr-surface-2/60 hover:text-filr-text'
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <button
          onClick={() => onToggleExpand(folder.id)}
          className={`flex h-6 w-5 cursor-pointer items-center justify-center text-filr-muted transition ${
            hasChildren ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <ChevronRightIcon className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </button>
        <button
          onClick={() => onSelect(folder.id)}
          className="flex flex-1 cursor-pointer items-center gap-2 py-2 text-sm"
        >
          <FolderIcon className="h-4 w-4 shrink-0 text-filr-accent/80" />
          <span className="flex-1 truncate text-left">{folder.name}</span>
          {count > 0 && <span className="text-xs text-filr-muted/70">{count}</span>}
        </button>
      </div>

      {hasChildren && (
        <div
          className="grid transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col">
              {children.map((child) => (
                <FolderNode
                  key={child.id}
                  folder={child}
                  depth={depth + 1}
                  childrenByParent={childrenByParent}
                  documentCounts={documentCounts}
                  selectedFolderId={selectedFolderId}
                  onSelect={onSelect}
                  dragItems={dragItems}
                  onDragStartFolder={onDragStartFolder}
                  onDragEnd={onDragEnd}
                  onDropItem={onDropItem}
                  canDropOn={canDropOn}
                  expanded={expanded}
                  onToggleExpand={onToggleExpand}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
