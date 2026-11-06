import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { KanaPair, ScriptMode } from '../../core/kana/catalog'
import { selectionTransitionMs } from './feedbackPlan'

interface Props {
  pair: KanaPair
  mode: ScriptMode
  selected: boolean
  feedbackRevision: number
  feedbackDelay: number | undefined
  onToggle: () => void
}

export function KanaTile({
  pair,
  mode,
  selected,
  feedbackRevision,
  feedbackDelay,
  onToggle,
}: Props) {
  const { t } = useTranslation()
  const kana = mode === 'katakana' ? pair.katakana : pair.hiragana
  const label = t('selection.kana', {
    glyph:
      mode === 'both'
        ? `${pair.hiragana.glyph} / ${pair.katakana.glyph}`
        : kana.glyph,
    reading: kana.reading,
    script: t(`selection.${mode}`),
  })

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      title={label}
      onClick={onToggle}
      className="group relative h-11 min-w-0 cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-offset-5 focus-visible:outline-ink"
    >
      <span
        key={feedbackDelay === undefined ? 'idle' : feedbackRevision}
        className="kana-feedback relative block h-full"
        data-feedback={
          feedbackDelay === undefined
            ? undefined
            : selected
              ? 'select'
              : 'deselect'
        }
        style={
          {
            '--kana-feedback-delay': `${feedbackDelay ?? 0}ms`,
            '--kana-feedback-duration': `${selectionTransitionMs}ms`,
          } as CSSProperties
        }
      >
        {mode === 'both' && (
          <span
            aria-hidden="true"
            className="kana-layer kana-back absolute inset-0 translate-x-1 translate-y-1 rounded-md border border-line-strong bg-mocha group-aria-pressed:border-katakana group-aria-pressed:bg-katakana"
          />
        )}
        <span
          aria-hidden="true"
          lang="ja"
          className={`kana-layer relative flex h-full items-center justify-center rounded-md border border-line-strong bg-mocha font-kana leading-none text-muted transition-colors group-hover:border-ink/70 group-hover:text-ink group-aria-pressed:border-[var(--selection-color)] group-aria-pressed:bg-[var(--selection-color)] group-aria-pressed:text-mocha motion-reduce:transition-none ${pair.category === 'combinations' ? 'text-xl' : 'text-[25px]'}`}
        >
          {kana.glyph}
        </span>
      </span>
    </button>
  )
}
