import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Skeleton } from './States'

interface StatTileProps {
  label: string
  /** The headline figure, already formatted. */
  value: ReactNode
  /** Secondary context: a rate, a count, a comparison. */
  detail?: ReactNode
  tone?: 'default' | 'good' | 'warn' | 'bad'
  loading?: boolean
}

const TONES = {
  default: 'text-ink',
  good: 'text-[#0ca30c]',
  warn: 'text-[#fab219]',
  bad: 'text-[#d03b3b]',
}

/**
 * A single headline number.
 *
 * The right form for one value -- a one-bar bar chart would say less and
 * take more room. The figure uses proportional numerals deliberately:
 * tabular figures make a large standalone number look loose.
 */
export function StatTile({
  label,
  value,
  detail,
  tone = 'default',
  loading = false,
}: StatTileProps) {
  return (
    <div className="panel px-4 py-3.5">
      <p className="text-xs font-medium text-ink-3">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p className={cn('mt-1.5 text-2xl font-semibold tracking-tight', TONES[tone])}>
          {value}
        </p>
      )}
      {loading ? (
        <Skeleton className="mt-2 h-3 w-16" />
      ) : (
        detail && <p className="mt-1 text-xs text-ink-3">{detail}</p>
      )}
    </div>
  )
}

/** The KPI row at the top of the dashboard. */
export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>
  )
}
