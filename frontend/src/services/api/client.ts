/**
 * The single HTTP client every API module goes through.
 *
 * All network access in the app funnels through `request` so error
 * handling, JSON parsing, and query-string building exist in exactly one
 * place. Components never call `fetch` directly.
 */

/** A field-level validation failure from the backend. */
export interface FieldError {
  field: string
  message: string
}

/**
 * An error carrying the backend's message.
 *
 * The backend guarantees `{"detail": "..."}` on every failure, so the UI
 * always has something meaningful to show and never has to invent one.
 */
export class ApiError extends Error {
  readonly status: number
  readonly errors: FieldError[]

  constructor(message: string, status: number, errors: FieldError[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }

  /** True when the resource does not exist -- callers often render a 404 state. */
  get isNotFound(): boolean {
    return this.status === 404
  }

  /** True when the request never reached the server at all. */
  get isNetworkError(): boolean {
    return this.status === 0
  }

  /** Look up the message for a specific form field, if the backend named one. */
  fieldError(field: string): string | undefined {
    return this.errors.find((e) => e.field === field)?.message
  }
}

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export type QueryValue = string | number | boolean | null | undefined

/** Build a query string, dropping empty values so URLs stay clean. */
export function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue
    search.append(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

interface RequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    // An aborted request is a normal part of the lifecycle (the user
    // navigated away), so it is rethrown untouched for callers to ignore.
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(
      'Could not reach the API. Check that the backend is running.',
      0,
    )
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const data = payload as { detail?: string; errors?: FieldError[] } | null
    throw new ApiError(
      data?.detail ?? `Request failed with status ${response.status}`,
      response.status,
      data?.errors ?? [],
    )
  }

  return payload as T
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'POST', body, signal }),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'PUT', body, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'PATCH', body, signal }),
  delete: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, { method: 'DELETE', signal }),
}
