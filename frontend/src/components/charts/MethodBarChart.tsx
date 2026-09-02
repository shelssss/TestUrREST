import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartFrame } from './ChartFrame'
import { TooltipCard } from './ChartTooltip'
import { AXIS_PROPS, MAX_BAR_SIZE, readChartColors } from './chartTheme'
import type { MethodCount } from '@/types/api'
import { formatCompact, formatNumber } from '@/utils/format'

/** Requests by HTTP method. One series, one colour. */
export function MethodBarChart({
  data,
  loading,
  refreshing,
}: {
  data: MethodCount[]
  loading?: boolean
  refreshing?: boolean
}) {
  const colors = useMemo(readChartColors, [loading, refreshing, data])

  return (
    <ChartFrame
      title="Requests by method"
      loading={loading}
      refreshing={refreshing}
      isEmpty={data.length === 0}
      height={200}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={colors.grid} strokeWidth={1} vertical={false} />
          <XAxis dataKey="method" {...AXIS_PROPS} stroke={colors.axis} />
          <YAxis
            {...AXIS_PROPS}
            stroke={colors.axis}
            width={44}
            allowDecimals={false}
            tickFormatter={formatCompact}
          />
          <Tooltip
            cursor={{ fill: colors.grid, fillOpacity: 0.5 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const row = payload[0]?.payload as MethodCount
              return (
                <TooltipCard
                  title={row.method}
                  rows={[{ label: 'Requests', value: formatNumber(row.count) }]}
                />
              )
            }}
          />
          <Bar
            dataKey="count"
            name="Requests"
            fill={colors.series1}
            maxBarSize={MAX_BAR_SIZE}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
