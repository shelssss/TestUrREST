import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartFrame } from './ChartFrame'
import { ChartTooltip } from './ChartTooltip'
import { AXIS_PROPS, LINE_WIDTH, readChartColors } from './chartTheme'
import type { TimeRange, TimeSeriesPoint } from '@/types/api'
import { formatAxisTime, formatDateTime, formatDuration } from '@/utils/format'

interface Props {
  data: TimeSeriesPoint[]
  range: TimeRange
  loading?: boolean
  refreshing?: boolean
}

/**
 * Average response time over time.
 *
 * A single series, so there is no legend -- the title already names what is
 * plotted, and a one-swatch legend box would just restate it. Buckets with
 * no traffic are dropped rather than plotted as zero, so a quiet period
 * does not read as "instant responses".
 */
export function ResponseTimeChart({ data, range, loading, refreshing }: Props) {
  const colors = useMemo(readChartColors, [loading, refreshing, data])

  const points = useMemo(
    () => data.map((point) => ({
      ...point,
      // null leaves a gap in the line instead of a false zero.
      avg_response_time_ms: point.total > 0 ? point.avg_response_time_ms : null,
    })),
    [data],
  )
  const isEmpty = !data.some((point) => point.total > 0)

  return (
    <ChartFrame
      title="Response time"
      subtitle="Average latency per interval"
      loading={loading}
      refreshing={refreshing}
      isEmpty={isEmpty}
      height={200}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={colors.grid} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="timestamp"
            {...AXIS_PROPS}
            stroke={colors.axis}
            minTickGap={28}
            tickFormatter={(value: string) => formatAxisTime(value, range)}
          />
          <YAxis
            {...AXIS_PROPS}
            stroke={colors.axis}
            width={52}
            tickFormatter={(value: number) => `${Math.round(value)}ms`}
          />
          <Tooltip
            cursor={{ stroke: colors.axis, strokeWidth: 1 }}
            content={
              <ChartTooltip
                labelFormatter={formatDateTime}
                valueFormatter={(_, value) => formatDuration(value)}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="avg_response_time_ms"
            name="Average"
            stroke={colors.series1}
            strokeWidth={LINE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            connectNulls={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: colors.surface }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
