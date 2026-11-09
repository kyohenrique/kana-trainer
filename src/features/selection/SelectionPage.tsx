import { useNavigate } from 'react-router'
import { useTraining } from '../training/context'
import { useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  categories,
  selectedKana,
  type ScriptMode,
} from '../../core/kana/catalog'
import { usePreferences } from '../../shared/preferences/context'
import { KanaGroup } from './KanaGroup'
import { useSelectionFeedback } from './useSelectionFeedback'

const modes: readonly ScriptMode[] = ['hiragana', 'katakana', 'both']

export function SelectionPage({ settingsOpen }: { settingsOpen: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { start } = useTraining()
  const { preferences, setMode, saved } = usePreferences()
  const { feedback, changeSelection, cancelFeedback } =
    useSelectionFeedback(settingsOpen)
  const footer = useRef<HTMLElement>(null)
  const count = selectedKana(
    preferences.selectedPairIds,
    preferences.mode,
  ).length

  useLayoutEffect(() => {
    const element = footer.current
    if (!element) return
    const root = document.documentElement
    // Reserve the actual bar height, including wrapped messages and safe areas.
    const measure = () =>
      root.style.setProperty(
        '--selection-footer-height',
        `${element.getBoundingClientRect().height}px`,
      )
    measure()
    let measurementFrame: number | undefined
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(() => {
            if (measurementFrame !== undefined)
              cancelAnimationFrame(measurementFrame)
            // Updating the reserved space can change scrollbar width and wrap
            // the footer again. Measure outside the observer's current cycle.
            measurementFrame = requestAnimationFrame(() => {
              measurementFrame = undefined
              measure()
            })
          })
    observer?.observe(element)
    return () => {
      observer?.disconnect()
      if (measurementFrame !== undefined) cancelAnimationFrame(measurementFrame)
      root.style.removeProperty('--selection-footer-height')
    }
  }, [])

  return (
    <main
      id="main-content"
      tabIndex={-1}
      data-mode={preferences.mode}
      className="mx-auto max-w-[1000px] px-5 pb-[calc(var(--selection-footer-height,6rem)+1.5rem)] pt-5 outline-none [--selection-color:var(--color-hiragana)] data-[mode=katakana]:[--selection-color:var(--color-katakana)] sm:px-8 sm:pt-4"
    >
      <h1 className="sr-only">{t('selection.title')}</h1>
      <div className="mb-7">
        <p className="mb-2 text-xs leading-relaxed text-muted">
          {t('app.tagline')}
        </p>
        <fieldset>
          <legend className="sr-only">{t('selection.writing')}</legend>
          <div className="flex items-center gap-5 sm:gap-7">
            {modes.map((mode) => (
              <label
                key={mode}
                className="group flex min-h-11 cursor-pointer items-center gap-2"
              >
                <input
                  type="radio"
                  name="script"
                  value={mode}
                  checked={preferences.mode === mode}
                  onChange={() => {
                    cancelFeedback()
                    setMode(mode)
                  }}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="relative size-3 shrink-0 rounded-full border border-muted/60 peer-checked:border-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ink"
                >
                  {preferences.mode === mode && (
                    <span
                      className={`absolute inset-[2px] rounded-full ${mode === 'katakana' ? 'bg-katakana' : 'bg-hiragana'}`}
                    />
                  )}
                </span>
                <span
                  className={`text-sm text-muted transition-colors group-hover:text-ink motion-reduce:transition-none ${mode === 'katakana' ? 'peer-checked:text-katakana' : 'peer-checked:text-hiragana'}`}
                >
                  {t(`selection.${mode}`)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="grid items-start gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-9">
        {categories.map((category) => (
          <KanaGroup
            key={category}
            category={category}
            feedback={feedback}
            onSelectionChange={changeSelection}
          />
        ))}
      </div>

      <footer
        ref={footer}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-mocha pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid max-w-[1000px] grid-cols-2 items-center gap-x-4 gap-y-2 px-5 py-3 sm:grid-cols-[1fr_auto] sm:px-8 sm:py-4">
          <p role="status" aria-live="polite" className="text-sm text-muted">
            <span className="font-medium tabular-nums text-ink">{count}</span>{' '}
            {t('selection.selected', { count })}
          </p>
          <button
            type="button"
            disabled={count === 0}
            onClick={() => {
              cancelFeedback()
              start(selectedKana(preferences.selectedPairIds, preferences.mode))
              navigate('/training')
            }}
            className={`min-h-11 cursor-pointer rounded-md border border-transparent bg-hiragana px-3 py-2 text-xs font-medium text-mocha transition-colors enabled:hover:bg-ink enabled:active:bg-hiragana/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hiragana disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-transparent disabled:text-muted motion-reduce:transition-none sm:px-5 sm:text-sm ${count === 0 ? 'sm:row-span-2' : ''}`}
          >
            {t('training.start')}
          </button>
          {count === 0 && (
            <p className="col-span-2 text-xs text-muted sm:col-span-1">
              {t('selection.empty')}
            </p>
          )}
          {!saved && (
            <p role="alert" className="col-span-2 text-xs text-coral">
              {t('selection.notSaved')}
            </p>
          )}
        </div>
      </footer>
    </main>
  )
}
