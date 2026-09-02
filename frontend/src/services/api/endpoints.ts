import { api, buildQuery } from './client'
import type {
  Endpoint,
  EndpointInput,
  EndpointStats,
  EndpointWithStats,
  LogListItem,
  StatusCodeCount,
  TimeRange,
  TimeSeriesPoint,
} from '@/types/api'

const base = (projectId: string) => `/projects/${projectId}/endpoints`

export const endpointsApi = {
  list: (projectId: string, enabledOnly = false, signal?: AbortSignal) =>
    api.get<Endpoint[]>(
      `${base(projectId)}${buildQuery({ enabled_only: enabledOnly || undefined })}`,
      signal,
    ),

  get: (projectId: string, endpointId: string, signal?: AbortSignal) =>
    api.get<EndpointWithStats>(`${base(projectId)}/${endpointId}`, signal),

  create: (projectId: string, input: EndpointInput) =>
    api.post<Endpoint>(base(projectId), input),

  update: (projectId: string, endpointId: string, input: Partial<EndpointInput>) =>
    api.put<Endpoint>(`${base(projectId)}/${endpointId}`, input),

  setEnabled: (projectId: string, endpointId: string, enabled: boolean) =>
    api.patch<Endpoint>(`${base(projectId)}/${endpointId}/enabled`, { enabled }),

  remove: (projectId: string, endpointId: string) =>
    api.delete<void>(`${base(projectId)}/${endpointId}`),

  stats: (projectId: string, endpointId: string, signal?: AbortSignal) =>
    api.get<EndpointStats>(`${base(projectId)}/${endpointId}/stats`, signal),

  timeSeries: (
    projectId: string,
    endpointId: string,
    range: TimeRange,
    signal?: AbortSignal,
  ) =>
    api.get<TimeSeriesPoint[]>(
      `${base(projectId)}/${endpointId}/time-series${buildQuery({ range })}`,
      signal,
    ),

  statusDistribution: (projectId: string, endpointId: string, signal?: AbortSignal) =>
    api.get<StatusCodeCount[]>(
      `${base(projectId)}/${endpointId}/status-distribution`,
      signal,
    ),

  logs: (projectId: string, endpointId: string, limit = 20, signal?: AbortSignal) =>
    api.get<LogListItem[]>(
      `${base(projectId)}/${endpointId}/logs${buildQuery({ limit })}`,
      signal,
    ),
}
