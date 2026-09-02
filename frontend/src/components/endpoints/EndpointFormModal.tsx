import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { ApiError, endpointsApi } from '@/services/api'
import { HTTP_METHODS, type Endpoint, type HttpMethod } from '@/types/api'

interface Props {
  open: boolean
  onClose: () => void
  projectId: string
  /** Suggested when creating, so the target URL field starts filled in. */
  projectBaseUrl?: string | null
  endpoint?: Endpoint | null
  onSaved: () => void
}

interface FormState {
  method: HttpMethod
  path: string
  target_url: string
  description: string
  enabled: boolean
}

const EMPTY: FormState = {
  method: 'GET',
  path: '',
  target_url: '',
  description: '',
  enabled: true,
}

export function EndpointFormModal({
  open,
  onClose,
  projectId,
  projectBaseUrl,
  endpoint,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const editing = Boolean(endpoint)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(
      endpoint
        ? {
            method: endpoint.method,
            path: endpoint.path,
            target_url: endpoint.target_url,
            description: endpoint.description ?? '',
            enabled: endpoint.enabled,
          }
        : EMPTY,
    )
  }, [open, endpoint])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  /**
   * Typing a path pre-fills the target URL from the project's base URL.
   * It stays editable -- an endpoint is free to point somewhere else.
   */
  const onPathChange = (path: string) => {
    setForm((current) => {
      const suggested =
        projectBaseUrl && !editing
          ? `${projectBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
          : current.target_url
      const wasSuggested =
        !current.target_url ||
        (projectBaseUrl ? current.target_url.startsWith(projectBaseUrl) : false)
      return {
        ...current,
        path,
        target_url: wasSuggested && !editing ? suggested : current.target_url,
      }
    })
  }

  const submit = async () => {
    setSaving(true)
    setError(null)
    const payload = {
      method: form.method,
      path: form.path.trim(),
      target_url: form.target_url.trim(),
      description: form.description.trim() || null,
      enabled: form.enabled,
    }
    try {
      if (endpoint) await endpointsApi.update(projectId, endpoint.id, payload)
      else await endpointsApi.create(projectId, payload)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Could not save endpoint', 0))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit endpoint' : 'Add endpoint'}
      description="Register a REST operation so its requests can be sent, logged, and measured."
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={saving}
            disabled={!form.path.trim() || !form.target_url.trim()}
            onClick={() => void submit()}
          >
            {editing ? 'Save changes' : 'Add endpoint'}
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
        {error && error.errors.length === 0 && (
          <p className="rounded border border-[#d03b3b]/30 bg-[#d03b3b]/10 px-3 py-2 text-xs text-[#d03b3b]">
            {error.message}
          </p>
        )}

        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Field label="Method" error={error?.fieldError('method')}>
            <Select
              value={form.method}
              onChange={(event) => update('method', event.target.value as HttpMethod)}
            >
              {HTTP_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Path" required error={error?.fieldError('path')}>
            <Input
              value={form.path}
              onChange={(event) => onPathChange(event.target.value)}
              placeholder="/orders"
              autoFocus
              mono
            />
          </Field>
        </div>

        <Field
          label="Target URL"
          required
          hint="The real API this endpoint forwards to."
          error={error?.fieldError('target_url')}
        >
          <Input
            value={form.target_url}
            onChange={(event) => update('target_url', event.target.value)}
            placeholder="https://api.example.com/orders"
            mono
          />
        </Field>

        <Field label="Description" error={error?.fieldError('description')}>
          <Textarea
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="Create a new order"
            rows={2}
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => update('enabled', event.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer accent-[color:var(--accent)]"
          />
          <span className="text-[13px] text-ink-2">
            Enabled
            <span className="ml-1.5 text-ink-3">
              — disabled endpoints cannot be sent from the Explorer
            </span>
          </span>
        </label>
      </form>
    </Modal>
  )
}
