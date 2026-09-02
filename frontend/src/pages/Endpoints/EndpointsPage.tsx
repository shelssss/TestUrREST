import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader, Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { MethodBadge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Field'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/States'
import { TableWrapper, Td, Th, Tr } from '@/components/tables/DataTable'
import { EndpointFormModal } from '@/components/endpoints/EndpointFormModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  EditIcon,
  EndpointsIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from '@/components/layout/Icons'
import { useAsync } from '@/hooks/useAsync'
import { endpointsApi } from '@/services/api'
import { useCurrentProject, useProjects } from '@/context/ProjectContext'
import { formatDate } from '@/utils/format'
import type { Endpoint } from '@/types/api'

/** Manage the REST operations registered for the current project. */
export function EndpointsPage() {
  const project = useCurrentProject()
  const { refresh: refreshProjects } = useProjects()
  const navigate = useNavigate()
  const projectId = project?.id ?? ''

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Endpoint | null>(null)
  const [deleting, setDeleting] = useState<Endpoint | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const endpoints = useAsync(
    useCallback(
      (signal: AbortSignal) => endpointsApi.list(projectId, false, signal),
      [projectId],
    ),
    [projectId],
  )

  if (!project) return null

  // Filtering happens in the browser: an endpoint list is small and bounded,
  // unlike logs, which are paginated server-side.
  const term = search.trim().toLowerCase()
  const rows = (endpoints.data ?? []).filter(
    (endpoint) =>
      !term ||
      endpoint.path.toLowerCase().includes(term) ||
      endpoint.method.toLowerCase().includes(term) ||
      (endpoint.description ?? '').toLowerCase().includes(term),
  )

  const toggle = async (endpoint: Endpoint) => {
    setTogglingId(endpoint.id)
    try {
      await endpointsApi.setEnabled(projectId, endpoint.id, !endpoint.enabled)
      endpoints.reload()
    } finally {
      setTogglingId(null)
    }
  }

  const afterChange = () => {
    endpoints.reload()
    void refreshProjects()
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Endpoints"
        subtitle={`REST operations registered in ${project.name}`}
        actions={
          <Button
            variant="primary"
            icon={<PlusIcon className="h-3.5 w-3.5" />}
            onClick={openCreate}
          >
            Add endpoint
          </Button>
        }
      />

      <Panel>
        <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
          <div className="relative w-full max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter endpoints"
              className="pl-8"
            />
          </div>
          <span className="ml-auto text-xs text-ink-3 nums">
            {rows.length} of {endpoints.data?.length ?? 0}
          </span>
        </div>

        {endpoints.loading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : endpoints.error ? (
          <ErrorState
            title="Unable to load endpoints"
            message={endpoints.error.message}
            onRetry={endpoints.reload}
          />
        ) : (endpoints.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<EndpointsIcon className="h-7 w-7" />}
            title="No API endpoints yet"
            description="Register an endpoint to start sending and monitoring requests."
            action={
              <Button
                variant="primary"
                icon={<PlusIcon className="h-3.5 w-3.5" />}
                onClick={openCreate}
              >
                Add your first endpoint
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No matching endpoints"
            description={`Nothing matches "${search}".`}
          />
        ) : (
          <EndpointTable
            rows={rows}
            togglingId={togglingId}
            onOpen={(id) => navigate(`/project/endpoints/${id}`)}
            onToggle={(endpoint) => void toggle(endpoint)}
            onEdit={(endpoint) => {
              setEditing(endpoint)
              setFormOpen(true)
            }}
            onDelete={setDeleting}
          />
        )}
      </Panel>

      <EndpointFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        projectId={projectId}
        projectBaseUrl={project.base_url}
        endpoint={editing}
        onSaved={afterChange}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.method} ${deleting?.path}?`}
        description="The endpoint is removed. Its request logs are kept, so the project's history stays intact."
        onConfirm={async () => {
          if (!deleting) return
          await endpointsApi.remove(projectId, deleting.id)
          afterChange()
        }}
      />
    </>
  )
}

interface TableProps {
  rows: Endpoint[]
  togglingId: string | null
  onOpen: (id: string) => void
  onToggle: (endpoint: Endpoint) => void
  onEdit: (endpoint: Endpoint) => void
  onDelete: (endpoint: Endpoint) => void
}

function EndpointTable({
  rows,
  togglingId,
  onOpen,
  onToggle,
  onEdit,
  onDelete,
}: TableProps) {
  return (
    <TableWrapper>
      <thead>
        <tr>
          <Th className="w-20">Method</Th>
          <Th>Path</Th>
          <Th className="hidden md:table-cell">Target</Th>
          <Th className="w-28">Status</Th>
          <Th className="hidden w-28 lg:table-cell">Created</Th>
          <Th className="w-20" align="right" />
        </tr>
      </thead>
      <tbody>
        {rows.map((endpoint) => (
          <Tr key={endpoint.id} onClick={() => onOpen(endpoint.id)}>
            <Td>
              <MethodBadge method={endpoint.method} />
            </Td>
            <Td className="max-w-0">
              <Link
                to={`/project/endpoints/${endpoint.id}`}
                onClick={(event) => event.stopPropagation()}
                className="block truncate font-mono text-xs font-medium text-ink hover:text-accent"
              >
                {endpoint.path}
              </Link>
              {endpoint.description && (
                <span className="mt-0.5 block truncate text-xs text-ink-3">
                  {endpoint.description}
                </span>
              )}
            </Td>
            <Td className="hidden max-w-0 md:table-cell">
              <span
                className="block truncate font-mono text-xs text-ink-3"
                title={endpoint.target_url}
              >
                {endpoint.target_url}
              </span>
            </Td>
            <Td>
              <button
                type="button"
                disabled={togglingId === endpoint.id}
                onClick={(event) => {
                  event.stopPropagation()
                  onToggle(endpoint)
                }}
                className="inline-flex items-center gap-1.5 text-xs transition-opacity disabled:opacity-50"
                title={endpoint.enabled ? 'Disable endpoint' : 'Enable endpoint'}
              >
                <span
                  aria-hidden="true"
                  className={
                    'h-1.5 w-1.5 rounded-full ' +
                    (endpoint.enabled ? 'bg-[#0ca30c]' : 'bg-ink-3')
                  }
                />
                <span className={endpoint.enabled ? 'text-ink-2' : 'text-ink-3'}>
                  {endpoint.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </button>
            </Td>
            <Td className="hidden text-xs text-ink-3 lg:table-cell">
              {formatDate(endpoint.created_at)}
            </Td>
            <Td align="right">
              <div
                className="flex items-center justify-end gap-0.5"
                onClick={(event) => event.stopPropagation()}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Edit ${endpoint.method} ${endpoint.path}`}
                  icon={<EditIcon className="h-3.5 w-3.5" />}
                  onClick={() => onEdit(endpoint)}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-ink-3 hover:text-[#d03b3b]"
                  aria-label={`Delete ${endpoint.method} ${endpoint.path}`}
                  icon={<TrashIcon className="h-3.5 w-3.5" />}
                  onClick={() => onDelete(endpoint)}
                />
              </div>
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableWrapper>
  )
}
