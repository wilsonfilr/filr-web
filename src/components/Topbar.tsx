import { useRef } from 'react'
import type { Theme } from '../hooks/useTheme'
import { SIDEBAR_PEEK, SIDEBAR_WIDTH } from '../lib/layout'
import { SearchIcon, ExportIcon, UpgradeCrownIcon, CloseIcon } from './icons'
import { FilrLogoMark, FilrWordmark } from './brandLogos'
import ProfileMenu from './ProfileMenu'

type Props = {
  query: string
  onQueryChange: (q: string) => void
  email: string | null
  uploading: boolean
  syncing: boolean
  onUpload: (files: FileList) => void
  onSignOut: () => void
  theme: Theme
  onThemeChange: (t: Theme) => void
  onManageTags: () => void
  onOpenSettings: () => void
  isFreePlan: boolean
  onUpgrade: () => void
  sidebarOpen: boolean
}

export default function Topbar({
  query,
  onQueryChange,
  email,
  uploading,
  syncing,
  onUpload,
  onSignOut,
  theme,
  onThemeChange,
  onManageTags,
  onOpenSettings,
  isFreePlan,
  onUpgrade,
  sidebarOpen,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null)

  return (
    <header className="relative flex items-center border-b border-filr-border bg-filr-surface/40 py-3">
      <a
        href="/"
        className="absolute left-4 z-10 flex shrink-0 items-center gap-3 text-filr-text"
        aria-label="Filr"
      >
        <FilrLogoMark className="h-7 w-auto" />
        <FilrWordmark className="h-5 w-auto" />
      </a>

      {/* Mirrors sidebar + main layout so search aligns with breadcrumb / folder / doc columns */}
      <div className="flex w-full min-w-0 items-center">
        <div
          className="shrink-0 transition-[width] duration-300 ease-out"
          style={{ width: sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_PEEK }}
        />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="relative w-full max-w-md">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-filr-muted" />
              <input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search by title or document text…"
                className={`h-9 w-full rounded-full border border-filr-border bg-filr-bg/60 pl-9 text-sm text-filr-text outline-none transition placeholder:text-filr-muted/60 focus:border-filr-accent ${query ? 'pr-9' : 'pr-3'}`}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => onQueryChange('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-filr-muted transition hover:bg-filr-surface-2 hover:text-filr-text"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onUpload(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="absolute right-4 z-10 flex shrink-0 items-center gap-3">
        {syncing ? (
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-filr-border border-t-filr-accent"
            aria-label="Syncing library"
            role="status"
          />
        ) : null}
        {isFreePlan ? (
          <button
            type="button"
            onClick={onUpgrade}
            className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-medium text-filr-accent transition hover:opacity-90 ${
              theme === 'light' ? 'bg-white' : 'bg-[#1A2632]'
            }`}
          >
            <UpgradeCrownIcon size={20} className="shrink-0" />
            <span className="hidden sm:inline">Upgrade</span>
          </button>
        ) : null}
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-filr-text px-3 py-2 text-sm font-semibold text-filr-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ExportIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{uploading ? 'Uploading…' : 'Upload PDF'}</span>
        </button>

        <ProfileMenu
          email={email}
          theme={theme}
          onThemeChange={onThemeChange}
          onManageTags={onManageTags}
          onOpenSettings={onOpenSettings}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  )
}
