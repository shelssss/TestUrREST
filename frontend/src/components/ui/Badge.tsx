import { cn } from '@/utils/cn'
import { methodStyle, reasonPhrase, statusStyle } from '@/utils/http'

/** HTTP method badge. The method name is always rendered, never colour alone. */
export function MethodBadge({
  method,
  className,
}: {
  method: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-[18px] min-w-[46px] items-center justify-center rounded px-1.5',
        'font-mono text-[10px] font-semibold tracking-wide ring-1 ring-inset',
        methodStyle(method),
        className,
      )}
    >
      {method.toUpperCase()}
    </span>
  )
}

/**
 * HTTP status badge.
 *
 * A null status means the request never got a response; it renders as a
 * dash with a tooltip rather than a fake code.
 */
export function StatusBadge({
  status,
  showText = false,
  className,
}: {
  status: number | null
  showText?: boolean
  className?: string
}) {
  const phrase = reasonPhrase(status)
  return (
    <span
      title={status === null ? 'No response from the target API' : phrase}
      className={cn(
        'inline-flex h-[18px] items-center gap-1.5 rounded px-1.5',
        'font-mono text-[10px] font-semibold ring-1 ring-inset nums',
        statusStyle(status),
        className,
      )}
    >
      {status ?? '—'}
      {showText && phrase && <span className="font-sans font-normal">{phrase}</span>}
    </span>
  )
}

const ENVIRONMENT_STYLES: Record<string, string> = {
  production: 'text-[#d03b3b] bg-[#d03b3b]/10 ring-[#d03b3b]/25',
  staging: 'text-[#fab219] bg-[#fab219]/10 ring-[#fab219]/25',
  development: 'text-[#3987e5] bg-[#3987e5]/10 ring-[#3987e5]/25',
}

export function EnvironmentBadge({ environment }: { environment: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-[18px] items-center rounded px-1.5 text-[10px] font-medium',
        'uppercase tracking-wide ring-1 ring-inset',
        ENVIRONMENT_STYLES[environment] ?? ENVIRONMENT_STYLES.development,
      )}
    >
      {environment}
    </span>
  )
}

export function Chip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'good' | 'bad'
}) {
  const tones = {
    neutral: 'text-ink-2 bg-hover ring-line',
    good: 'text-[#0ca30c] bg-[#0ca30c]/10 ring-[#0ca30c]/25',
    bad: 'text-ink-3 bg-ink-3/10 ring-ink-3/20',
  }
  return (
    <span
      className={cn(
        'inline-flex h-[18px] items-center rounded px-1.5 text-[10px] font-medium ring-1 ring-inset',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}
