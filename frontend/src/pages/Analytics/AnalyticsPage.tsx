import { useCallback, useState } from 'react'
import { PageHeader, Panel, PanelHeader } from '@/components/ui/Panel'
import { StatRow, StatTile } from '@/components/ui/StatTile'
import { ErrorState, TableSkeleton } from '@/components/ui/States'
import { TimeRangeSelect } from '@/components/ui/TimeRangeSelect'
import { MethodBadge, StatusBadge } from '@/components/ui/Badge'
import { TableWrapper, Td, Th, Tr } from '@/components/tables/DataTable'
import { RequestVolumeChart } from '@/components/charts/RequestVolumeChart'
import { ResponseTimeChart } from '@/components/charts/ResponseTimeChart'
import { StatusDistribution } from '@/components/charts/StatusDistribution'
import { MethodBarChart } from '@/components/charts/MethodBarChart'
import { useAsync } from '@/hooks/useAsync'
import { analyticsApi } from '@/services/api'
import { useCurrentProject } from '@/context/ProjectContext'
import { formatDuration, formatNumber, formatPercent } from '@/utils/format'
import type { TimeRange } from '@/types/api'

/**
 * Project analytics.
 *
 * Everything is aggregated by PostgreSQL over the selected window. The
 * tables below the charts are the accessible twin of the same data, so no
 * value is reachable only by hovering a mark.
 */
export function AnalyticsPage() {
  const project = useCurrentProject()
  const [range, setRange] = useState<TimeRange>('24h')
  const projectId = project?.id ?? ''

  const analytics = useAsync(
    useCallback(
      (signal: AbortSignal) => analyticsApi.get(projectId, range, signal),
      [projectId, range],
    ),
    [projectId, range],
  )

  if (!project) return null

  const data = analytics.data
  const summary = data?.summary
  const loading = analytics.loading

  if (analytics.error) {
    return (
      <>
        <PageHeader title="Analytics" />
        <Panel>
          <ErrorState
            title="Unable to load analytics"
            message={analytics.error.message}
            onRetry={analytics.reload}
          />
        </Panel>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle={`Aggregated request data for ${project.name}`}
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="space-y-4">
        <StatRow>
          <StatTile
            label="Total requests"
            value={formatNumber(summary?.total_requests ?? 0)}
            loading={loading}
          />
          <StatTile
            label="Successful"
            value={formatNumber(summary?.successful_requests ?? 0)}
            detail={formatPercent(summary?.success_rate ?? 0)}
            loading={loading}
          />
          <StatTile
            label="Failed"
            value={formatNumber(summary?.failed_requests ?? 0)}
            detail={formatPercent(summary?.error_rate ?? 0)}
            tone={(summary?.failed_requests ?? 0) > 0 ? 'bad' : 'default'}
            loading={loading}
          />
          <StatTile
            label="Avg response time"
            value={formatDuration(summary?.avg_response_time_ms ?? 0)}
            detail={`p95 ${formatDuration(summary?.p95_response_time_ms ?? 0)}`}
            loading={loading}
          />
        </StatRow>

        <RequestVolumeChart
          data={data?.time_series ?? []}
          range={range}
          loading={loading}
          refreshing={analytics.refreshing}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <ResponseTimeChart
            data={data?.time_series ?? []}
            range={range}
            loading={loading}
            refreshing={analytics.refreshing}
          />
          <StatusDistribution
            breakdown={data?.status_breakdown ?? null}
            loading={loading}
            refreshing={analytics.refreshing}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <MethodBarChart
            data={data?.by_method ?? []}
            loading={loading}
            refreshing={analytics.refreshing}
          />
          <StatusCodeTable rows={data?.by_status_code ?? []} loading={loading} />
        </div>

        <EndpointTable rows={data?.by_endpoint ?? []} loading={loading} />
      </div>
    </>
  )
}

/** Status-code counts. The chart's readable twin. */
function StatusCodeTable({
  rows,
  loading,
}: {
  rows: { status_code: number | null; count: number }[]
  loading: boolean
}) {
  return (
    <Panel>
      <PanelHeader title="Requests by status code" />
      {loading ? (
        <TableSkeleton rows={4} columns={2} />
      ) : rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-[13px] text-ink-3">
          No requests in this time range.
        </p>
      ) : (
        <TableWrapper>
          <thead>
            <tr>
              <Th>Status</Th>
              <Th align="right">Requests</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.status_code ?? 'none'}>
                <Td>
                  <StatusBadge status={row.status_code} showText />
                </Td>
                <Td align="right" className="font-medium text-ink nums">
                  {formatNumber(row.count)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableWrapper>
      )}
    </Panel>
  )
}

/** Per-endpoint aggregates, with every value present as text. */
function EndpointTable({
  rows,
  loading,
}: {
  rows: {
    endpoint_id: string | null
    method: string
    path: string
    request_count: number
    error_count: number
    success_rate: number
    avg_response_time_ms: number
  }[]
  loading: boolean
}) {
  return (
    <Panel>
      <PanelHeader
        title="Requests by endpoint"
        subtitle="The table view of the endpoint chart — every value readable without hovering"
      />
      {loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-[13px] text-ink-3">
          No requests in this time range.
        </p>
      ) : (
        <TableWrapper>
          <thead>
            <tr>
              <Th className="w-20">Method</Th>
              <Th>Path</Th>
              <Th className="w-24" align="right">
                Requests
              </Th>
              <Th className="w-20" align="right">
                Errors
              </Th>
              <Th className="w-28" align="right">
                Success rate
              </Th>
              <Th className="w-28" align="right">
                Avg latency
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.endpoint_id ?? 'ad-hoc'}>
                <Td>
                  <MethodBadge method={row.method} />
                </Td>
                <Td className="max-w-0">
                  <span className="block truncate font-mono text-xs text-ink-2">
                    {row.path}
                  </span>
                </Td>
                <Td align="right" className="text-ink nums">
                  {formatNumber(row.request_count)}
                </Td>
                <Td
                  align="right"
                  className={row.error_count > 0 ? 'text-[#d03b3b] nums' : 'nums'}
                >
                  {formatNumber(row.error_count)}
                </Td>
                <Td align="right" className="nums">
                  {formatPercent(row.success_rate)}
                </Td>
                <Td align="right" className="nums">
                  {formatDuration(row.avg_response_time_ms)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableWrapper>
      )}
    </Panel>
  )
}
