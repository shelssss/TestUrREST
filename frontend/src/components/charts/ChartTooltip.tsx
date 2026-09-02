import type { TooltipProps } from 'recharts'
import { formatNumber } from '@/utils/format'

interface Row {
  label: string
  value: string
  color?: string
}

/** The shared tooltip surface -- one look across every chart. */
export function TooltipCard({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="pointer-events-none rounded-md border border-line bg-raised px-2.5 py-2 shadow-xl">
      <p className="mb-1.5 text-[11px] font-medium text-ink-2">{title}</p>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-3 text-[11px]">
            {row.color && (
              <span
                aria-hidden="true"
                className="h-[3px] w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
            )}
            <span className="text-ink-3">{row.label}</span>
            <span className="ml-auto font-medium text-ink nums">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

type Formatter = (name: string, value: number) => string

/**
 * Recharts tooltip adapter.
 *
 * Tooltips enhance; they never gate a value. Every number here is also
 * reachable from the axis, the direct labels, or the tables on the page.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: TooltipProps<number, string> & {
  labelFormatter?: (label: string) => string
  valueFormatter?: Formatter
}) {
  if (!active || !payload?.length) return null

  const title =
    labelFormatter && typeof label === 'string' ? labelFormatter(label) : String(label ?? '')

  return (
    <TooltipCard
      title={title}
      rows={payload.map((entry) => ({
        label: entry.name ?? '',
        color: entry.color,
        value: valueFormatter
          ? valueFormatter(entry.name ?? '', Number(entry.value ?? 0))
          : formatNumber(Number(entry.value ?? 0)),
      }))}
    />
  )
}
