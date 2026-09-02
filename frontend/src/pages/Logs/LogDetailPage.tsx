import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader, Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { MethodBadge, StatusBadge } from '@/components/ui/Badge'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { JsonViewer } from '@/components/ui/JsonViewer'
import { HeaderTable } from '@/components/api-explorer/ResponseViewer'
import { ArrowLeftIcon, CheckIcon, CopyIcon } from '@/components/layout/Icons'
import { useAsync } from '@/hooks/useAsync'
import { useClipboard } from '@/hooks/useClipboard'
import { logsApi } from '@/services/api'
import { useCurrentProject } from '@/context/ProjectContext'
import {
  formatBytes,
  formatDateTime,
  formatDuration,
  isJsonText,
  prettyJson,
} from '@/utils/format'
import { reasonPhrase } from '@/utils/http'

/**
 * One request in full.
 *
 * Split into Request and Response so it reads in the order the exchange
 * happened. Anything sensitive was masked before it was stored, so what is
 * shown here is exactly what the database holds.
 */
export function LogDetailPage() {
  const project = useCurrentProject()
  const { requestId = '' } = useParams()
  const projectId = project?.id ?? ''

  const log = useAsync(
    useCallback(
      (signal: AbortSignal) => logsApi.get(projectId, requestId, signal),
      [projectId, requestId],
    ),
    [projectId, requestId],
  )

  if (!project) return null

  if (log.error) {
    return (
      <Panel>
        <ErrorState
          title={log.error.isNotFound ? 'Request log not found' : 'Unable to load this request'}
          message={
            log.error.isNotFound
              ? 'No request with that ID exists in this project.'
              : log.error.message
          }
          onRetry={log.error.isNotFound ? undefined : log.reload}
        />
        <div className="flex justify-center pb-8">
          <Link to="/project/logs">
            <Button icon={<ArrowLeftIcon className="h-3.5 w-3.5" />}>Back to logs</Button>
          </Link>
        </div>
      </Panel>
    )
  }

  const data = log.data

  return (
    <>
      <div className="mb-3">
        <Link
          to="/project/logs"
          className="inline-flex items-center gap-1.5 text-xs text-ink-3 transition-colors hover:text-ink-2"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Logs
        </Link>
      </div>

      <PageHeader
        title={
          log.loading || !data ? (
            <Skeleton className="h-6 w-72" />
          ) : (
            <span className="flex flex-wrap items-center gap-2.5">
              <MethodBadge method={data.method} />
              <span className="font-mono text-base">
                {data.endpoint_path ?? shortUrl(data.url)}
              </span>
              <StatusBadge status={data.status_code} showText />
            </span>
          )
        }
        subtitle={data ? formatDateTime(data.created_at) : undefined}
        actions={data ? <CopyIdButton requestId={data.request_id} /> : undefined}
      />

      {data?.error_message && (
        <p className="mb-4 rounded border border-[#d03b3b]/30 bg-[#d03b3b]/10 px-3 py-2.5 text-[13px] text-[#d03b3b]">
          {data.error_message}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-4">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-ink-3">
            Request
          </h2>

          <Panel className="px-4 py-3">
            <dl className="space-y-2.5">
              <Row label="Request ID" value={data?.request_id} mono loading={log.loading} />
              <Row
                label="Timestamp"
                value={data ? formatDateTime(data.created_at) : undefined}
                loading={log.loading}
              />
              <Row label="Method" value={data?.method} loading={log.loading} />
              <Row label="URL" value={data?.url} mono wrap loading={log.loading} />
              <Row
                label="Endpoint"
                value={data?.endpoint_path ?? 'Ad-hoc request'}
                loading={log.loading}
              />
              <Row label="Client IP" value={data?.client_ip ?? '—'} mono loading={log.loading} />
              <Row
                label="User agent"
                value={data?.user_agent ?? '—'}
                wrap
                loading={log.loading}
              />
            </dl>
          </Panel>

          <Panel>
            <PanelHeader
              title="Request headers"
              subtitle="Sent to the target in full; credentials masked before storage"
            />
            {log.loading ? (
              <SkeletonRows />
            ) : (
              <HeaderTable headers={data?.request_headers ?? {}} />
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Query parameters" />
            {log.loading ? (
              <SkeletonRows />
            ) : (
              <HeaderTable headers={data?.query_parameters ?? {}} />
            )}
          </Panel>

          <BodyPanel title="Request body" body={data?.request_body ?? null} loading={log.loading} />
        </section>

        <section className="space-y-4">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-ink-3">
            Response
          </h2>

          <Panel className="px-4 py-3">
            <dl className="space-y-2.5">
              <Row
                label="Status code"
                value={
                  data
                    ? data.status_code === null
                      ? 'No response'
                      : `${data.status_code} ${reasonPhrase(data.status_code)}`.trim()
                    : undefined
                }
                loading={log.loading}
              />
              <Row
                label="Response time"
                value={data ? formatDuration(data.response_time_ms) : undefined}
                loading={log.loading}
              />
              <Row
                label="Response size"
                value={data ? formatBytes(data.response_size) : undefined}
                loading={log.loading}
              />
            </dl>
          </Panel>

          <Panel>
            <PanelHeader title="Response headers" />
            {log.loading ? (
              <SkeletonRows />
            ) : (
              <HeaderTable headers={data?.response_headers ?? {}} />
            )}
          </Panel>

          <BodyPanel
            title="Response body"
            body={data?.response_body ?? null}
            loading={log.loading}
          />
        </section>
      </div>
    </>
  )
}

function Row({
  label,
  value,
  mono,
  wrap,
  loading,
}: {
  label: string
  value?: string | undefined
  mono?: boolean
  wrap?: boolean
  loading?: boolean
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-3">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd
        className={
          'text-[13px] text-ink ' +
          (mono ? 'font-mono text-xs ' : '') +
          (wrap ? 'break-all' : 'truncate')
        }
        title={value}
      >
        {loading ? <Skeleton className="h-3.5 w-40" /> : (value ?? '—')}
      </dd>
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-3.5 w-full" />
      ))}
    </div>
  )
}

/** A stored body, rendered as a JSON tree when it parses and text otherwise. */
function BodyPanel({
  title,
  body,
  loading,
}: {
  title: string
  body: string | null
  loading?: boolean
}) {
  const { copied, copy } = useClipboard()
  const [search, setSearch] = useState('')
  const json = isJsonText(body)

  return (
    <Panel>
      <PanelHeader
        title={title}
        actions={
          body ? (
            <>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                aria-label={`Search ${title.toLowerCase()}`}
                className="h-7 w-28 rounded border border-line bg-bg px-2 text-xs text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copy(body)}
                icon={
                  copied ? (
                    <CheckIcon className="h-3.5 w-3.5" />
                  ) : (
                    <CopyIcon className="h-3.5 w-3.5" />
                  )
                }
                aria-label={`Copy ${title.toLowerCase()}`}
              />
            </>
          ) : undefined
        }
      />
      {loading ? (
        <SkeletonRows />
      ) : !body ? (
        <p className="px-4 py-8 text-center text-[13px] text-ink-3">No body.</p>
      ) : (
        <div className="max-h-[420px] overflow-auto px-4 py-3">
          {json ? (
            <JsonViewer value={JSON.parse(body) as never} search={search} />
          ) : (
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink-2">
              {prettyJson(body)}
            </pre>
          )}
        </div>
      )}
    </Panel>
  )
}

function CopyIdButton({ requestId }: { requestId: string }) {
  const { copied, copy } = useClipboard()
  return (
    <Button
      onClick={() => copy(requestId)}
      icon={
        copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />
      }
    >
      {copied ? 'Copied' : 'Copy request ID'}
    </Button>
  )
}

/** Path plus query, for a heading where the host adds nothing. */
function shortUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.pathname}${parsed.search}` || '/'
  } catch {
    return url
  }
}
