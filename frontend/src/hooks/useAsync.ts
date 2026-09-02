import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/services/api'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
  /** True while re-fetching with data already on screen. */
  refreshing: boolean
  reload: () => void
}

/**
 * Run an async loader and track its lifecycle.
 *
 * A refetch sets `refreshing` rather than `loading`, so pages can hold the
 * previous render at reduced opacity instead of flashing a skeleton and
 * jumping the layout -- the loading state is only for a genuinely empty
 * screen.
 *
 * In-flight requests are aborted when the deps change or the component
 * unmounts, so a slow response can never overwrite a newer one.
 */
export function useAsync<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [nonce, setNonce] = useState(0)

  const hasData = useRef(false)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    if (hasData.current) setRefreshing(true)
    else setLoading(true)

    loaderRef
      .current(controller.signal)
      .then((result) => {
        if (!active) return
        setData(result)
        setError(null)
        hasData.current = true
      })
      .catch((err: unknown) => {
        if (!active) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(
          err instanceof ApiError
            ? err
            : new ApiError('Something went wrong. Please try again.', 0),
        )
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
        setRefreshing(false)
      })

    return () => {
      active = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { data, loading, error, refreshing, reload }
}
