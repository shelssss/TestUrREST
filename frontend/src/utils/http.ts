import type { HttpMethod } from '@/types/api'

/**
 * Method badge colours.
 *
 * Badges always render the method name, so colour is a supporting cue and
 * never the only channel. The assignment follows the convention developers
 * already know from Postman and Insomnia.
 */
const METHOD_STYLES: Record<string, string> = {
  GET: 'text-[#0ca30c] bg-[#0ca30c]/10 ring-[#0ca30c]/25',
  POST: 'text-[#fab219] bg-[#fab219]/10 ring-[#fab219]/25',
  PUT: 'text-[#3987e5] bg-[#3987e5]/10 ring-[#3987e5]/25',
  PATCH: 'text-[#9085e9] bg-[#9085e9]/12 ring-[#9085e9]/25',
  DELETE: 'text-[#d03b3b] bg-[#d03b3b]/10 ring-[#d03b3b]/25',
  HEAD: 'text-ink-2 bg-ink-2/10 ring-ink-2/20',
  OPTIONS: 'text-ink-2 bg-ink-2/10 ring-ink-2/20',
}

export function methodStyle(method: string): string {
  return METHOD_STYLES[method.toUpperCase()] ?? METHOD_STYLES.HEAD!
}

export type StatusTone = 'success' | 'redirect' | 'client' | 'server' | 'none'

/** Map a status code to its tone. Null means the target never answered. */
export function statusTone(status: number | null): StatusTone {
  if (status === null) return 'none'
  if (status < 300) return 'success'
  if (status < 400) return 'redirect'
  if (status < 500) return 'client'
  return 'server'
}

const TONE_STYLES: Record<StatusTone, string> = {
  success: 'text-[#0ca30c] bg-[#0ca30c]/10 ring-[#0ca30c]/25',
  redirect: 'text-[#3987e5] bg-[#3987e5]/10 ring-[#3987e5]/25',
  client: 'text-[#fab219] bg-[#fab219]/10 ring-[#fab219]/25',
  server: 'text-[#d03b3b] bg-[#d03b3b]/10 ring-[#d03b3b]/25',
  none: 'text-ink-3 bg-ink-3/10 ring-ink-3/25',
}

export function statusStyle(status: number | null): string {
  return TONE_STYLES[statusTone(status)]
}

/** Standard reason phrases, so a log row can read "201 Created" offline. */
const REASON_PHRASES: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  408: 'Request Timeout',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
}

export function reasonPhrase(status: number | null): string {
  if (status === null) return 'No response'
  return REASON_PHRASES[status] ?? ''
}

export function supportsBody(method: HttpMethod): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
}
