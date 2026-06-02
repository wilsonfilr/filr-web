import type { UserTag } from '../lib/types'

export const TAG_COLOR_MAP: Record<string, string> = {
  neutral: '#9EA6B5',
  orange: '#F29A4A',
  yellow: '#E6C94E',
  red: '#E87A7A',
  lightGreen: '#8FD17A',
  turquoise: '#4FC6B8',
  lightBlue: '#7FB7FF',
  deepPurple: '#7F66E8',
  pink: '#F288BD',
}

export const TAG_COLOR_ORDER = [
  'neutral',
  'orange',
  'yellow',
  'red',
  'lightGreen',
  'turquoise',
  'lightBlue',
  'deepPurple',
  'pink',
] as const

/** Muted pill backgrounds for the tag filter row (dark). */
export const TAG_CHIP_BG_MAP: Record<string, string> = {
  neutral: '#3A4048',
  orange: '#3F3A36',
  yellow: '#403D34',
  red: '#443639',
  lightGreen: '#374038',
  turquoise: '#363F3E',
  lightBlue: '#363E47',
  deepPurple: '#3A3845',
  pink: '#3D3941',
}

/** Muted pill backgrounds for the tag filter row (light). */
export const TAG_CHIP_BG_MAP_LIGHT: Record<string, string> = {
  neutral: '#E4EBF4',
  orange: '#F8EDE3',
  yellow: '#F6F0DE',
  red: '#F8E7E9',
  lightGreen: '#E8F3E4',
  turquoise: '#E3F4F1',
  lightBlue: '#E6EEF9',
  deepPurple: '#EDE9FA',
  pink: '#F7E8F2',
}

export function tagColorHex(color: string): string {
  return TAG_COLOR_MAP[color] ?? TAG_COLOR_MAP.neutral
}

export default function TagChip({ tag }: { tag: UserTag }) {
  const hex = tagColorHex(tag.color)
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{
        color: hex,
        borderColor: `${hex}66`,
        backgroundColor: `${hex}1f`,
      }}
    >
      {tag.label}
    </span>
  )
}
