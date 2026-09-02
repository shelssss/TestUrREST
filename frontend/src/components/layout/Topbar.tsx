import { ProjectSelector } from './ProjectSelector'
import { MenuIcon, MoonIcon, SunIcon } from './Icons'
import { useTheme } from '@/hooks/useTheme'

/** The top bar: navigation toggle, project selector, theme switch. */
export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, toggle } = useTheme()

  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-4">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded p-1.5 text-ink-2 hover:bg-hover hover:text-ink lg:hidden"
        aria-label="Open navigation"
      >
        <MenuIcon />
      </button>

      <ProjectSelector />

      <div className="ml-auto flex items-center gap-1">
        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="hidden rounded px-2 py-1.5 text-xs text-ink-3 transition-colors hover:bg-hover hover:text-ink sm:block"
        >
          API docs
        </a>
        <button
          type="button"
          onClick={toggle}
          className="rounded p-1.5 text-ink-2 transition-colors hover:bg-hover hover:text-ink"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  )
}
