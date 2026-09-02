import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartFrame } from './ChartFrame'
import { TooltipCard } from './ChartTooltip'
import { AXIS_PROPS, MAX_BAR_SIZE, readChartColors } from './chartTheme'
import type { EndpointUsage } from '@/types/api'
import { formatCompact, formatDuration, formatNumber, formatPercent } from '@/utils/format'

/**
 * Requests per endpoint.
 *
 * Horizontal because endpoint paths are long strings that would collide as
 * rotated column labels. One series means one colour for every bar -- a
 * darker-where-bigger ramp would re-encode bar length as hue and say
 * nothing the length does not already say.
 */
export function EndpointBarChart({
  data,
  loading,
  refreshing,
  limit = 6,
}: {
  data: EndpointUsage[]
  loading?: boolean
  refreshing?: boolean
  limit?: number
}) {
  const colors = useMemo(readChartColors, [loading, refreshing, data])

  const rows = useMemo(
    () =>
      data
        .filter((row) => row.request_count > 0)
        .slice(0, limit)
        .map((row) => ({ ...row, label: `${row.method} ${row.path}` })),
    [data, limit],
  )

  return (
    <ChartFrame
      title="Top endpoints"
      subtitle="Requests by endpoint"
      loading={loading}
      refreshing={refreshing}
      isEmpty={rows.length === 0}
      height={Math.max(200, rows.length * 34 + 40)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
        >
          <CartesianGrid stroke={colors.grid} strokeWidth={1} horizontal={false} />
          <XAxis
            type="number"
            {...AXIS_PROPS}
            stroke={colors.axis}
            allowDecimals={false}
            tickFormatter={formatCompact}
          />
          <YAxis
            type="category"
            dataKey="label"
            {...AXIS_PROPS}
            stroke={colors.axis}
            width={168}
            tick={{ fontSize: 11, fill: colors.textMuted }}
          />
          <Tooltip
            cursor={{ fill: colors.grid, fillOpacity: 0.5 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const row = payload[0]?.payload as EndpointUsage & { label: string }
              return (
                <TooltipCard
                  title={row.label}
                  rows={[
                    { label: 'Requests', value: formatNumber(row.request_count) },
                    { label: 'Errors', value: formatNumber(row.error_count) },
                    { label: 'Success rate', value: formatPercent(row.success_rate) },
                    {
                      label: 'Avg latency',
                      value: formatDuration(row.avg_response_time_ms),
                    },
                  ]}
                />
              )
            }}
          />
          <Bar
            dataKey="request_count"
            name="Requests"
            maxBarSize={MAX_BAR_SIZE}
            // Rounded data-end, square against the baseline.
            radius={[0, 4, 4, 0]}
          >
            {rows.map((row) => (
              <Cell key={row.label} fill={colors.series1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
