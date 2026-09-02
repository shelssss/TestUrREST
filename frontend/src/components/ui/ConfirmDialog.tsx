import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  description: string
  confirmLabel?: string
  /** Rejections are surfaced in the dialog rather than swallowed. */
  onConfirm: () => Promise<void>
}

/** Confirmation for destructive actions, with the failure path handled. */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Delete',
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The action failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" loading={busy} onClick={() => void run()}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {error ? (
        <p className="rounded border border-[#d03b3b]/30 bg-[#d03b3b]/10 px-3 py-2 text-xs text-[#d03b3b]">
          {error}
        </p>
      ) : (
        <p className="text-[13px] text-ink-2">This action cannot be undone.</p>
      )}
    </Modal>
  )
}
