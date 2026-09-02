import { api } from './client'
import type { ProxyRequestInput, ProxyResponse } from '@/types/api'

export const requestsApi = {
  /**
   * Send a request through the backend proxy.
   *
   * Resolves even when the target API failed: a timeout comes back with a
   * null `status_code` and a populated `error`, because a dead target is a
   * result the platform reports, not an exception.
   */
  send: (projectId: string, input: ProxyRequestInput, signal?: AbortSignal) =>
    api.post<ProxyResponse>(`/projects/${projectId}/requests`, input, signal),
}
