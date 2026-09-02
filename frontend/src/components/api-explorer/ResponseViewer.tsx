import { useMemo, useState } from 'react'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Tabs } from '@/components/ui/Tabs'
import { StatusBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/States'
import { JsonViewer } from '@/components/ui/JsonViewer'
import { CheckIcon, CopyIcon, SearchIcon } from '@/components/layout/Icons'
import { useClipboard } from '@/hooks/useClipboard'
import { formatBytes, formatDuration, prettyJson } from '@/utils/format'
import { reasonPhrase } from '@/utils/http'
import type { ProxyResponse } from '@/types/api'

/**
 * The response panel.
 *
 * It reports what the target actually returned, including the case where
 * it returned nothing: a timeout renders as a first-class result with its
 * error message, not as an empty panel or a thrown exception.
 */
export function ResponseViewer({
  response,
  sending,
  error,
}: {
  response: ProxyResponse | null
  sending: boolean
  /** A request the platform refused to send (bad URL, disabled endpoint). */
  error: string | null
}) {
  const [tab, setTab] = useState<'body' | 'headers'>('body')
  const [search, setSearch] = useState('')
  const [raw, setRaw] = useState(false)
  const { copied, copy } = useClipboard()

  const headerCount = response ? Object.keys(response.headers).length : 0

  const parsed = useMemo(() => {
    if (!response?.body || !response.is_json) return null
    try {
      return JSON.parse(response.body) as unknown
    } catch {
      return null
    }
  }, [response])

  if (sending && !response) {
    return (
      <Panel className="flex h-full min-h-[280px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-ink-3">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
            <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-[13px]">Sending request…</p>
        </div>
      </Panel>
    )
  }

  if (error) {
    return (
      <Panel className="min-h-[280px]">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[13px] font-semibold text-ink">Response</h2>
        </div>
        <div className="p-4">
          <p className="rounded border border-[#d03b3b]/30 bg-[#d03b3b]/10 px-3 py-2.5 text-[13px] text-[#d03b3b]">
            {error}
          </p>
        </div>
      </Panel>
    )
  }

  if (!response) {
    return (
      <Panel className="flex h-full min-h-[280px] items-center justify-center">
        <EmptyState
          title="No response yet"
          description="Configure the request on the left and press Send. The backend forwards it, measures it, and logs it."
        />
      </Panel>
    )
  }

  return (
    <Panel className="flex min-h-[280px] flex-col">
      {/* Status line: the four numbers a developer checks first. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={response.status_code} />
          <span className="text-[13px] font-medium text-ink">
            {response.status_text ?? reasonPhrase(response.status_code)}
          </span>
        </div>
        <Metric label="Time" value={formatDuration(response.response_time_ms)} />
        <Metric label="Size" value={formatBytes(response.response_size)} />
        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-[11px] text-ink-3">{response.request_id}</span>
          <Button
            size="sm"
            variant="ghost"
            icon={copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
            onClick={() => copy(response.body ?? '')}
            disabled={!response.body}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      {response.error && (
        <p className="border-b border-line bg-[#d03b3b]/10 px-4 py-2.5 text-[13px] text-[#d03b3b]">
          {response.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 px-4">
        <Tabs
          tabs={[
            { id: 'body', label: 'Body' },
            { id: 'headers', label: 'Headers', count: headerCount },
          ]}
          active={tab}
          onChange={(id) => setTab(id as 'body' | 'headers')}
          className="flex-1"
        />
      </div>

      {tab === 'body' ? (
        <BodyPane
          body={response.body}
          parsed={parsed}
          isJson={response.is_json}
          truncated={response.body_truncated}
          raw={raw}
          onToggleRaw={() => setRaw((value) => !value)}
          search={search}
          onSearch={setSearch}
        />
      ) : (
        <HeaderTable headers={response.headers} />
      )}
    </Panel>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-xs text-ink-3">{label}</span>
      <span className="text-[13px] font-medium text-ink nums">{value}</span>
    </span>
  )
}

function BodyPane({
  body,
  parsed,
  isJson,
  truncated,
  raw,
  onToggleRaw,
  search,
  onSearch,
}: {
  body: string | null
  parsed: unknown
  isJson: boolean
  truncated: boolean
  raw: boolean
  onToggleRaw: () => void
  search: string
  onSearch: (value: string) => void
}) {
  if (!body) {
    return (
      <div className="flex-1 px-4 py-10 text-center text-[13px] text-ink-3">
        This response has no body.
      </div>
    )
  }

  const showTree = isJson && parsed !== null && !raw

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
        <div className="relative w-full max-w-[220px]">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <Input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search response"
            className="h-7 pl-8"
          />
        </div>
        {isJson && (
          <Button size="sm" variant="ghost" onClick={onToggleRaw}>
            {raw ? 'Formatted' : 'Raw'}
          </Button>
        )}
        {truncated && (
          <span
            className="ml-auto text-xs text-ink-3"
            title="The stored body was capped so a single large download cannot bloat the log"
          >
            Truncated for logging
          </span>
        )}
      </div>

      {/* Wide content scrolls inside this box, never the page. */}
      <div className="min-h-0 flex-1 overflow-auto border-t border-line px-4 py-3">
        {showTree ? (
          <JsonViewer value={parsed as never} search={search} />
        ) : (
          <HighlightedText text={isJson ? prettyJson(body) : body} search={search} />
        )}
      </div>
    </div>
  )
}

/** Plain-text body with search matches marked. */
function HighlightedText({ text, search }: { text: string; search: string }) {
  const term = search.trim().toLowerCase()
  if (!term) {
    return (
      <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink-2">
        {text}
      </pre>
    )
  }

  const lower = text.toLowerCase()
  const parts: React.ReactNode[] = []
  let cursor = 0
  let index = lower.indexOf(term)
  while (index !== -1) {
    if (index > cursor) parts.push(text.slice(cursor, index))
    parts.push(
      <mark key={index} className="rounded-sm bg-[#fab219]/30 text-inherit">
        {text.slice(index, index + term.length)}
      </mark>,
    )
    cursor = index + term.length
    index = lower.indexOf(term, cursor)
  }
  if (cursor < text.length) parts.push(text.slice(cursor))

  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink-2">
      {parts}
    </pre>
  )
}

/**
 * A header table.
 *
 * Credential values arrive already masked from the backend. The mask marks
 * what was *stored*, never what was sent -- so masked rows are labelled
 * explicitly, because reading the mask as "the header was dropped" is an
 * easy and expensive mistake to make while debugging a 401.
 */
export function HeaderTable({ headers }: { headers: Record<string, string> }) {
  const entries = Object.entries(headers)

  if (entries.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-[13px] text-ink-3">No headers.</div>
    )
  }

  return (
    <div className="overflow-x-auto border-t border-line">
      <table className="w-full border-collapse text-xs">
        <tbody>
          {entries.map(([name, value]) => {
            const masked = value.includes('********')
            return (
              <tr key={name} className="border-b border-line last:border-0">
                <td className="w-56 px-4 py-2 align-top font-mono text-ink-3">{name}</td>
                <td className="break-all px-4 py-2 font-mono text-ink-2">
                  {value}
                  {masked && (
                    <span
                      className="ml-2 font-sans text-[11px] text-ink-3"
                      title="This header was sent to the target API in full. Only the copy stored in the log is masked."
                    >
                      (sent in full, masked in storage)
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
