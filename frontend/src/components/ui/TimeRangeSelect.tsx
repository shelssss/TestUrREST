import { TIME_RANGES, type TimeRange } from '@/types/api'
import { cn } from '@/utils/cn'

/**
 * The dashboard's time-range control.
 *
 * One control, placed above everything it scopes -- every chart and tile on
 * the page re-renders against the same slice, so nothing on screen is ever
 * showing a different window than its neighbour.
 */
export function TimeRangeSelect({
  value,
  onChange,
  className,
}: {
  value: TimeRange
  onChange: (range: TimeRange) => void
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="Time range"
      className={cn('inline-flex rounded border border-line bg-raised p-0.5', className)}
    >
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          type="button"
          onClick={() => onChange(range.value)}
          aria-pressed={value === range.value}
          className={cn(
            'rounded px-2.5 py-1 text-xs font-medium transition-colors',
            value === range.value
              ? 'bg-accent-soft text-ink'
              : 'text-ink-3 hover:text-ink-2',
          )}
        >
          {range.value === '1h'
            ? '1h'
            : range.value === '24h'
              ? '24h'
              : range.value === '7d'
                ? '7d'
                : '30d'}
          <span className="sr-only"> — {range.label}</span>
        </button>
      ))}
    </div>
  )
}
