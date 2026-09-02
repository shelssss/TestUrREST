import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ApiError, projectsApi } from '@/services/api'
import { useCurrentProject, useProjects } from '@/context/ProjectContext'
import { formatDateTime } from '@/utils/format'
import { ENVIRONMENTS, type Environment } from '@/types/api'

/** Project settings: edit configuration, or delete the project outright. */
export function SettingsPage() {
  const project = useCurrentProject()
  const { refresh } = useProjects()
  const navigate = useNavigate()

  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [environment, setEnvironment] = useState<Environment>(
    project?.environment ?? 'development',
  )
  const [baseUrl, setBaseUrl] = useState(project?.base_url ?? '')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Re-seed the form when the selected project changes underneath it.
  const [seededFor, setSeededFor] = useState(project?.id)
  if (project && project.id !== seededFor) {
    setSeededFor(project.id)
    setName(project.name)
    setDescription(project.description ?? '')
    setEnvironment(project.environment)
    setBaseUrl(project.base_url ?? '')
    setError(null)
    setSaved(false)
  }

  if (!project) return null

  const save = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await projectsApi.update(project.id, {
        name: name.trim(),
        description: description.trim() || null,
        environment,
        base_url: baseUrl.trim() || null,
      })
      await refresh()
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Could not save changes', 0))
    } finally {
      setSaving(false)
    }
  }

  const dirty =
    name !== project.name ||
    description !== (project.description ?? '') ||
    environment !== project.environment ||
    baseUrl !== (project.base_url ?? '')

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle={`Configuration for ${project.name}`}
      />

      <div className="max-w-2xl space-y-4">
        <Panel>
          <PanelHeader title="Project details" />
          <form
            className="space-y-4 p-4"
            onSubmit={(event) => {
              event.preventDefault()
              void save()
            }}
          >
            {error && error.errors.length === 0 && (
              <p className="rounded border border-[#d03b3b]/30 bg-[#d03b3b]/10 px-3 py-2 text-xs text-[#d03b3b]">
                {error.message}
              </p>
            )}

            <Field label="Project name" required error={error?.fieldError('name')}>
              <Input
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setSaved(false)
                }}
                maxLength={120}
              />
            </Field>

            <Field label="Description" error={error?.fieldError('description')}>
              <Textarea
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value)
                  setSaved(false)
                }}
                rows={3}
                maxLength={2000}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Environment" error={error?.fieldError('environment')}>
                <Select
                  value={environment}
                  onChange={(event) => {
                    setEnvironment(event.target.value as Environment)
                    setSaved(false)
                  }}
                >
                  {ENVIRONMENTS.map((item) => (
                    <option key={item} value={item}>
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Base URL"
                hint="Used to resolve relative endpoint paths."
                error={error?.fieldError('base_url')}
              >
                <Input
                  value={baseUrl}
                  onChange={(event) => {
                    setBaseUrl(event.target.value)
                    setSaved(false)
                  }}
                  placeholder="https://api.example.com"
                  mono
                />
              </Field>
            </div>

            <div className="flex items-center gap-3 border-t border-line pt-4">
              <Button
                variant="primary"
                loading={saving}
                disabled={!dirty || !name.trim()}
                onClick={() => void save()}
              >
                Save changes
              </Button>
              {saved && !dirty && (
                <span className="text-xs text-[#0ca30c]">Saved</span>
              )}
            </div>
          </form>
        </Panel>

        <Panel>
          <PanelHeader title="Metadata" />
          <dl className="space-y-2.5 p-4">
            <MetaRow label="Project ID" value={project.id} mono />
            <MetaRow label="Created" value={formatDateTime(project.created_at)} />
            <MetaRow label="Last updated" value={formatDateTime(project.updated_at)} />
            <MetaRow label="Endpoints" value={String(project.endpoint_count)} />
            <MetaRow label="Logged requests" value={String(project.request_count)} />
          </dl>
        </Panel>

        <Panel className="border-[#d03b3b]/30">
          <PanelHeader
            title="Delete project"
            subtitle="Removes the project and every endpoint and request log it owns."
          />
          <div className="p-4">
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Delete this project
            </Button>
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete "${project.name}"?`}
        description="This permanently removes the project along with all of its endpoints and request logs."
        onConfirm={async () => {
          await projectsApi.remove(project.id)
          await refresh()
          navigate('/projects')
        }}
      />
    </>
  )
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-baseline gap-3">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className={'text-[13px] text-ink ' + (mono ? 'font-mono text-xs' : '')}>
        {value}
      </dd>
    </div>
  )
}
