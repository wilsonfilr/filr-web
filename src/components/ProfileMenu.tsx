import { useEffect, useRef, useState } from 'react'
import type { Theme } from '../hooks/useTheme'
import { LogOutIcon, MoonIcon, SettingsIcon, SunIcon, TagIcon, UserIcon } from './icons'

type Props = {
  email: string | null
  theme: Theme
  onThemeChange: (t: Theme) => void
  onManageTags: () => void
  onOpenSettings: () => void
  onSignOut: () => void
}

export default function ProfileMenu({
  email,
  theme,
  onThemeChange,
  onManageTags,
  onOpenSettings,
  onSignOut,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-filr-accent text-filr-accent-fg outline-none ring-filr-accent/40 transition hover:opacity-90 focus-visible:ring-2"
      >
        <UserIcon className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-xl border border-filr-border bg-filr-surface shadow-xl shadow-black/30">
          <div className="flex items-center gap-3 border-b border-filr-border px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-filr-accent text-filr-accent-fg">
              <UserIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-filr-text">
                {email ?? 'Signed in'}
              </p>
              <p className="text-xs text-filr-muted">Filr account</p>
            </div>
          </div>

          <div className="px-3 py-3">
            <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-filr-muted">
              Appearance
            </p>
            <div className="flex gap-1 rounded-lg bg-filr-bg/60 p-1">
              <ThemeOption
                label="Light"
                active={theme === 'light'}
                onClick={() => onThemeChange('light')}
                icon={<SunIcon className="h-4 w-4" />}
              />
              <ThemeOption
                label="Dark"
                active={theme === 'dark'}
                onClick={() => onThemeChange('dark')}
                icon={<MoonIcon className="h-4 w-4" />}
              />
            </div>
          </div>

          <div className="border-t border-filr-border px-2 py-1.5">
            <MenuRow
              label="Tags"
              onClick={() => {
                setOpen(false)
                onManageTags()
              }}
              icon={<TagIcon className="h-4 w-4" />}
            />
            <MenuRow
              label="Settings"
              onClick={() => {
                setOpen(false)
                onOpenSettings()
              }}
              icon={<SettingsIcon className="h-4 w-4" />}
            />
            <MenuRow
              label="Sign out"
              destructive
              onClick={() => {
                setOpen(false)
                onSignOut()
              }}
              icon={<LogOutIcon className="h-4 w-4" />}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function ThemeOption({
  label,
  icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex flex-1 cursor-pointer items-center justify-center rounded-md px-3 py-1.5 transition ${
        active ? 'bg-filr-surface-2 text-filr-text' : 'text-filr-muted hover:text-filr-text'
      }`}
    >
      {icon}
    </button>
  )
}

function MenuRow({
  label,
  icon,
  onClick,
  destructive,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
        destructive
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-filr-text hover:bg-filr-surface-2'
      }`}
    >
      <span className={destructive ? 'text-red-400' : 'text-filr-muted'}>{icon}</span>
      {label}
    </button>
  )
}
