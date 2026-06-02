import type { UserTag } from '../lib/types'
import { tagColorHex } from './TagChip'

const CIRCLE_PX = 14
const OVERLAP_PX = 7

type Props = {
  tagIds: string[]
  tagsById: Map<string, UserTag>
}

/** Overlapping colored dots for folder/document rows — matches the mobile app. */
export default function ItemTagCircles({ tagIds, tagsById }: Props) {
  const display = tagIds.filter((id) => tagsById.has(id)).slice(-3)
  if (display.length === 0) return null

  return (
    <span className="inline-flex shrink-0 items-center" aria-hidden="true">
      {display.map((id, i) => {
        const tag = tagsById.get(id)
        if (!tag) return null
        return (
          <span
            key={id}
            className="shrink-0 rounded-full"
            style={{
              width: CIRCLE_PX,
              height: CIRCLE_PX,
              backgroundColor: tagColorHex(tag.color),
              marginLeft: i > 0 ? -OVERLAP_PX : 0,
              zIndex: i,
            }}
          />
        )
      })}
    </span>
  )
}
