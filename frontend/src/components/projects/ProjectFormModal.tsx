import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { ApiError, projectsApi } from '@/services/api'
import { ENVIRONMENTS, type Environment, type Project } from '@/types/api'

interface Props {
  open: boolean
  onClose: () => void
  /** Present when editing; absent when creating. */
  project?: Project | null
  onSaved: (project: Project) => void
}

interface FormState {
  name: string
  description: string
  environment: Environment
  base_url: string
}

const EMPTY: FormState = {
  name: '',
  description: '',
  environment: 'development',
  base_url: '',
}

/**
 * Create or edit a project.
 *
 * Field-level errors come from the backend's validation response, so the
 * rules live in one place rather than being duplicated in the UI.
 */
export function ProjectFormModal({ open, onClose, project, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const editing = Boolean(project)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(
      project
        ? {
            name: project.name,
            description: project.description ?? '',
            environment: project.environment,
            base_url: project.base_url ?? '',
          }
        : EMPTY,
    )
  }, [open, project])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const submit = async () => {
    setSaving(true)
    setError(null)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      environment: form.environment,
      base_url: form.base_url.trim() || null,
    }
    try {
      const saved = project
        ? await projectsApi.update(project.id, payload)
        : await projectsApi.create(payload)
      onSaved(saved)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Could not save project', 0))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit project' : 'New project'}
      description={
        editing
          ? 'Update this project’s configuration.'
          : 'A project is an isolated API environment with its own endpoints, logs, and statistics.'
      }
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={saving}
            disabled={!form.name.trim()}
            onClick={() => void submit()}
          >
            {editing ? 'Save changes' : 'Create project'}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        {/* A non-field error (a conflict, say) is shown once at the top. */}
        {error && error.errors.length === 0 && (
          <p className="rounded border border-[#d03b3b]/30 bg-[#d03b3b]/10 px-3 py-2 text-xs text-[#d03b3b]">
            {error.message}
          </p>
        )}

        <Field label="Project name" required error={error?.fieldError('name')}>
          <Input
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="eBay"
            autoFocus
            maxLength={120}
          />
        </Field>

        <Field
          label="Description"
          hint="Optional. What this project's API is for."
          error={error?.fieldError('description')}
        >
          <Textarea
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="Marketplace orders and inventory API"
            rows={2}
            maxLength={2000}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Environment" error={error?.fieldError('environment')}>
            <Select
              value={form.environment}
              onChange={(event) => update('environment', event.target.value as Environment)}
            >
              {ENVIRONMENTS.map((environment) => (
                <option key={environment} value={environment}>
                  {environment.charAt(0).toUpperCase() + environment.slice(1)}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Base URL"
            hint="Optional. Used to resolve relative endpoint paths."
            error={error?.fieldError('base_url')}
          >
            <Input
              value={form.base_url}
              onChange={(event) => update('base_url', event.target.value)}
              placeholder="https://api.example.com"
              mono
            />
          </Field>
        </div>
      </form>
    </Modal>
  )
}
