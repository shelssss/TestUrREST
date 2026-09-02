import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EnvironmentBadge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { ProjectFormModal } from '@/components/projects/ProjectFormModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EditIcon, PlusIcon, ProjectsIcon, TrashIcon } from '@/components/layout/Icons'
import { useProjects } from '@/context/ProjectContext'
import { projectsApi } from '@/services/api'
import { formatDate, formatNumber } from '@/utils/format'
import type { ProjectSummary } from '@/types/api'

/** The project list: create, inspect, edit, and delete projects. */
export function ProjectsPage() {
  const { projects, loading, error, refresh, selectProject } = useProjects()
  const navigate = useNavigate()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectSummary | null>(null)
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null)

  const openProject = (project: ProjectSummary) => {
    selectProject(project.id)
    navigate('/project/overview')
  }

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Each project is an isolated API environment with its own endpoints, logs, and analytics."
        actions={
          <Button
            variant="primary"
            icon={<PlusIcon className="h-3.5 w-3.5" />}
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            New project
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="panel space-y-3 p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="panel">
          <ErrorState
            title="Unable to load projects"
            message={error.message}
            onRetry={() => void refresh()}
          />
        </div>
      ) : projects.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<ProjectsIcon className="h-7 w-7" />}
            title="No projects yet"
            description="Create your first project to start registering endpoints and monitoring requests."
            action={
              <Button
                variant="primary"
                icon={<PlusIcon className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                Create a project
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => openProject(project)}
              onEdit={() => {
                setEditing(project)
                setFormOpen(true)
              }}
              onDelete={() => setDeleting(project)}
            />
          ))}
        </div>
      )}

      <ProjectFormModal
        open={formOpen}
        project={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => void refresh()}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="This permanently removes the project along with all of its endpoints and request logs."
        onConfirm={async () => {
          if (!deleting) return
          await projectsApi.remove(deleting.id)
          await refresh()
        }}
      />
    </>
  )
}

function ProjectCard({
  project,
  onOpen,
  onEdit,
  onDelete,
}: {
  project: ProjectSummary
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="panel group flex flex-col p-4 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 text-left"
          title={`Open ${project.name}`}
        >
          <h2 className="truncate text-sm font-semibold text-ink hover:text-accent">
            {project.name}
          </h2>
        </button>
        <EnvironmentBadge environment={project.environment} />
      </div>

      <p className="mt-1.5 line-clamp-2 min-h-[2.4em] text-xs leading-relaxed text-ink-3">
        {project.description || 'No description'}
      </p>

      {project.base_url && (
        <p className="mt-2 truncate font-mono text-[11px] text-ink-3" title={project.base_url}>
          {project.base_url}
        </p>
      )}

      <dl className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-xs">
        <div>
          <dt className="text-ink-3">Endpoints</dt>
          <dd className="mt-0.5 font-medium text-ink nums">
            {formatNumber(project.endpoint_count)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-3">Requests</dt>
          <dd className="mt-0.5 font-medium text-ink nums">
            {formatNumber(project.request_count)}
          </dd>
        </div>
        <div className="ml-auto text-right">
          <dt className="text-ink-3">Created</dt>
          <dd className="mt-0.5 text-ink-2">{formatDate(project.created_at)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center gap-1.5">
        <Button size="sm" variant="primary" onClick={onOpen}>
          Open
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onEdit}
          icon={<EditIcon className="h-3.5 w-3.5" />}
          aria-label={`Edit ${project.name}`}
        >
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-ink-3 hover:text-[#d03b3b]"
          onClick={onDelete}
          icon={<TrashIcon className="h-3.5 w-3.5" />}
          aria-label={`Delete ${project.name}`}
        />
      </div>
    </div>
  )
}
