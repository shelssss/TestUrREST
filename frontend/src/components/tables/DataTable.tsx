import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

/**
 * The shared shell for the app's data tables.
 *
 * Horizontal overflow is confined to this wrapper so a wide table scrolls
 * inside its own panel and the page body never scrolls sideways.
 */
export function TableWrapper({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full min-w-[640px] border-collapse text-[13px]">
        {children}
      </table>
    </div>
  )
}

export function Th({
  children,
  className,
  align = 'left',
}: {
  children?: ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}) {
  return (
    <th
      className={cn(
        'border-b border-line px-4 py-2 text-xs font-medium text-ink-3 whitespace-nowrap',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className,
  align = 'left',
}: {
  children?: ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}) {
  return (
    <td
      className={cn(
        'px-4 py-2.5 text-ink-2 align-middle',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  )
}

export function Tr({
  children,
  onClick,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-line last:border-0',
        onClick && 'cursor-pointer transition-colors hover:bg-hover',
        className,
      )}
    >
      {children}
    </tr>
  )
}
