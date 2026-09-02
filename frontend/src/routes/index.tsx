import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { RequireProject } from './RequireProject'
import { RouteError } from './RouteError'
import { DashboardPage } from '@/pages/Dashboard/DashboardPage'
import { ProjectsPage } from '@/pages/Projects/ProjectsPage'
import { ProjectOverviewPage } from '@/pages/Dashboard/ProjectOverviewPage'
import { EndpointsPage } from '@/pages/Endpoints/EndpointsPage'
import { EndpointDetailPage } from '@/pages/Endpoints/EndpointDetailPage'
import { ApiExplorerPage } from '@/pages/ApiExplorer/ApiExplorerPage'
import { LogsPage } from '@/pages/Logs/LogsPage'
import { LogDetailPage } from '@/pages/Logs/LogDetailPage'
import { AnalyticsPage } from '@/pages/Analytics/AnalyticsPage'
import { SettingsPage } from '@/pages/Settings/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

/**
 * Application routes.
 *
 * Two groups, mirroring the sidebar: app-level pages, and pages under
 * `/project` that operate on whichever project is selected in the top bar.
 * The project group is wrapped once in `RequireProject` rather than each
 * page guarding for itself.
 *
 * The selected project is not in the URL: switching projects keeps you on
 * the page you were already on (one project's Logs to another's Logs),
 * which is how a monitoring tool is actually used.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'projects', element: <ProjectsPage /> },

      {
        path: 'project',
        children: [
          { index: true, element: <Navigate to="/project/overview" replace /> },
          {
            path: 'overview',
            element: (
              <RequireProject>
                <ProjectOverviewPage />
              </RequireProject>
            ),
          },
          {
            path: 'endpoints',
            element: (
              <RequireProject>
                <EndpointsPage />
              </RequireProject>
            ),
          },
          {
            path: 'endpoints/:endpointId',
            element: (
              <RequireProject>
                <EndpointDetailPage />
              </RequireProject>
            ),
          },
          {
            path: 'explorer',
            element: (
              <RequireProject>
                <ApiExplorerPage />
              </RequireProject>
            ),
          },
          {
            path: 'logs',
            element: (
              <RequireProject>
                <LogsPage />
              </RequireProject>
            ),
          },
          {
            path: 'logs/:requestId',
            element: (
              <RequireProject>
                <LogDetailPage />
              </RequireProject>
            ),
          },
          {
            path: 'analytics',
            element: (
              <RequireProject>
                <AnalyticsPage />
              </RequireProject>
            ),
          },
          {
            path: 'settings',
            element: (
              <RequireProject>
                <SettingsPage />
              </RequireProject>
            ),
          },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
