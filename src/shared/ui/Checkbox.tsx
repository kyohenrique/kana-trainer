import { useEffect, useRef } from 'react'
import { Icon } from './Icon'

interface Props {
  checked: boolean | 'mixed'
  label: string
  onChange: (checked: boolean) => void
}

export function Checkbox({ checked, label, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (input.current) input.current.indeterminate = checked === 'mixed'
  }, [checked])

  return (
    <span className="relative inline-flex size-6 shrink-0 items-center justify-center">
      <input
        ref={input}
        type="checkbox"
        checked={checked === true}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
        className="peer absolute inset-0 size-6 cursor-pointer appearance-none rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none size-4 rounded-[3px] border border-line-strong peer-checked:border-[var(--selection-color)] peer-checked:bg-[var(--selection-color)] peer-indeterminate:border-[var(--selection-color)] peer-indeterminate:bg-[var(--selection-color)] peer-hover:border-ink/70"
      />
      {checked !== false && (
        <Icon
          name={checked === 'mixed' ? 'minus' : 'check'}
          className="pointer-events-none absolute size-3 text-mocha"
        />
      )}
    </span>
  )
}
