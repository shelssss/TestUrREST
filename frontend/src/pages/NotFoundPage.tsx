import { Link } from 'react-router-dom'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'

export function NotFoundPage() {
  return (
    <Panel>
      <EmptyState
        title="Page not found"
        description="That URL does not match anything in the application."
        action={
          <Link to="/">
            <Button variant="primary">Back to dashboard</Button>
          </Link>
        }
      />
    </Panel>
  )
}
