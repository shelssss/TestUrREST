import { RouterProvider } from 'react-router-dom'
import { ProjectProvider } from '@/context/ProjectContext'
import { router } from '@/routes'

/**
 * The application root.
 *
 * `ProjectProvider` wraps the router so the selected project survives
 * navigation -- every page reads the same selection, which is what keeps
 * one project's data from ever leaking into another's view.
 */
export function App() {
  return (
    <ProjectProvider>
      <RouterProvider router={router} />
    </ProjectProvider>
  )
}
