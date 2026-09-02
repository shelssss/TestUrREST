import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { PlusIcon, ProjectsIcon } from '@/components/layout/Icons'
import { useProjects } from '@/context/ProjectContext'

/**
 * Gate for the project-scoped pages.
 *
 * Every page under /project assumes a selected project exists. Rather than
 * each one guarding for null and rendering its own half-broken shell, the
 * three states -- loading, no projects, load failed -- are handled once
 * here, so the pages below can rely on having a project.
 */
export function RequireProject({ children }: { children: ReactNode }) {
  const { current, loading, error, refresh } = useProjects()

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-56" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[86px]" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error) {
    return (
      <Panel>
        <ErrorState
          title="Unable to load projects"
          message={error.message}
          onRetry={() => void refresh()}
        />
      </Panel>
    )
  }

  if (!current) {
    return (
      <Panel>
        <EmptyState
          icon={<ProjectsIcon className="h-7 w-7" />}
          title="No project selected"
          description="Create a project to register endpoints, send requests, and collect logs."
          action={
            <Link to="/projects">
              <Button variant="primary" icon={<PlusIcon className="h-3.5 w-3.5" />}>
                Go to projects
              </Button>
            </Link>
          }
        />
      </Panel>
    )
  }

  return <>{children}</>
}
