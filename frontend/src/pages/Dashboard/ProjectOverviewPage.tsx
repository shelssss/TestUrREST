import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EnvironmentBadge } from '@/components/ui/Badge'
import { StatRow, StatTile } from '@/components/ui/StatTile'
import { ErrorState } from '@/components/ui/States'
import { TimeRangeSelect } from '@/components/ui/TimeRangeSelect'
import { RequestVolumeChart } from '@/components/charts/RequestVolumeChart'
import { ResponseTimeChart } from '@/components/charts/ResponseTimeChart'
import { StatusDistribution } from '@/components/charts/StatusDistribution'
import { EndpointBarChart } from '@/components/charts/EndpointBarChart'
import { EndpointHighlightCards } from '@/components/charts/EndpointHighlightCards'
import { RecentRequests } from '@/components/logs/RecentRequests'
import { ExplorerIcon, RefreshIcon } from '@/components/layout/Icons'
import { useAsync } from '@/hooks/useAsync'
import { analyticsApi, logsApi } from '@/services/api'
import { useCurrentProject } from '@/context/ProjectContext'
import { formatDuration, formatNumber, formatPercent } from '@/utils/format'
import type { TimeRange } from '@/types/api'

/**
 * A project's dashboard.
 *
 * Information runs top to bottom in the order the reader needs it:
 * headline numbers, volume over time, the status and endpoint split, then
 * the raw activity feed. One time-range control at the top scopes all of
 * it, so no two panels are ever showing different windows.
 */
export function ProjectOverviewPage() {
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

  const recent = useAsync(
    useCallback((signal: AbortSignal) => logsApi.recent(projectId, 8, signal), [projectId]),
    [projectId],
  )

  if (!project) return null

  const summary = analytics.data?.summary
  const loading = analytics.loading

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            {project.name}
            <EnvironmentBadge environment={project.environment} />
          </span>
        }
        subtitle={project.base_url ?? 'No base URL configured'}
        actions={
          <>
            <TimeRangeSelect value={range} onChange={setRange} />
            <Button
              icon={<RefreshIcon className="h-3.5 w-3.5" />}
              onClick={() => {
                analytics.reload()
                recent.reload()
              }}
              loading={analytics.refreshing}
              aria-label="Refresh"
            />
            <Link to="/project/explorer">
              <Button variant="primary" icon={<ExplorerIcon className="h-3.5 w-3.5" />}>
                API Explorer
              </Button>
            </Link>
          </>
        }
      />

      {analytics.error ? (
        <div className="panel">
          <ErrorState
            title="Unable to load dashboard"
            message={analytics.error.message}
            onRetry={analytics.reload}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <StatRow>
            <StatTile
              label="Total requests"
              value={formatNumber(summary?.total_requests ?? 0)}
              detail={`${formatNumber(summary?.successful_requests ?? 0)} successful`}
              loading={loading}
            />
            <StatTile
              label="Success rate"
              value={formatPercent(summary?.success_rate ?? 0)}
              detail="2xx and 3xx responses"
              tone={successTone(summary?.success_rate, summary?.total_requests)}
              loading={loading}
            />
            <StatTile
              label="Avg latency"
              value={formatDuration(summary?.avg_response_time_ms ?? 0)}
              detail={`p95 ${formatDuration(summary?.p95_response_time_ms ?? 0)}`}
              loading={loading}
            />
            <StatTile
              label="Errors"
              value={formatNumber(summary?.failed_requests ?? 0)}
              detail={`${formatPercent(summary?.error_rate ?? 0)} error rate`}
              tone={(summary?.failed_requests ?? 0) > 0 ? 'bad' : 'default'}
              loading={loading}
            />
          </StatRow>

          <RequestVolumeChart
            data={analytics.data?.time_series ?? []}
            range={range}
            loading={loading}
            refreshing={analytics.refreshing}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <StatusDistribution
              breakdown={analytics.data?.status_breakdown ?? null}
              loading={loading}
              refreshing={analytics.refreshing}
            />
            <EndpointBarChart
              data={analytics.data?.by_endpoint ?? []}
              loading={loading}
              refreshing={analytics.refreshing}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ResponseTimeChart
              data={analytics.data?.time_series ?? []}
              range={range}
              loading={loading}
              refreshing={analytics.refreshing}
            />
            <EndpointHighlightCards
              highlights={analytics.data?.endpoints ?? null}
              loading={loading}
            />
          </div>

          <RecentRequests logs={recent.data ?? []} loading={recent.loading} />
        </div>
      )}
    </>
  )
}

/** Colour the success-rate tile only once there is traffic to judge. */
function successTone(
  rate: number | undefined,
  total: number | undefined,
): 'default' | 'good' | 'warn' | 'bad' {
  if (rate === undefined || !total) return 'default'
  if (rate >= 99) return 'good'
  if (rate >= 95) return 'warn'
  return 'bad'
}
