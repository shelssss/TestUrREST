import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { EmptyState, Skeleton } from '@/components/ui/States'

interface ChartFrameProps {
  title: string
  subtitle?: string
  /** Legend or a range control rendered in the header. */
  aside?: ReactNode
  loading?: boolean
  /** True while re-fetching: the previous render is held at low opacity. */
  refreshing?: boolean
  isEmpty?: boolean
  emptyMessage?: string
  height?: number
  children: ReactNode
  className?: string
}

/**
 * The card every chart sits in.
 *
 * The container is sized to include the x-axis band, so axis labels are
 * never cut off into a nested scrollbar. On refetch it dims the existing
 * chart instead of swapping in a skeleton, which would jump the layout.
 */
export function ChartFrame({
  title,
  subtitle,
  aside,
  loading = false,
  refreshing = false,
  isEmpty = false,
  emptyMessage = 'No requests in this time range.',
  height = 220,
  children,
  className,
}: ChartFrameProps) {
  return (
    <section className={cn('panel flex flex-col', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>

      <div className="px-2 pb-3">
        {loading ? (
          <Skeleton className="mx-2 rounded" style={{ height }} />
        ) : isEmpty ? (
          <div style={{ height }} className="flex items-center justify-center">
            <EmptyState title="No data yet" description={emptyMessage} />
          </div>
        ) : (
          <div
            style={{ height }}
            className={cn('transition-opacity', refreshing && 'opacity-50')}
          >
            {children}
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * The legend shown for two or more series.
 *
 * Always present when there is more than one series -- identity must never
 * rest on colour alone. A single-series chart gets none: its title already
 * names what is plotted.
 */
export function ChartLegend({
  items,
}: {
  items: { label: string; color: string }[]
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-ink-2">
          <span
            aria-hidden="true"
            className="h-[3px] w-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
