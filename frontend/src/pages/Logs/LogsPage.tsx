import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader, Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { MethodBadge, StatusBadge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/States'
import { TableWrapper, Td, Th, Tr } from '@/components/tables/DataTable'
import { Pagination } from '@/components/tables/Pagination'
import { shortPath } from '@/components/logs/RecentRequests'
import { LogsIcon, RefreshIcon, SearchIcon } from '@/components/layout/Icons'
import { useAsync } from '@/hooks/useAsync'
import { useDebounced } from '@/hooks/useDebounced'
import { endpointsApi, logsApi } from '@/services/api'
import { useCurrentProject } from '@/context/ProjectContext'
import { formatDateTime, formatDuration } from '@/utils/format'
import {
  HTTP_METHODS,
  STATUS_CATEGORIES,
  type StatusCategory,
} from '@/types/api'

interface Filters {
  search: string
  method: string
  statusCategory: StatusCategory
  endpointId: string
  minResponseTime: string
  startDate: string
}

const NO_FILTERS: Filters = {
  search: '',
  method: '',
  statusCategory: 'all',
  endpointId: '',
  minResponseTime: '',
  startDate: '',
}

/**
 * The request log.
 *
 * Filtering and paging are both done by the backend: the browser holds one
 * page at a time, so the table stays responsive whether the project has a
 * hundred requests or a million.
 */
export function LogsPage() {
  const project = useCurrentProject()
  const projectId = project?.id ?? ''
  const navigate = useNavigate()

  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const debouncedSearch = useDebounced(filters.search, 300)

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1)
  }, [
    debouncedSearch,
    filters.method,
    filters.statusCategory,
    filters.endpointId,
    filters.minResponseTime,
    filters.startDate,
    limit,
  ])

  const endpoints = useAsync(
    useCallback(
      (signal: AbortSignal) => endpointsApi.list(projectId, false, signal),
      [projectId],
    ),
    [projectId],
  )

  const logs = useAsync(
    useCallback(
      (signal: AbortSignal) =>
        logsApi.list(
          projectId,
          {
            page,
            limit,
            search: debouncedSearch.trim() || undefined,
            method: filters.method || undefined,
            status_category: filters.statusCategory,
            endpoint_id: filters.endpointId || undefined,
            min_response_time_ms: filters.minResponseTime
              ? Number(filters.minResponseTime)
              : undefined,
            start_date: filters.startDate
              ? new Date(filters.startDate).toISOString()
              : undefined,
          },
          signal,
        ),
      [
        projectId,
        page,
        limit,
        debouncedSearch,
        filters.method,
        filters.statusCategory,
        filters.endpointId,
        filters.minResponseTime,
        filters.startDate,
      ],
    ),
    [
      projectId,
      page,
      limit,
      debouncedSearch,
      filters.method,
      filters.statusCategory,
      filters.endpointId,
      filters.minResponseTime,
      filters.startDate,
    ],
  )

  if (!project) return null

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }))

  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS)
  const items = logs.data?.items ?? []

  return (
    <>
      <PageHeader
        title="Logs"
        subtitle={`Every request sent through ${project.name}`}
        actions={
          <Button
            icon={<RefreshIcon className="h-3.5 w-3.5" />}
            onClick={logs.reload}
            loading={logs.refreshing}
          >
            Refresh
          </Button>
        }
      />

      <Panel>
        {/* One filter row above the table; everything below re-queries. */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <Input
              value={filters.search}
              onChange={(event) => update('search', event.target.value)}
              placeholder="Search URL or request ID"
              className="pl-8"
            />
          </div>

          <div className="inline-flex rounded border border-line bg-raised p-0.5">
            {STATUS_CATEGORIES.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => update('statusCategory', category.value)}
                aria-pressed={filters.statusCategory === category.value}
                className={
                  'rounded px-2 py-1 text-xs font-medium transition-colors ' +
                  (filters.statusCategory === category.value
                    ? 'bg-accent-soft text-ink'
                    : 'text-ink-3 hover:text-ink-2')
                }
              >
                {category.label}
              </button>
            ))}
          </div>

          <Select
            value={filters.method}
            onChange={(event) => update('method', event.target.value)}
            className="w-auto min-w-[110px]"
            aria-label="Filter by method"
          >
            <option value="">All methods</option>
            {HTTP_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </Select>

          <Select
            value={filters.endpointId}
            onChange={(event) => update('endpointId', event.target.value)}
            className="w-auto min-w-[150px] max-w-[240px]"
            aria-label="Filter by endpoint"
          >
            <option value="">All endpoints</option>
            {(endpoints.data ?? []).map((endpoint) => (
              <option key={endpoint.id} value={endpoint.id}>
                {endpoint.method} {endpoint.path}
              </option>
            ))}
          </Select>

          <Input
            type="number"
            min={0}
            value={filters.minResponseTime}
            onChange={(event) => update('minResponseTime', event.target.value)}
            placeholder="Min ms"
            className="w-[92px]"
            aria-label="Minimum response time in milliseconds"
          />

          <Input
            type="datetime-local"
            value={filters.startDate}
            onChange={(event) => update('startDate', event.target.value)}
            className="w-[190px]"
            aria-label="From date"
          />

          {filtered && (
            <Button size="sm" variant="ghost" onClick={() => setFilters(NO_FILTERS)}>
              Clear
            </Button>
          )}
        </div>

        {logs.loading ? (
          <TableSkeleton rows={10} columns={6} />
        ) : logs.error ? (
          <ErrorState
            title="Unable to load API logs"
            message={logs.error.message}
            onRetry={logs.reload}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<LogsIcon className="h-7 w-7" />}
            title={filtered ? 'No logs match these filters' : 'No requests logged yet'}
            description={
              filtered
                ? 'Try widening the time range or clearing a filter.'
                : 'Send a request from the API Explorer and it will be recorded here.'
            }
            action={
              filtered ? (
                <Button onClick={() => setFilters(NO_FILTERS)}>Clear filters</Button>
              ) : (
                <Link to="/project/explorer">
                  <Button variant="primary">Open API Explorer</Button>
                </Link>
              )
            }
          />
        ) : (
          <div className={logs.refreshing ? 'opacity-60 transition-opacity' : undefined}>
            <TableWrapper>
              <thead>
                <tr>
                  <Th className="w-44">Time</Th>
                  <Th className="w-20">Method</Th>
                  <Th>Endpoint</Th>
                  <Th className="w-20">Status</Th>
                  <Th className="w-24" align="right">
                    Duration
                  </Th>
                  <Th className="hidden w-36 lg:table-cell">Request ID</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((log) => (
                  <Tr
                    key={log.id}
                    onClick={() => navigate(`/project/logs/${log.request_id}`)}
                  >
                    <Td className="text-ink-3 nums">{formatDateTime(log.created_at)}</Td>
                    <Td>
                      <MethodBadge method={log.method} />
                    </Td>
                    <Td className="max-w-0">
                      <span
                        className="block truncate font-mono text-xs text-ink-2"
                        title={log.url}
                      >
                        {shortPath(log.url)}
                      </span>
                      {log.error_message && (
                        <span className="mt-0.5 block truncate text-xs text-[#d03b3b]">
                          {log.error_message}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={log.status_code} />
                    </Td>
                    <Td align="right" className="text-ink-2 nums">
                      {formatDuration(log.response_time_ms)}
                    </Td>
                    <Td className="hidden font-mono text-xs text-ink-3 lg:table-cell">
                      {log.request_id}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableWrapper>

            <Pagination
              page={logs.data?.page ?? 1}
              pages={logs.data?.pages ?? 1}
              total={logs.data?.total ?? 0}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          </div>
        )}
      </Panel>
    </>
  )
}
