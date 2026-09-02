import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiError, projectsApi } from '@/services/api'
import type { ProjectSummary } from '@/types/api'

interface ProjectContextValue {
  projects: ProjectSummary[]
  /** The project every project-scoped page reads from. */
  current: ProjectSummary | null
  loading: boolean
  error: ApiError | null
  selectProject: (projectId: string) => void
  /** Re-read the list after a create/edit/delete. */
  refresh: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

const STORAGE_KEY = 'apim-current-project'

function readStoredProjectId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Holds the project list and which one is selected.
 *
 * Selection lives here rather than in the URL so switching projects from
 * the top bar keeps the user on the page they were already looking at --
 * moving from one project's Logs to another's Logs, not back to a
 * dashboard. The choice is remembered across reloads.
 */
export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [currentId, setCurrentId] = useState<string | null>(readStoredProjectId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  const load = useCallback(async () => {
    try {
      const list = await projectsApi.list()
      setProjects(list)
      setError(null)
      // Fall back to the first project when the remembered one is gone.
      setCurrentId((existing) => {
        if (existing && list.some((project) => project.id === existing)) return existing
        return list[0]?.id ?? null
      })
    } catch (err) {
      setError(
        err instanceof ApiError ? err : new ApiError('Could not load projects', 0),
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    try {
      if (currentId) localStorage.setItem(STORAGE_KEY, currentId)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Selection simply will not persist; the session still works.
    }
  }, [currentId])

  const selectProject = useCallback((projectId: string) => setCurrentId(projectId), [])

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      current: projects.find((project) => project.id === currentId) ?? null,
      loading,
      error,
      selectProject,
      refresh: load,
    }),
    [projects, currentId, loading, error, selectProject, load],
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProjects(): ProjectContextValue {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProjects must be used inside a ProjectProvider')
  }
  return context
}

/**
 * The selected project, for pages that cannot render without one.
 *
 * Returns null while loading or when no project exists; the app layout
 * shows the appropriate state rather than each page reinventing it.
 */
export function useCurrentProject(): ProjectSummary | null {
  return useProjects().current
}
