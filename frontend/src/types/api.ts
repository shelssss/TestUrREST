/**
 * Types mirroring the backend's Pydantic schemas.
 *
 * These are the contract between the two halves of the app. Every API
 * response is typed against them, so a field the backend renames surfaces
 * as a compile error rather than `undefined` at runtime.
 */

export type Environment = 'development' | 'staging' | 'production'

export const ENVIRONMENTS: readonly Environment[] = [
  'development',
  'staging',
  'production',
] as const

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'

export const HTTP_METHODS: readonly HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const

/** Methods the API Explorer offers a request-body editor for. */
export const METHODS_WITH_BODY: readonly HttpMethod[] = [
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
] as const

// --- Projects --------------------------------------------------------------

export interface Project {
  id: string
  name: string
  description: string | null
  environment: Environment
  base_url: string | null
  created_at: string
  updated_at: string
}

export interface ProjectSummary extends Project {
  endpoint_count: number
  request_count: number
}

export interface ProjectInput {
  name: string
  description?: string | null
  environment: Environment
  base_url?: string | null
}

// --- Endpoints -------------------------------------------------------------

export interface Endpoint {
  id: string
  project_id: string
  method: HttpMethod
  path: string
  target_url: string
  description: string | null
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface EndpointInput {
  method: HttpMethod
  path: string
  target_url: string
  description?: string | null
  enabled: boolean
}

export interface EndpointStats {
  total_requests: number
  successful_requests: number
  failed_requests: number
  success_rate: number
  error_rate: number
  avg_response_time_ms: number
  min_response_time_ms: number
  max_response_time_ms: number
  last_request_at: string | null
}

export interface EndpointWithStats extends Endpoint {
  stats: EndpointStats
}

// --- Sending requests ------------------------------------------------------

export interface ProxyRequestInput {
  method: HttpMethod
  url?: string | null
  endpoint_id?: string | null
  query_parameters: Record<string, string>
  headers: Record<string, string>
  body?: string | null
  timeout_seconds?: number | null
}

export interface ProxyResponse {
  request_id: string
  log_id: string
  endpoint_id: string | null
  method: HttpMethod
  url: string
  /** Null when the target never answered -- see `error`. */
  status_code: number | null
  status_text: string | null
  response_time_ms: number
  response_size: number
  headers: Record<string, string>
  body: string | null
  is_json: boolean
  body_truncated: boolean
  error: string | null
  created_at: string
}

// --- Logs ------------------------------------------------------------------

export type StatusCategory = 'all' | '2xx' | '3xx' | '4xx' | '5xx' | 'failed'

export const STATUS_CATEGORIES: readonly {
  value: StatusCategory
  label: string
}[] = [
  { value: 'all', label: 'All' },
  { value: '2xx', label: '2xx' },
  { value: '3xx', label: '3xx' },
  { value: '4xx', label: '4xx' },
  { value: '5xx', label: '5xx' },
  { value: 'failed', label: 'No response' },
] as const

export interface LogListItem {
  id: string
  request_id: string
  project_id: string
  endpoint_id: string | null
  method: string
  url: string
  status_code: number | null
  response_time_ms: number
  response_size: number
  error_message: string | null
  created_at: string
}

export interface LogDetail extends LogListItem {
  request_headers: Record<string, string>
  query_parameters: Record<string, string>
  request_body: string | null
  response_headers: Record<string, string> | null
  response_body: string | null
  client_ip: string | null
  user_agent: string | null
  endpoint_path: string | null
}

export interface LogQuery {
  page?: number
  limit?: number
  method?: string
  status_code?: number
  status_category?: StatusCategory
  endpoint_id?: string
  search?: string
  start_date?: string
  end_date?: string
  min_response_time_ms?: number
  max_response_time_ms?: number
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

// --- Analytics -------------------------------------------------------------

export type TimeRange = '1h' | '24h' | '7d' | '30d'

export const TIME_RANGES: readonly { value: TimeRange; label: string }[] = [
  { value: '1h', label: 'Last hour' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
] as const

export interface RequestSummary {
  total_requests: number
  successful_requests: number
  failed_requests: number
  success_rate: number
  error_rate: number
  avg_response_time_ms: number
  p95_response_time_ms: number
}

export interface StatusBreakdown {
  success_2xx: number
  redirect_3xx: number
  client_error_4xx: number
  server_error_5xx: number
  failed: number
}

export interface EndpointUsage {
  endpoint_id: string | null
  method: string
  path: string
  request_count: number
  avg_response_time_ms: number
  error_count: number
  success_rate: number
}

export interface EndpointHighlights {
  total_endpoints: number
  enabled_endpoints: number
  most_used: EndpointUsage | null
  slowest: EndpointUsage | null
  most_successful: EndpointUsage | null
  most_errors: EndpointUsage | null
}

export interface TimeSeriesPoint {
  timestamp: string
  total: number
  successful: number
  failed: number
  avg_response_time_ms: number
}

export interface MethodCount {
  method: string
  count: number
}

export interface StatusCodeCount {
  status_code: number | null
  count: number
}

export interface Analytics {
  time_range: TimeRange
  start: string
  end: string
  summary: RequestSummary
  status_breakdown: StatusBreakdown
  endpoints: EndpointHighlights
  time_series: TimeSeriesPoint[]
  by_endpoint: EndpointUsage[]
  by_method: MethodCount[]
  by_status_code: StatusCodeCount[]
}
