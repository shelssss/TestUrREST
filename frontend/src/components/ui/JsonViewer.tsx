import { useMemo, useState } from 'react'
import { cn } from '@/utils/cn'

/**
 * A JSON tree with syntax highlighting, collapsing, and search.
 *
 * Written by hand rather than pulled from a package: the viewer needs to
 * collapse arbitrarily nested nodes, highlight matches, and stay in the
 * app's own token colours, and a generic component would fight all three.
 *
 * Highlighting is applied to *rendered text nodes only* -- values are never
 * injected as HTML -- so a response body containing markup cannot execute.
 */

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

interface JsonViewerProps {
  value: Json
  /** Substring to highlight; nodes are auto-expanded to reveal matches. */
  search?: string
  /** Depth expanded on first render. */
  initialDepth?: number
}

export function JsonViewer({ value, search = '', initialDepth = 2 }: JsonViewerProps) {
  return (
    <div className="font-mono text-xs leading-[1.7]">
      <JsonNode
        name={null}
        value={value}
        depth={0}
        initialDepth={initialDepth}
        search={search.trim().toLowerCase()}
        isLast
      />
    </div>
  )
}

interface NodeProps {
  name: string | null
  value: Json
  depth: number
  initialDepth: number
  search: string
  isLast: boolean
}

function JsonNode({ name, value, depth, initialDepth, search, isLast }: NodeProps) {
  const isContainer = value !== null && typeof value === 'object'
  const matchesInside = useMemo(
    () => (search && isContainer ? subtreeMatches(value, search) : false),
    [value, search, isContainer],
  )
  // A node collapsed by depth still opens when the search term is inside it.
  const [open, setOpen] = useState(depth < initialDepth)
  const expanded = open || matchesInside

  if (!isContainer) {
    return (
      <div style={{ paddingLeft: depth * 14 }} className="whitespace-pre-wrap break-all">
        {name !== null && <JsonKey name={name} search={search} />}
        <JsonScalar value={value} search={search} />
        {!isLast && <span className="text-ink-3">,</span>}
      </div>
    )
  }

  const isArray = Array.isArray(value)
  const entries: [string, Json][] = isArray
    ? (value as Json[]).map((item, index) => [String(index), item])
    : Object.entries(value as { [key: string]: Json })

  const open_ = isArray ? '[' : '{'
  const close = isArray ? ']' : '}'

  return (
    <div>
      <div style={{ paddingLeft: depth * 14 }} className="flex items-start">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="mr-1 mt-[3px] flex h-3 w-3 shrink-0 items-center justify-center rounded-sm text-ink-3 hover:bg-hover hover:text-ink"
          aria-label={expanded ? 'Collapse' : 'Expand'}
          aria-expanded={expanded}
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            className={cn('transition-transform', expanded && 'rotate-90')}
          >
            <path d="M2 1l4 3-4 3z" fill="currentColor" />
          </svg>
        </button>
        <span className="min-w-0 break-all">
          {name !== null && <JsonKey name={name} search={search} />}
          <span className="text-ink-2">{open_}</span>
          {!expanded && (
            <>
              <span className="mx-1 text-ink-3">
                {entries.length} {entries.length === 1 ? 'item' : 'items'}
              </span>
              <span className="text-ink-2">{close}</span>
              {!isLast && <span className="text-ink-3">,</span>}
            </>
          )}
        </span>
      </div>

      {expanded && (
        <>
          {entries.map(([key, item], index) => (
            <JsonNode
              key={key}
              name={isArray ? null : key}
              value={item}
              depth={depth + 1}
              initialDepth={initialDepth}
              search={search}
              isLast={index === entries.length - 1}
            />
          ))}
          <div style={{ paddingLeft: depth * 14 + 16 }}>
            <span className="text-ink-2">{close}</span>
            {!isLast && <span className="text-ink-3">,</span>}
          </div>
        </>
      )}
    </div>
  )
}

function JsonKey({ name, search }: { name: string; search: string }) {
  return (
    <>
      <span className="text-[#9085e9]">
        <Highlighted text={`"${name}"`} search={search} />
      </span>
      <span className="text-ink-3">: </span>
    </>
  )
}

function JsonScalar({ value, search }: { value: Json; search: string }) {
  if (value === null) return <span className="text-ink-3">null</span>
  if (typeof value === 'boolean')
    return <span className="text-[#3987e5]">{String(value)}</span>
  if (typeof value === 'number')
    return (
      <span className="text-[#fab219]">
        <Highlighted text={String(value)} search={search} />
      </span>
    )
  return (
    <span className="text-[#0ca30c]">
      <Highlighted text={`"${value}"`} search={search} />
    </span>
  )
}

/** Wrap search matches in <mark>, splitting on the rendered text only. */
function Highlighted({ text, search }: { text: string; search: string }) {
  if (!search) return <>{text}</>
  const lower = text.toLowerCase()
  if (!lower.includes(search)) return <>{text}</>

  const parts: React.ReactNode[] = []
  let cursor = 0
  let index = lower.indexOf(search)
  while (index !== -1) {
    if (index > cursor) parts.push(text.slice(cursor, index))
    parts.push(
      <mark key={index} className="rounded-sm bg-[#fab219]/30 text-inherit">
        {text.slice(index, index + search.length)}
      </mark>,
    )
    cursor = index + search.length
    index = lower.indexOf(search, cursor)
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return <>{parts}</>
}

/** True when the term appears anywhere in this subtree's keys or values. */
function subtreeMatches(value: Json, search: string): boolean {
  if (value === null) return 'null'.includes(search)
  if (typeof value !== 'object') return String(value).toLowerCase().includes(search)
  if (Array.isArray(value)) return value.some((item) => subtreeMatches(item, search))
  return Object.entries(value).some(
    ([key, item]) => key.toLowerCase().includes(search) || subtreeMatches(item, search),
  )
}
