import { useEffect, useRef, useState } from 'react'
import { useProjects } from '@/context/ProjectContext'
import { EnvironmentBadge } from '@/components/ui/Badge'
import { CheckIcon, ChevronDownIcon } from './Icons'
import { cn } from '@/utils/cn'

/**
 * The project switcher in the top bar.
 *
 * Switching re-scopes every project page at once, which is what keeps one
 * project's data from ever appearing inside another.
 */
export function ProjectSelector() {
  const { projects, current, selectProject, loading } = useProjects()
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (loading) {
    return <div className="h-8 w-44 animate-pulse rounded bg-hover" />
  }

  if (projects.length === 0) {
    return <span className="text-[13px] text-ink-3">No projects yet</span>
  }

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex h-8 max-w-[260px] items-center gap-2 rounded border border-line',
          'bg-raised px-2.5 text-[13px] transition-colors hover:border-line-strong hover:bg-hover',
        )}
      >
        <span className="text-ink-3">Project</span>
        <span className="truncate font-medium text-ink">{current?.name ?? 'Select'}</span>
        <ChevronDownIcon className="ml-auto h-3.5 w-3.5 shrink-0 text-ink-3" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 z-40 mt-1 max-h-80 w-72 overflow-y-auto rounded-lg border border-line bg-raised p-1 shadow-2xl animate-fade-in"
        >
          {projects.map((project) => {
            const selected = project.id === current?.id
            return (
              <button
                key={project.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  selectProject(project.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors',
                  selected ? 'bg-accent-soft' : 'hover:bg-hover',
                )}
              >
                <span className="w-4 shrink-0 text-accent">
                  {selected && <CheckIcon className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">
                    {project.name}
                  </span>
                  <span className="block truncate text-xs text-ink-3">
                    {project.endpoint_count} endpoints
                  </span>
                </span>
                <EnvironmentBadge environment={project.environment} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
