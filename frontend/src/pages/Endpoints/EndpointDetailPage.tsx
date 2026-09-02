import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader, Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Chip, MethodBadge, StatusBadge } from '@/components/ui/Badge'
import { StatRow, StatTile } from '@/components/ui/StatTile'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { TableWrapper, Td, Th, Tr } from '@/components/tables/DataTable'
import { TimeRangeSelect } from '@/components/ui/TimeRangeSelect'
import { RequestVolumeChart } from '@/components/charts/RequestVolumeChart'
import { ResponseTimeChart } from '@/components/charts/ResponseTimeChart'
import { EndpointFormModal } from '@/components/endpoints/EndpointFormModal'
import { ArrowLeftIcon, EditIcon, ExplorerIcon } from '@/components/layout/Icons'
import { useAsync } from '@/hooks/useAsync'
import { endpointsApi } from '@/services/api'
import { useCurrentProject } from '@/context/ProjectContext'
import {
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPercent,
  formatRelative,
} from '@/utils/format'
import { statusStyle } from '@/utils/http'
import type { TimeRange } from '@/types/api'

/** One endpoint's configuration, statistics, charts, and recent traffic. */
export function EndpointDetailPage() {
  const project = useCurrentProject()
  const { endpointId = '' } = useParams()
  const navigate = useNavigate()
  const [range, setRange] = useState<TimeRange>('24h')
  const [editOpen, setEditOpen] = useState(false)
  const projectId = project?.id ?? ''

  const endpoint = useAsync(
    useCallback(
      (signal: AbortSignal) => endpointsApi.get(projectId, endpointId, signal),
      [projectId, endpointId],
    ),
    [projectId, endpointId],
  )

  const series = useAsync(
    useCallback(
      (signal: AbortSignal) =>
        endpointsApi.timeSeries(projectId, endpointId, range, signal),
      [projectId, endpointId, range],
    ),
    [projectId, endpointId, range],
  )

  const statuses = useAsync(
    useCallback(
      (signal: AbortSignal) =>
        endpointsApi.statusDistribution(projectId, endpointId, signal),
      [projectId, endpointId],
    ),
    [projectId, endpointId],
  )

  const logs = useAsync(
    useCallback(
      (signal: AbortSignal) => endpointsApi.logs(projectId, endpointId, 15, signal),
      [projectId, endpointId],
    ),
    [projectId, endpointId],
  )

  if (!project) return null

  if (endpoint.error) {
    return (
      <Panel>
        <ErrorState
          title={endpoint.error.isNotFound ? 'Endpoint not found' : 'Unable to load endpoint'}
          message={
            endpoint.error.isNotFound
              ? 'It may have been deleted, or it belongs to another project.'
              : endpoint.error.message
          }
          onRetry={endpoint.error.isNotFound ? undefined : endpoint.reload}
        />
        <div className="flex justify-center pb-8">
          <Link to="/project/endpoints">
            <Button icon={<ArrowLeftIcon className="h-3.5 w-3.5" />}>
              Back to endpoints
            </Button>
          </Link>
        </div>
      </Panel>
    )
  }

  const data = endpoint.data
  const stats = data?.stats

  return (
    <>
      <div className="mb-3">
        <Link
          to="/project/endpoints"
          className="inline-flex items-center gap-1.5 text-xs text-ink-3 transition-colors hover:text-ink-2"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Endpoints
        </Link>
      </div>

      <PageHeader
        title={
          endpoint.loading || !data ? (
            <Skeleton className="h-6 w-64" />
          ) : (
            <span className="flex flex-wrap items-center gap-2.5">
              <MethodBadge method={data.method} />
              <span className="font-mono text-base">{data.path}</span>
              {!data.enabled && <Chip tone="bad">Disabled</Chip>}
            </span>
          )
        }
        subtitle={data?.description ?? undefined}
        actions={
          <>
            <TimeRangeSelect value={range} onChange={setRange} />
            <Button
              icon={<EditIcon className="h-3.5 w-3.5" />}
              onClick={() => setEditOpen(true)}
              disabled={!data}
            >
              Edit
            </Button>
            <Button
              variant="primary"
              icon={<ExplorerIcon className="h-3.5 w-3.5" />}
              disabled={!data}
              onClick={() => navigate(`/project/explorer?endpoint=${endpointId}`)}
            >
              Test endpoint
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        <Panel className="px-4 py-3">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Target URL" mono value={data?.target_url} loading={endpoint.loading} />
            <Detail
              label="Status"
              value={data ? (data.enabled ? 'Enabled' : 'Disabled') : undefined}
              loading={endpoint.loading}
            />
            <Detail
              label="Created"
              value={data ? formatDateTime(data.created_at) : undefined}
              loading={endpoint.loading}
            />
            <Detail
              label="Last request"
              value={
                stats?.last_request_at
                  ? formatRelative(stats.last_request_at)
                  : stats
                    ? 'Never'
                    : undefined
              }
              loading={endpoint.loading}
            />
          </dl>
        </Panel>

        <StatRow>
          <StatTile
            label="Total requests"
            value={formatNumber(stats?.total_requests ?? 0)}
            detail={`${formatNumber(stats?.successful_requests ?? 0)} successful, ${formatNumber(
              stats?.failed_requests ?? 0,
            )} failed`}
            loading={endpoint.loading}
          />
          <StatTile
            label="Success rate"
            value={formatPercent(stats?.success_rate ?? 0)}
            detail={`${formatPercent(stats?.error_rate ?? 0)} error rate`}
            loading={endpoint.loading}
          />
          <StatTile
            label="Avg response"
            value={formatDuration(stats?.avg_response_time_ms ?? 0)}
            detail="Across all requests"
            loading={endpoint.loading}
          />
          <StatTile
            label="Fastest / slowest"
            value={formatDuration(stats?.min_response_time_ms ?? 0)}
            detail={`Slowest ${formatDuration(stats?.max_response_time_ms ?? 0)}`}
            loading={endpoint.loading}
          />
        </StatRow>

        <RequestVolumeChart
          data={series.data ?? []}
          range={range}
          loading={series.loading}
          refreshing={series.refreshing}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <ResponseTimeChart
            data={series.data ?? []}
            range={range}
            loading={series.loading}
            refreshing={series.refreshing}
          />
          <StatusCodePanel
            rows={statuses.data ?? []}
            loading={statuses.loading}
          />
        </div>

        <Panel>
          <PanelHeader title="Recent requests" subtitle="The latest calls to this endpoint" />
          {logs.loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-4 w-full" />
              ))}
            </div>
          ) : (logs.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="No requests yet"
              description="Send this endpoint from the API Explorer to see its traffic here."
            />
          ) : (
            <TableWrapper>
              <thead>
                <tr>
                  <Th className="w-44">Time</Th>
                  <Th className="w-24">Status</Th>
                  <Th>Request ID</Th>
                  <Th className="w-28" align="right">
                    Duration
                  </Th>
                </tr>
              </thead>
              <tbody>
                {(logs.data ?? []).map((log) => (
                  <Tr key={log.id}>
                    <Td className="text-ink-3 nums">{formatDateTime(log.created_at)}</Td>
                    <Td>
                      <StatusBadge status={log.status_code} />
                    </Td>
                    <Td>
                      <Link
                        to={`/project/logs/${log.request_id}`}
                        className="font-mono text-xs text-ink-2 hover:text-accent"
                      >
                        {log.request_id}
                      </Link>
                    </Td>
                    <Td align="right" className="text-ink-2 nums">
                      {formatDuration(log.response_time_ms)}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableWrapper>
          )}
        </Panel>
      </div>

      <EndpointFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        projectId={projectId}
        projectBaseUrl={project.base_url}
        endpoint={data ?? null}
        onSaved={() => {
          endpoint.reload()
          logs.reload()
        }}
      />
    </>
  )
}

