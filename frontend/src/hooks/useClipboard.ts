import { useCallback, useEffect, useRef, useState } from 'react'

/** Copy text and flash a short-lived "Copied" confirmation. */
export function useClipboard(resetMs = 1600): {
  copied: boolean
  copy: (text: string) => void
} {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>()

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = useCallback(
    (text: string) => {
      void navigator.clipboard?.writeText(text).then(
        () => {
          setCopied(true)
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => setCopied(false), resetMs)
        },
        () => setCopied(false),
      )
    },
    [resetMs],
  )

  return { copied, copy }
}
