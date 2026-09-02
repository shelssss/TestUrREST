import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

const CONTROL =
  'w-full rounded bg-bg border border-line px-2.5 text-[13px] text-ink placeholder:text-ink-3 ' +
  'transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ' +
  'disabled:opacity-50'

interface LabelProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}

/** Label + control + inline error, so forms report problems in one place. */
export function Field({ label, hint, error, required, children, className }: LabelProps) {
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-ink-2">
          {label}
          {required && <span className="text-[#d03b3b]">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-[#d03b3b]">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-ink-3">{hint}</span>
      ) : null}
    </label>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  mono?: boolean
}

export function Input({ invalid, mono, className, ...rest }: InputProps) {
  return (
    <input
      className={cn(
        CONTROL,
        'h-8',
        mono && 'font-mono text-xs',
        invalid && 'border-[#d03b3b] focus:border-[#d03b3b] focus:ring-[#d03b3b]',
        className,
      )}
      {...rest}
    />
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export function Select({ invalid, className, children, ...rest }: SelectProps) {
  return (
    <select
      className={cn(
        CONTROL,
        'h-8 cursor-pointer appearance-none bg-no-repeat pr-7',
        invalid && 'border-[#d03b3b]',
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5 6 7.5 9 4.5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
        backgroundPosition: 'right 8px center',
      }}
      {...rest}
    >
      {children}
    </select>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
  mono?: boolean
}

export function Textarea({ invalid, mono, className, ...rest }: TextareaProps) {
  return (
    <textarea
      className={cn(
        CONTROL,
        'py-2 leading-relaxed resize-y',
        mono && 'font-mono text-xs',
        invalid && 'border-[#d03b3b]',
        className,
      )}
      {...rest}
    />
  )
}
