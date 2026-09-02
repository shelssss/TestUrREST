import { api } from './client'
import type { Project, ProjectInput, ProjectSummary } from '@/types/api'

export const projectsApi = {
  list: (signal?: AbortSignal) =>
    api.get<ProjectSummary[]>('/projects', signal),

  get: (projectId: string, signal?: AbortSignal) =>
    api.get<Project>(`/projects/${projectId}`, signal),

  create: (input: ProjectInput) => api.post<Project>('/projects', input),

  update: (projectId: string, input: Partial<ProjectInput>) =>
    api.put<Project>(`/projects/${projectId}`, input),

  remove: (projectId: string) => api.delete<void>(`/projects/${projectId}`),
}
