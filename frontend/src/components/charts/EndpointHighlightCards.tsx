import { Link } from 'react-router-dom'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { MethodBadge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/States'
import type { EndpointHighlights, EndpointUsage } from '@/types/api'
import { formatDuration, formatNumber, formatPercent } from '@/utils/format'

/**
 * The "most X" endpoint callouts.
 *
 * Each is a single fact about one endpoint, so each is a labelled row
 * rather than a chart. A row reads "Not enough data" when the project has
 * no traffic to rank, instead of showing a misleading zero.
 */
export function EndpointHighlightCards({
  highlights,
  loading,
}: {
  highlights: EndpointHighlights | null
  loading?: boolean
}) {
  const rows: { label: string; usage: EndpointUsage | null; value: string }[] = [
    {
      label: 'Most used',
      usage: highlights?.most_used ?? null,
      value: highlights?.most_used
        ? `${formatNumber(highlights.most_used.request_count)} requests`
        : '',
    },
    {
      label: 'Slowest',
      usage: highlights?.slowest ?? null,
      value: highlights?.slowest
        ? formatDuration(highlights.slowest.avg_response_time_ms)
        : '',
    },
    {
      label: 'Most successful',
      usage: highlights?.most_successful ?? null,
      value: highlights?.most_successful
        ? formatPercent(highlights.most_successful.success_rate)
        : '',
    },
    {
      label: 'Most errors',
      usage: highlights?.most_errors ?? null,
      value: highlights?.most_errors
        ? `${formatNumber(highlights.most_errors.error_count)} errors`
        : '',
    },
  ]

  return (
    <Panel>
      <PanelHeader
        title="Endpoint highlights"
        subtitle={
          highlights
            ? `${highlights.enabled_endpoints} of ${highlights.total_endpoints} endpoints enabled`
            : undefined
        }
      />
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-28 shrink-0 text-xs text-ink-3">{row.label}</span>
            {loading ? (
              <Skeleton className="h-3.5 flex-1" />
            ) : row.usage ? (
              <>
                <MethodBadge method={row.usage.method} />
                {row.usage.endpoint_id ? (
                  <Link
                    to={`/project/endpoints/${row.usage.endpoint_id}`}
                    className="min-w-0 flex-1 truncate font-mono text-xs text-ink-2 hover:text-accent"
                    title={row.usage.path}
                  >
                    {row.usage.path}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-3">
                    {row.usage.path}
                  </span>
                )}
                <span className="shrink-0 text-xs font-medium text-ink nums">
                  {row.value}
                </span>
              </>
            ) : (
              <span className="text-xs text-ink-3">Not enough data</span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  )
}
