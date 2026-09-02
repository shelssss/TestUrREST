import { NavLink } from 'react-router-dom'
import { useProjects } from '@/context/ProjectContext'
import { cn } from '@/utils/cn'
import {
  AnalyticsIcon,
  CloseIcon,
  DashboardIcon,
  EndpointsIcon,
  ExplorerIcon,
  LogsIcon,
  OverviewIcon,
  ProjectsIcon,
  SettingsIcon,
} from './Icons'

interface NavItem {
  to: string
  label: string
  icon: (props: { className?: string }) => JSX.Element
  end?: boolean
}

const GLOBAL_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/projects', label: 'Projects', icon: ProjectsIcon },
]

const PROJECT_NAV: NavItem[] = [
  { to: '/project/overview', label: 'Overview', icon: OverviewIcon },
  { to: '/project/endpoints', label: 'Endpoints', icon: EndpointsIcon },
  { to: '/project/explorer', label: 'API Explorer', icon: ExplorerIcon },
  { to: '/project/logs', label: 'Logs', icon: LogsIcon },
  { to: '/project/analytics', label: 'Analytics', icon: AnalyticsIcon },
  { to: '/project/settings', label: 'Settings', icon: SettingsIcon },
]

/**
 * The primary navigation.
 *
 * Two groups: app-level pages, then the pages scoped to whichever project
 * is selected in the top bar. The project group is disabled outright when
 * no project exists, so its links can never lead to an empty page.
 */
export function Sidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { current } = useProjects()

  return (
    <>
      {/* Backdrop only exists on small screens, where the sidebar overlays. */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-line bg-surface',
          'transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-12 items-center gap-2.5 border-b border-line px-4">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-accent">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M2 8h9M8 5l3 3-3 3M13.5 3v10"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-[13px] font-semibold tracking-tight text-ink">
            API Management
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded p-1 text-ink-3 hover:bg-hover hover:text-ink lg:hidden"
            aria-label="Close navigation"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <NavGroup items={GLOBAL_NAV} onNavigate={onClose} />

          <p className="mb-1.5 mt-5 px-2 text-2xs font-medium uppercase tracking-wider text-ink-3">
            {current ? current.name : 'Current project'}
          </p>
          <NavGroup items={PROJECT_NAV} onNavigate={onClose} disabled={!current} />
          {!current && (
            <p className="mt-2 px-2 text-xs leading-relaxed text-ink-3">
              Create a project to unlock these pages.
            </p>
          )}
        </nav>
      </aside>
    </>
  )
}

function NavGroup({
  items,
  onNavigate,
  disabled = false,
}: {
  items: NavItem[]
  onNavigate: () => void
  disabled?: boolean
}) {
  return (
    <ul className="space-y-0.5">
      {items.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          {disabled ? (
            <span className="flex cursor-not-allowed items-center gap-2.5 rounded px-2 py-1.5 text-[13px] text-ink-3 opacity-45">
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </span>
          ) : (
            <NavLink
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded px-2 py-1.5 text-[13px] transition-colors',
                  isActive
                    ? 'bg-accent-soft font-medium text-ink'
                    : 'text-ink-2 hover:bg-hover hover:text-ink',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          )}
        </li>
      ))}
    </ul>
  )
}
