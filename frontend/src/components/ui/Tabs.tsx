import { cn } from '@/utils/cn'

export interface TabItem {
  id: string
  label: string
  /** Optional count shown after the label, e.g. header rows. */
  count?: number
}

/** Underlined tab strip used in the API Explorer and log detail. */
export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: TabItem[]
  active: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1 border-b border-line', className)}>
      {tabs.map((tab) => {
        const selected = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2',
              'text-[13px] font-medium transition-colors',
              selected
                ? 'border-accent text-ink'
                : 'border-transparent text-ink-3 hover:text-ink-2',
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="rounded bg-hover px-1.5 py-px text-[10px] text-ink-2 nums">
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
