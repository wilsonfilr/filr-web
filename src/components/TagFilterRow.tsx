import type { UserTag } from '../lib/types'
import { PencilIcon } from './icons'
import { TAG_CHIP_BG_MAP, TAG_CHIP_BG_MAP_LIGHT, tagColorHex } from './TagChip'

type Props = {
  tags: UserTag[]
  activeTagIds: string[]
  theme: 'light' | 'dark'
  visible: boolean
  onToggleTag: (tagId: string) => void
  onManageTags: () => void
}

export default function TagFilterRow({ tags, activeTagIds, theme, visible, onToggleTag, onManageTags }: Props) {
  const bgMap = theme === 'light' ? TAG_CHIP_BG_MAP_LIGHT : TAG_CHIP_BG_MAP

  return (
    <div
      className={`filr-tag-row-inner overflow-x-auto pb-1 pt-3 transition-[opacity,transform] duration-300 ease-out [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
    >
      <div className="flex w-max min-w-full gap-2 pr-1">
        {tags.map((tag) => {
          const selected = activeTagIds.includes(tag.id)
          const color = tagColorHex(tag.color)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggleTag(tag.id)}
              className="inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent px-3 py-1.5 text-sm font-medium transition hover:border-filr-accent/40"
              style={{
                backgroundColor: selected ? color : (bgMap[tag.color] ?? bgMap.neutral),
                color: selected ? '#101922' : color,
              }}
            >
              {tag.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={onManageTags}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-filr-border bg-filr-surface-2/80 px-3 py-1.5 text-sm font-medium text-filr-muted transition hover:border-filr-accent/40 hover:text-filr-text"
        >
          <PencilIcon className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
    </div>
  )
}