function Detail({
  label,
  value,
  mono,
  loading,
}: {
  label: string
  value?: string | undefined
  mono?: boolean
  loading?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd
        className={
          'mt-1 truncate text-[13px] text-ink ' + (mono ? 'font-mono text-xs' : '')
        }
        title={value}
      >
        {loading ? <Skeleton className="h-3.5 w-32" /> : (value ?? '—')}
      </dd>
    </div>
  )
}

/**
 * Status-code counts for this endpoint.
 *
 * A labelled list rather than a pie: the counts are the point, and a
 * two-or-three-slice pie would say less in more space.
 */
function StatusCodePanel({
  rows,
  loading,
}: {
  rows: { status_code: number | null; count: number }[]
  loading?: boolean
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0)

  return (
    <Panel>
      <PanelHeader title="Status codes" subtitle="Distribution across all requests" />
      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No data yet" description="No requests have been recorded." />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li
              key={row.status_code ?? 'none'}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <StatusBadge status={row.status_code} showText />
              {/* A proportion bar in the status's own tone; the count beside
                  it carries the value, so the bar is support, not the source. */}
              <div className="ml-auto flex w-40 items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hover">
                  <div
                    className={'h-full rounded-full ' + statusStyle(row.status_code)}
                    style={{
                      width: `${total ? (row.count / total) * 100 : 0}%`,
                      backgroundColor: 'currentColor',
                    }}
                  />
                </div>
                <span className="w-16 text-right text-xs font-medium text-ink nums">
                  {formatNumber(row.count)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
