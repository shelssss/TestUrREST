import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartFrame, ChartLegend } from './ChartFrame'
import { ChartTooltip } from './ChartTooltip'
import { AREA_OPACITY, AXIS_PROPS, LINE_WIDTH, readChartColors } from './chartTheme'
import type { TimeRange, TimeSeriesPoint } from '@/types/api'
import { formatAxisTime, formatCompact, formatDateTime, formatNumber } from '@/utils/format'

interface Props {
  data: TimeSeriesPoint[]
  range: TimeRange
  loading?: boolean
  refreshing?: boolean
}

/**
 * Request volume over time, split by outcome.
 *
 * Stacked because the reader's question is "how much traffic, and how much
 * of it failed" -- the stack answers both at once. Two series means a
 * legend is mandatory; the colours are the validated blue/red polarity
 * pair, and a 2px surface gap separates the segments.
 */
export function RequestVolumeChart({ data, range, loading, refreshing }: Props) {
  const colors = useMemo(readChartColors, [loading, refreshing, data])
  const isEmpty = !data.some((point) => point.total > 0)

  return (
    <ChartFrame
      title="Request volume"
      subtitle="Successful and failed requests over time"
      aside={
        <ChartLegend
          items={[
            { label: 'Successful', color: colors.success },
            { label: 'Failed', color: colors.failure },
          ]}
        />
      }
      loading={loading}
      refreshing={refreshing}
      isEmpty={isEmpty}
      height={240}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="volume-success" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.success} stopOpacity={AREA_OPACITY * 2} />
              <stop offset="100%" stopColor={colors.success} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="volume-failure" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.failure} stopOpacity={AREA_OPACITY * 2} />
              <stop offset="100%" stopColor={colors.failure} stopOpacity={0} />
            </linearGradient>
          </defs>

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
            width={44}
            allowDecimals={false}
            tickFormatter={formatCompact}
          />
          <Tooltip
            cursor={{ stroke: colors.axis, strokeWidth: 1 }}
            content={
              <ChartTooltip
                labelFormatter={formatDateTime}
                valueFormatter={(_, value) => formatNumber(value)}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="successful"
            name="Successful"
            stackId="requests"
            stroke={colors.success}
            strokeWidth={LINE_WIDTH}
            fill="url(#volume-success)"
            // The 2px gap in the surface colour is what separates the
            // stacked bands -- never a border drawn around the mark.
            activeDot={{ r: 4, strokeWidth: 2, stroke: colors.surface }}
          />
          <Area
            type="monotone"
            dataKey="failed"
            name="Failed"
            stackId="requests"
            stroke={colors.failure}
            strokeWidth={LINE_WIDTH}
            fill="url(#volume-failure)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: colors.surface }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
