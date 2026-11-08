import { useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

export function TouchKeyboard({
  onLetter,
  onDelete,
  onConfirm,
  hasAnswer,
}: {
  onLetter: (letter: string) => void
  onDelete: () => void
  onConfirm: () => void
  hasAnswer: boolean
}) {
  const { t } = useTranslation()
  const keyboard = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = keyboard.current!
    const page = element.closest('main')!
    const measure = () =>
      page.style.setProperty(
        '--training-keyboard-height',
        `${element.getBoundingClientRect().height}px`,
      )
    measure()
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(measure)
    observer?.observe(element)
    return () => {
      observer?.disconnect()
      page.style.removeProperty('--training-keyboard-height')
    }
  }, [])
  return (
    <div
      ref={keyboard}
      className="touch-keyboard"
      role="group"
      aria-label={t('training.keyboard')}
    >
      <div className="touch-keyboard-keys">
        {rows.map((row, index) => (
          <div
            className={`touch-keyboard-row touch-keyboard-row-${index}`}
            key={row}
          >
            {Array.from(row, (letter) => (
              <button
                type="button"
                key={letter}
                className="touch-key"
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => onLetter(letter)}
              >
                {letter}
              </button>
            ))}
            {index === 2 && (
              <>
                <button
                  type="button"
                  className="touch-key touch-key-action"
                  aria-label={t('training.erase')}
                  disabled={!hasAnswer}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={onDelete}
                >
                  ⌫
                </button>
                <button
                  type="button"
                  className="touch-key touch-key-action touch-key-confirm"
                  aria-label={t('training.submit')}
                  disabled={!hasAnswer}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={onConfirm}
                >
                  ↵
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
