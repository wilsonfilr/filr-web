import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export type MenuAction = {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
}

export default function ContextMenu({
  x,
  y,
  actions,
  onClose,
}: {
  x: number
  y: number
  actions: MenuAction[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    let nx = x
    let ny = y
    if (x + rect.width > window.innerWidth - 8) nx = window.innerWidth - rect.width - 8
    if (y + rect.height > window.innerHeight - 8) ny = window.innerHeight - rect.height - 8
    setPos({ x: Math.max(8, nx), y: Math.max(8, ny) })
  }, [x, y])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onClose)
    window.addEventListener('scroll', onClose, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-[70] min-w-[180px] overflow-hidden rounded-xl border border-filr-border bg-filr-surface py-1 shadow-2xl shadow-black/50"
      onContextMenu={(e) => e.preventDefault()}
    >
      {actions.map((action, i) => (
        <button
          key={i}
          disabled={action.disabled}
          onClick={() => {
            if (action.disabled) return
            action.onClick()
            onClose()
          }}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition ${
            action.disabled
              ? 'cursor-not-allowed text-filr-muted/40'
              : action.destructive
                ? 'cursor-pointer text-red-400 hover:bg-red-500/10'
                : 'cursor-pointer text-filr-text hover:bg-filr-surface-2'
          }`}
        >
          {action.icon && (
            <span className={action.destructive ? 'text-red-400' : 'text-filr-muted'}>
              {action.icon}
            </span>
          )}
          {action.label}
        </button>
      ))}
    </div>
  )
}
