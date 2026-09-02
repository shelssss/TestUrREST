import { Link, useRouteError } from 'react-router-dom'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/States'

/**
 * The last line of defence.
 *
 * A render error anywhere in the tree lands here instead of blanking the
 * screen. The technical detail is kept out of the message and logged to the
 * console, where a developer will look for it.
 */
export function RouteError() {
  const error = useRouteError()

  if (import.meta.env.DEV) {
    console.error('Route error:', error)
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <Panel>
        <ErrorState
          title="Something went wrong"
          message="This page failed to render. Reloading usually clears it; the details are in the browser console."
          onRetry={() => window.location.reload()}
        />
        <div className="flex justify-center pb-8">
          <Link to="/">
            <Button>Back to dashboard</Button>
          </Link>
        </div>
      </Panel>
    </div>
  )
}
