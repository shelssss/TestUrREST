import { useMemo } from 'react'
import { ChartFrame } from './ChartFrame'
import { readChartColors } from './chartTheme'
import type { StatusBreakdown } from '@/types/api'
import { formatNumber, formatPercent } from '@/utils/format'

/**
 * The share of traffic in each HTTP status class.
 *
 * A share strip plus a labelled list, not a donut: one class almost always
 * dominates, and a donut makes the small-but-important slices (the 5xx you
 * actually care about) unreadable. The list carries exact counts, so every
 * value is legible without hovering.
 *
 * Colour follows the domain convention developers already read fluently
 * (2xx green, 3xx blue, 4xx amber, 5xx red, no-response grey). The classes
 * are ordered by severity, which also keeps green and red non-adjacent --
 * the one pair that is genuinely hard to tell apart under deuteranopia.
 * Every row is labelled, so colour is never the only channel.
 */
export function StatusDistribution({
  breakdown,
  loading,
  refreshing,
}: {
  breakdown: StatusBreakdown | null
  loading?: boolean
  refreshing?: boolean
}) {
  const colors = useMemo(readChartColors, [loading, refreshing, breakdown])

  const rows = useMemo(() => {
    if (!breakdown) return []
    return [
      { key: '2xx', label: '2xx Success', count: breakdown.success_2xx, color: colors.s2xx },
      { key: '3xx', label: '3xx Redirect', count: breakdown.redirect_3xx, color: colors.s3xx },
      { key: '4xx', label: '4xx Client error', count: breakdown.client_error_4xx, color: colors.s4xx },
      { key: '5xx', label: '5xx Server error', count: breakdown.server_error_5xx, color: colors.s5xx },
      { key: 'none', label: 'No response', count: breakdown.failed, color: colors.none },
    ]
  }, [breakdown, colors])

  const total = rows.reduce((sum, row) => sum + row.count, 0)
  const visible = rows.filter((row) => row.count > 0)

  return (
    <ChartFrame
      title="Status codes"
      subtitle="Share of responses by class"
      loading={loading}
      refreshing={refreshing}
      isEmpty={total === 0}
      height={200}
    >
      <div className="flex h-full flex-col justify-center gap-4 px-2">
        {/* The share strip. A 2px surface gap separates the segments. */}
        <div className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full">
          {visible.map((row) => (
            <div
              key={row.key}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${(row.count / total) * 100}%`,
                backgroundColor: row.color,
              }}
              title={`${row.label}: ${formatNumber(row.count)}`}
            />
          ))}
        </div>

        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center gap-2.5 text-xs">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: row.color }}
              />
              <span className="text-ink-2">{row.label}</span>
              <span className="ml-auto text-ink-3 nums">{formatNumber(row.count)}</span>
              <span className="w-12 text-right font-medium text-ink nums">
                {total ? formatPercent((row.count / total) * 100) : '0.0%'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  )
}
