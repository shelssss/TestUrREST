import { useNavigate } from 'react-router-dom'
import { PageHeader, Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EnvironmentBadge } from '@/components/ui/Badge'
import { StatRow, StatTile } from '@/components/ui/StatTile'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { TableWrapper, Td, Th, Tr } from '@/components/tables/DataTable'
import { PlusIcon, ProjectsIcon } from '@/components/layout/Icons'
import { useProjects } from '@/context/ProjectContext'
import { formatDate, formatNumber } from '@/utils/format'
import { useState } from 'react'
import { ProjectFormModal } from '@/components/projects/ProjectFormModal'

/**
 * The landing page: every project at a glance.
 *
 * Deliberately not a copy of the per-project dashboard. It answers "what do
 * I have and where should I go", so it counts projects and endpoints rather
 * than aggregating traffic across environments that should not be mixed --
 * summing production and development requests into one number would be a
 * statistic nobody could act on.
 */
export function DashboardPage() {
  const { projects, loading, error, refresh, selectProject } = useProjects()
  const navigate = useNavigate()
  const [formOpen, setFormOpen] = useState(false)

  const open = (projectId: string) => {
    selectProject(projectId)
    navigate('/project/overview')
  }

  const totalEndpoints = projects.reduce((sum, p) => sum + p.endpoint_count, 0)
  const totalRequests = projects.reduce((sum, p) => sum + p.request_count, 0)
  const productionCount = projects.filter((p) => p.environment === 'production').length

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <Panel>
          <ErrorState
            title="Unable to load projects"
            message={error.message}
            onRetry={() => void refresh()}
          />
        </Panel>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Every API environment you are managing"
        actions={
          <Button
            variant="primary"
            icon={<PlusIcon className="h-3.5 w-3.5" />}
            onClick={() => setFormOpen(true)}
          >
            New project
          </Button>
        }
      />

      {!loading && projects.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<ProjectsIcon className="h-7 w-7" />}
            title="No projects yet"
            description="A project is an isolated API environment. Create one to register endpoints, send requests, and start collecting logs."
            action={
              <Button
                variant="primary"
                icon={<PlusIcon className="h-3.5 w-3.5" />}
                onClick={() => setFormOpen(true)}
              >
                Create your first project
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="space-y-4">
          <StatRow>
            <StatTile
              label="Projects"
              value={formatNumber(projects.length)}
              detail={`${productionCount} in production`}
              loading={loading}
            />
            <StatTile
              label="Endpoints"
              value={formatNumber(totalEndpoints)}
              detail="Registered across all projects"
              loading={loading}
            />
            <StatTile
              label="Logged requests"
              value={formatNumber(totalRequests)}
              detail="All time"
              loading={loading}
            />
            <StatTile
              label="Environments"
              value={formatNumber(new Set(projects.map((p) => p.environment)).size)}
              detail="Development, staging, production"
              loading={loading}
            />
          </StatRow>

          <Panel>
            <PanelHeader
              title="Projects"
              subtitle="Select a project to open its dashboard"
            />
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-full" />
                ))}
              </div>
            ) : (
              <TableWrapper>
                <thead>
                  <tr>
                    <Th>Project</Th>
                    <Th className="w-32">Environment</Th>
                    <Th className="hidden md:table-cell">Base URL</Th>
                    <Th className="w-24" align="right">
                      Endpoints
                    </Th>
                    <Th className="w-24" align="right">
                      Requests
                    </Th>
                    <Th className="hidden w-28 lg:table-cell">Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <Tr key={project.id} onClick={() => open(project.id)}>
                      <Td className="max-w-0">
                        <span className="block truncate font-medium text-ink">
                          {project.name}
                        </span>
                        {project.description && (
                          <span className="mt-0.5 block truncate text-xs text-ink-3">
                            {project.description}
                          </span>
                        )}
                      </Td>
                      <Td>
                        <EnvironmentBadge environment={project.environment} />
                      </Td>
                      <Td className="hidden max-w-0 md:table-cell">
                        <span
                          className="block truncate font-mono text-xs text-ink-3"
                          title={project.base_url ?? undefined}
                        >
                          {project.base_url ?? '—'}
                        </span>
                      </Td>
                      <Td align="right" className="text-ink nums">
                        {formatNumber(project.endpoint_count)}
                      </Td>
                      <Td align="right" className="text-ink nums">
                        {formatNumber(project.request_count)}
                      </Td>
                      <Td className="hidden text-xs text-ink-3 lg:table-cell">
                        {formatDate(project.created_at)}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrapper>
            )}
          </Panel>
        </div>
      )}

      <ProjectFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => void refresh()}
      />
    </>
  )
}
