import { Input } from '@/components/ui/Field'
import { PlusIcon, TrashIcon } from '@/components/layout/Icons'
import { Button } from '@/components/ui/Button'

export interface KeyValueRow {
  /** Stable identity so React does not remount rows as they are reordered. */
  id: string
  key: string
  value: string
  enabled: boolean
}

export function emptyRow(): KeyValueRow {
  return { id: crypto.randomUUID(), key: '', value: '', enabled: true }
}

/**
 * The dynamic key/value grid used for query parameters and headers.
 *
 * Rows carry an `enabled` flag so a header can be parked without being
 * retyped -- the same affordance Postman and Insomnia provide, and the
 * reason rows are objects with ids rather than a plain record.
 */
export function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  suggestions,
}: {
  rows: KeyValueRow[]
  onChange: (rows: KeyValueRow[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
  /** Offered in a datalist on the key input, e.g. common header names. */
  suggestions?: string[]
}) {
  const update = (id: string, patch: Partial<KeyValueRow>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))

  const remove = (id: string) => {
    const next = rows.filter((row) => row.id !== id)
    // Always leave one blank row so there is somewhere to type.
    onChange(next.length > 0 ? next : [emptyRow()])
  }

  const listId = suggestions ? `kv-suggestions-${keyPlaceholder}` : undefined

  return (
    <div className="space-y-1.5">
      {suggestions && (
        <datalist id={listId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      )}

      <div className="hidden grid-cols-[28px_1fr_1fr_32px] gap-2 px-1 sm:grid">
        <span />
        <span className="text-xs text-ink-3">{keyPlaceholder}</span>
        <span className="text-xs text-ink-3">{valuePlaceholder}</span>
        <span />
      </div>

      {rows.map((row) => (
        <div
          key={row.id}
          className="grid grid-cols-[28px_1fr_1fr_32px] items-center gap-2"
        >
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(event) => update(row.id, { enabled: event.target.checked })}
            className="mx-auto h-3.5 w-3.5 cursor-pointer accent-[color:var(--accent)]"
            aria-label={row.key ? `Include ${row.key}` : 'Include this row'}
          />
          <Input
            value={row.key}
            onChange={(event) => update(row.id, { key: event.target.value })}
            placeholder={keyPlaceholder}
            list={listId}
            mono
          />
          <Input
            value={row.value}
            onChange={(event) => update(row.id, { value: event.target.value })}
            placeholder={valuePlaceholder}
            mono
          />
          <Button
            size="sm"
            variant="ghost"
            className="text-ink-3 hover:text-[#d03b3b]"
            onClick={() => remove(row.id)}
            aria-label="Remove row"
            icon={<TrashIcon className="h-3.5 w-3.5" />}
          />
        </div>
      ))}

      <Button
        size="sm"
        variant="ghost"
        className="mt-1"
        icon={<PlusIcon className="h-3.5 w-3.5" />}
        onClick={() => onChange([...rows, emptyRow()])}
      >
        Add row
      </Button>
    </div>
  )
}

/** Collapse editor rows into the record the API expects. */
export function rowsToRecord(rows: KeyValueRow[]): Record<string, string> {
  const record: Record<string, string> = {}
  for (const row of rows) {
    const key = row.key.trim()
    if (row.enabled && key) record[key] = row.value
  }
  return record
}
