import { api, buildQuery } from './client'
import type { Analytics, TimeRange } from '@/types/api'

export const analyticsApi = {
  /** Aggregates computed by PostgreSQL -- never raw logs counted in the browser. */
  get: (projectId: string, range: TimeRange, signal?: AbortSignal) =>
    api.get<Analytics>(
      `/projects/${projectId}/analytics${buildQuery({ range })}`,
      signal,
    ),
}
