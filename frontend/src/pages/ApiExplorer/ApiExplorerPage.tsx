import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader, Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Select, Textarea } from '@/components/ui/Field'
import { Tabs } from '@/components/ui/Tabs'
import { InlineSpinner } from '@/components/ui/States'
import {
  KeyValueEditor,
  emptyRow,
  rowsToRecord,
  type KeyValueRow,
} from '@/components/api-explorer/KeyValueEditor'
import { ResponseViewer } from '@/components/api-explorer/ResponseViewer'
import { SendIcon } from '@/components/layout/Icons'
import { useAsync } from '@/hooks/useAsync'
import { ApiError, endpointsApi, requestsApi } from '@/services/api'
import { useCurrentProject } from '@/context/ProjectContext'
import { supportsBody } from '@/utils/http'
import { prettyJson } from '@/utils/format'
import { HTTP_METHODS, type HttpMethod, type ProxyResponse } from '@/types/api'

const COMMON_HEADERS = [
  'Accept',
  'Authorization',
  'Content-Type',
  'User-Agent',
  'X-Request-Id',
]

/**
 * The request builder.
 *
 * Requests are sent to the backend, never straight to the target from the
 * browser. That is what makes every call measurable and logged -- and it is
 * the seam this app would grow a real gateway from.
 */
