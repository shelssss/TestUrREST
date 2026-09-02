import { api, buildQuery } from './client'
import type { LogDetail, LogListItem, LogQuery, Page } from '@/types/api'

const base = (projectId: string) => `/projects/${projectId}/logs`

export const logsApi = {
  /** One page of logs. Paging is the backend's job -- never fetch them all. */
  list: (projectId: string, query: LogQuery = {}, signal?: AbortSignal) =>
    api.get<Page<LogListItem>>(
      `${base(projectId)}${buildQuery({
        ...query,
        // 'all' is the default; omitting it keeps the URL readable.
        status_category:
          query.status_category === 'all' ? undefined : query.status_category,
      })}`,
      signal,
    ),

  recent: (projectId: string, limit = 10, signal?: AbortSignal) =>
    api.get<LogListItem[]>(`${base(projectId)}/recent${buildQuery({ limit })}`, signal),

  get: (projectId: string, requestId: string, signal?: AbortSignal) =>
    api.get<LogDetail>(`${base(projectId)}/${requestId}`, signal),
}
