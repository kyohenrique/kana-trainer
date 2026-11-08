import {
  useEffect,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react'

export function useAnswerKeyboard(
  input: RefObject<HTMLInputElement | null>,
  enabled: boolean,
  setText: Dispatch<SetStateAction<string>>,
) {
  useEffect(() => {
    if (!enabled) return
    const field = input.current
    if (!field) return
    const keydown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        document.hidden ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return
      const target = event.target
      if (
        target instanceof Element &&
        target.closest(
          'input, textarea, select, button, a, [contenteditable], [role="dialog"]',
        )
      )
        return
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        field.focus()
        if (!event.repeat) field.form?.requestSubmit()
      } else if (event.key.length === 1 && !/\s/.test(event.key)) {
        event.preventDefault()
        const start = field.selectionStart ?? field.value.length
        const end = field.selectionEnd ?? start
        field.focus()
        setText((value) => value.slice(0, start) + event.key + value.slice(end))
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        field.focus()
        setText((value) => value.slice(0, -1))
      }
    }
    // Mobile keyboards may insert a space without dispatching keydown.
    const beforeInput = (event: InputEvent) => {
      if (
        event.data === ' ' &&
        event.inputType === 'insertText' &&
        !event.isComposing &&
        event.cancelable
      ) {
        event.preventDefault()
        field.form?.requestSubmit()
      }
    }
    document.addEventListener('keydown', keydown)
    field.addEventListener('beforeinput', beforeInput)
    return () => {
      document.removeEventListener('keydown', keydown)
      field.removeEventListener('beforeinput', beforeInput)
    }
  }, [enabled, input, setText])
}