export function ApiExplorerPage() {
  const project = useCurrentProject()
  const projectId = project?.id ?? ''
  const [params] = useSearchParams()

  const [method, setMethod] = useState<HttpMethod>('GET')
  const [url, setUrl] = useState('')
  const [endpointId, setEndpointId] = useState('')
  const [queryRows, setQueryRows] = useState<KeyValueRow[]>([emptyRow()])
  const [headerRows, setHeaderRows] = useState<KeyValueRow[]>([emptyRow()])
  const [body, setBody] = useState('')
  const [tab, setTab] = useState('params')

  const [sending, setSending] = useState(false)
  const [response, setResponse] = useState<ProxyResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const endpoints = useAsync(
    useCallback(
      (signal: AbortSignal) => endpointsApi.list(projectId, false, signal),
      [projectId],
    ),
    [projectId],
  )

  const selected = useMemo(
    () => endpoints.data?.find((endpoint) => endpoint.id === endpointId) ?? null,
    [endpoints.data, endpointId],
  )

  // "Test endpoint" links here with ?endpoint=<id>; prefill from it once
  // the endpoint list has arrived.
  const preselect = params.get('endpoint')
  useEffect(() => {
    if (!preselect || !endpoints.data) return
    const match = endpoints.data.find((endpoint) => endpoint.id === preselect)
    if (match) {
      setEndpointId(match.id)
      setMethod(match.method)
      setUrl(match.target_url)
    }
  }, [preselect, endpoints.data])

  const chooseEndpoint = (id: string) => {
    setEndpointId(id)
    const match = endpoints.data?.find((endpoint) => endpoint.id === id)
    if (match) {
      setMethod(match.method)
      setUrl(match.target_url)
    }
  }

  const send = async () => {
    if (!projectId) return
    setSending(true)
    setError(null)
    try {
      const result = await requestsApi.send(projectId, {
        method,
        url: url.trim() || null,
        endpoint_id: endpointId || null,
        query_parameters: rowsToRecord(queryRows),
        headers: rowsToRecord(headerRows),
        body: supportsBody(method) && body.trim() ? body : null,
      })
      setResponse(result)
    } catch (err) {
      // A refusal to send (invalid URL, disabled endpoint) is different from
      // a target that answered badly -- that one comes back as a response.
      setResponse(null)
      setError(
        err instanceof ApiError ? err.message : 'The request could not be sent.',
      )
    } finally {
      setSending(false)
    }
  }

  if (!project) return null

  const canSend = Boolean(url.trim() || endpointId) && !sending
  const bodyAllowed = supportsBody(method)
  const activeParams = queryRows.filter((row) => row.enabled && row.key.trim()).length
  const activeHeaders = headerRows.filter((row) => row.enabled && row.key.trim()).length

  return (
    <>
      <PageHeader
        title="API Explorer"
        subtitle="Build a request, send it through the platform, and inspect the real response."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <Panel>
            {/* The request line: method, URL, send. */}
            <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row">
              <Select
                value={method}
                onChange={(event) => setMethod(event.target.value as HttpMethod)}
                className="w-full sm:w-[104px]"
                aria-label="HTTP method"
              >
                {HTTP_METHODS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>

              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && canSend) void send()
                }}
                placeholder="https://api.example.com/orders"
                aria-label="Request URL"
                className="h-8 min-w-0 flex-1 rounded border border-line bg-bg px-2.5 font-mono text-xs text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />

              <Button
                variant="primary"
                onClick={() => void send()}
                disabled={!canSend}
                loading={sending}
                icon={<SendIcon className="h-3.5 w-3.5" />}
                className="sm:w-[84px]"
              >
                Send
              </Button>
            </div>

            {/* Attributing a request to a registered endpoint is what makes
                it show up in that endpoint's statistics. */}
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
              <label className="text-xs text-ink-3" htmlFor="explorer-endpoint">
                Endpoint
              </label>
              <Select
                id="explorer-endpoint"
                value={endpointId}
                onChange={(event) => chooseEndpoint(event.target.value)}
                className="w-full max-w-[320px]"
              >
                <option value="">Ad-hoc request (not attributed)</option>
                {(endpoints.data ?? []).map((endpoint) => (
                  <option key={endpoint.id} value={endpoint.id} disabled={!endpoint.enabled}>
                    {endpoint.method} {endpoint.path}
                    {endpoint.enabled ? '' : ' — disabled'}
                  </option>
                ))}
              </Select>
              {endpoints.loading && <InlineSpinner />}
              {selected && !selected.enabled && (
                <span className="text-xs text-[#fab219]">
                  This endpoint is disabled and cannot be sent.
                </span>
              )}
              {!endpoints.loading && (endpoints.data?.length ?? 0) === 0 && (
                <Link
                  to="/project/endpoints"
                  className="text-xs text-accent hover:text-accent-hover"
                >
                  Register one
                </Link>
              )}
            </div>

            <Tabs
              tabs={[
                { id: 'params', label: 'Query params', count: activeParams },
                { id: 'headers', label: 'Headers', count: activeHeaders },
                { id: 'body', label: 'Body' },
              ]}
              active={tab}
              onChange={setTab}
              className="px-3"
            />

            <div className="p-3">
              {tab === 'params' && (
                <KeyValueEditor
                  rows={queryRows}
                  onChange={setQueryRows}
                  keyPlaceholder="Key"
                  valuePlaceholder="Value"
                />
              )}

              {tab === 'headers' && (
                <KeyValueEditor
                  rows={headerRows}
                  onChange={setHeaderRows}
                  keyPlaceholder="Header"
                  valuePlaceholder="Value"
                  suggestions={COMMON_HEADERS}
                />
              )}

              {tab === 'body' &&
                (bodyAllowed ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-3">JSON or raw text</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setBody((current) => prettyJson(current))}
                        disabled={!body.trim()}
                      >
                        Format JSON
                      </Button>
                    </div>
                    <Textarea
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      rows={10}
                      mono
                      spellCheck={false}
                      placeholder={'{\n  "product_id": 123,\n  "quantity": 2\n}'}
                    />
                  </div>
                ) : (
                  <p className="py-6 text-center text-[13px] text-ink-3">
                    {method} requests do not send a body.
                  </p>
                ))}
            </div>
          </Panel>

          <p className="px-1 text-xs leading-relaxed text-ink-3">
            Requests are sent by the backend, not the browser. Every call is timed,
            recorded, and available in{' '}
            <Link to="/project/logs" className="text-accent hover:text-accent-hover">
              Logs
            </Link>
            . Credentials in headers are redacted before anything is stored.
          </p>
        </div>

        <div className="xl:sticky xl:top-16 xl:self-start">
          <ResponseViewer response={response} sending={sending} error={error} />
          {response && (
            <p className="mt-2 px-1 text-xs text-ink-3">
              Saved as{' '}
              <Link
                to={`/project/logs/${response.request_id}`}
                className="font-mono text-accent hover:text-accent-hover"
              >
                {response.request_id}
              </Link>
            </p>
          )}
        </div>
      </div>
    </>
  )
}
