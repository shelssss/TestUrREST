import { Button } from '@/components/ui/Button'
import { formatNumber } from '@/utils/format'

interface PaginationProps {
  page: number
  pages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange?: (limit: number) => void
}

const PAGE_SIZES = [25, 50, 100, 200]

/**
 * Page controls for a server-paginated table.
 *
 * The counts come from the backend's `total`; the browser only ever holds
 * one page of rows.
 */
export function Pagination({
  page,
  pages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const first = total === 0 ? 0 : (page - 1) * limit + 1
  const last = Math.min(page * limit, total)

  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-ink-3 nums">
        {total === 0 ? (
          'No results'
        ) : (
          <>
            Showing <span className="text-ink-2">{formatNumber(first)}</span>–
            <span className="text-ink-2">{formatNumber(last)}</span> of{' '}
            <span className="text-ink-2">{formatNumber(total)}</span>
          </>
        )}
      </p>

      <div className="flex items-center gap-3">
        {onLimitChange && (
          <label className="flex items-center gap-1.5 text-xs text-ink-3">
            Rows
            <select
              value={limit}
              onChange={(event) => onLimitChange(Number(event.target.value))}
              className="h-7 cursor-pointer rounded border border-line bg-bg px-1.5 text-xs text-ink-2 focus:border-accent focus:outline-none"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            Previous
          </Button>
          <span className="px-1 text-xs text-ink-3 nums">
            {page} / {Math.max(pages, 1)}
          </span>
          <Button
            size="sm"
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
