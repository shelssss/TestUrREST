import { Link } from 'react-router-dom'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { MethodBadge, StatusBadge } from '@/components/ui/Badge'
import { EmptyState, TableSkeleton } from '@/components/ui/States'
import { TableWrapper, Td, Th, Tr } from '@/components/tables/DataTable'
import { formatDuration, formatTime } from '@/utils/format'
import type { LogListItem } from '@/types/api'

/** The dashboard's activity feed: the newest requests in the project. */
export function RecentRequests({
  logs,
  loading,
}: {
  logs: LogListItem[]
  loading?: boolean
}) {
  return (
    <Panel>
      <PanelHeader
        title="Recent requests"
        actions={
          <Link
            to="/project/logs"
            className="text-xs text-accent transition-colors hover:text-accent-hover"
          >
            View all logs
          </Link>
        }
      />
      {loading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No requests yet"
          description="Send a request from the API Explorer and it will appear here."
        />
      ) : (
        <TableWrapper>
          <thead>
            <tr>
              <Th className="w-24">Time</Th>
              <Th className="w-20">Method</Th>
              <Th>Endpoint</Th>
              <Th className="w-24">Status</Th>
              <Th className="w-24" align="right">
                Duration
              </Th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <Tr key={log.id}>
                <Td className="text-ink-3 nums">{formatTime(log.created_at)}</Td>
                <Td>
                  <MethodBadge method={log.method} />
                </Td>
                <Td className="max-w-0">
                  <Link
                    to={`/project/logs/${log.request_id}`}
                    className="block truncate font-mono text-xs text-ink-2 hover:text-accent"
                    title={log.url}
                  >
                    {shortPath(log.url)}
                  </Link>
                </Td>
                <Td>
                  <StatusBadge status={log.status_code} />
                </Td>
                <Td align="right" className="text-ink-2 nums">
                  {formatDuration(log.response_time_ms)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableWrapper>
      )}
    </Panel>
  )
}

/** Show the path rather than the full URL -- the host is the same all down the column. */
export function shortPath(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.pathname}${parsed.search}` || '/'
  } catch {
    return url
  }
}
