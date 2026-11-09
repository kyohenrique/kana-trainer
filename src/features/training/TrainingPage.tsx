import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { getCurrentOccurrence } from '../../core/session/session'
import { chooseRetryIndex } from '../../core/session/ordering'
import { usePreferences } from '../../shared/preferences/context'
import { useTraining } from './context'
import { ActiveTimer } from './ActiveTimer'
import { TrainingAudio } from './TrainingAudio'
import { useAnswerKeyboard } from './useAnswerKeyboard'
import { TouchKeyboard } from './TouchKeyboard'
import { useTouchKeyboard } from './useTouchKeyboard'
import { Icon } from '../../shared/ui/Icon'

export function TrainingPage({ settingsOpen }: { settingsOpen: boolean }) {
  const { t } = useTranslation()
  const { session, answer, start, clear } = useTraining()
  const { preferences, saved } = usePreferences()
  const [text, setText] = useState('')
  const [audio] = useState(() => new TrainingAudio())
  const [timer] = useState(() => new ActiveTimer())
  const input = useRef<HTMLInputElement>(null)
  const done = useRef<HTMLHeadingElement>(null)
  const played = useRef<string | null>(null)
  const touchKeyboard = useTouchKeyboard()
  const caret = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (caret.current === null) return
    input.current?.setSelectionRange(caret.current, caret.current)
    caret.current = null
  }, [text])
  function editAnswer(
    value: string,
    erase: 'backward' | 'forward' | null = null,
  ) {
    const field = input.current
    if (!field) return
    let begin = field.selectionStart ?? field.value.length
    let end = field.selectionEnd ?? begin
    if (erase && begin === end) {
      if (erase === 'backward') begin = Math.max(0, begin - 1)
      else end = Math.min(field.value.length, end + 1)
    }
    caret.current = begin + value.length
    setText(field.value.slice(0, begin) + value + field.value.slice(end))
    field.focus({ preventScroll: true })
  }
  const current = session ? getCurrentOccurrence(session) : undefined
  const latest = session?.attempts.at(-1)
  useAnswerKeyboard(input, !!current && !settingsOpen, setText)
  useLayoutEffect(() => {
    timer.reset(!document.hidden && !!current)
    if (current) input.current?.focus()
    else done.current?.focus()
  }, [current, timer])
  useLayoutEffect(() => {
    if (settingsOpen) {
      timer.pause()
      audio.stop()
    } else if (current && !document.hidden) {
      timer.resume()
      input.current?.focus({ preventScroll: true })
    } else if (!current) done.current?.focus()
  }, [settingsOpen, current, timer, audio])
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) {
        timer.pause()
        audio.stop()
      } else if (current && !settingsOpen) timer.resume()
    }
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [audio, current, timer, settingsOpen])
  useEffect(
    () => () => {
      timer.pause()
      audio.dispose()
    },
    [audio, timer],
  )
  useEffect(() => {
    if (!latest || played.current === latest.occurrence.id) return
    played.current = latest.occurrence.id
    if (!document.hidden && !settingsOpen)
      void audio.play(
        latest.occurrence.kana.id,
        latest.correct,
        preferences.voice,
        preferences,
      )
  }, [latest, audio, preferences, settingsOpen])
  if (!session) return <Navigate to="/" replace />
  const position = session.attempts.length
  const history = new Map(
    session.attempts.map((attempt) => [attempt.occurrence.id, attempt]),
  )
  return (
    <main
      id="main-content"
      tabIndex={-1}
      data-keyboard={touchKeyboard && !!current ? 'true' : undefined}
      className="training-page mx-auto max-w-[1000px] px-5 outline-none sm:px-8"
    >
      <div className="training-toolbar">
        <Link
          className="training-control training-toolbar-action"
          to="/"
          onClick={() => {
            audio.stop()
            clear()
          }}
        >
          <Icon name="arrow" className="size-4 rotate-180" />
          {t('training.back')}
        </Link>
      </div>
      {!saved && (
        <p role="alert" className="mt-2 text-xs text-coral">
          {t('selection.notSaved')}
        </p>
      )}
      {current ? (
        <div className="training-stage">
          <h1 className="sr-only">{t('training.title')}</h1>
          <p className="training-tagline">{t('app.tagline')}</p>
          <div className="training-window" aria-hidden="true">
            <div className="training-track">
              {session.sequence
                .slice(Math.max(0, position - 3), position + 7)
                .map((occurrence, index) => {
                  const offset = Math.max(0, position - 3) + index - position
                  const attempt = history.get(occurrence.id)
                  return (
                    <div
                      key={occurrence.id}
                      data-compound={
                        occurrence.kana.glyph.length > 1 ? 'true' : undefined
                      }
                      className={`training-kana ${offset === 0 ? 'is-current' : ''} ${attempt ? (attempt.correct ? 'is-correct' : 'is-wrong') : ''}`}
                      style={{
                        transform: `translateX(calc(${offset} * var(--kana-step)))`,
                      }}
                    >
                      {attempt && !attempt.correct && (
                        <span className="training-reading">
                          {occurrence.kana.reading}
                        </span>
                      )}
                      <span className="training-glyph" lang="ja">
                        {occurrence.kana.glyph}
                      </span>
                      {attempt && (
                        <span className="training-mark">
                          {attempt.correct ? '✓' : '×'}
                        </span>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
          <form
            className="training-answer"
            onSubmit={(event) => {
              event.preventDefault()
              if (!text.trim() || document.hidden || settingsOpen) return
              audio.unlock()
              answer({
                occurrenceId: current.id,
                answer: text,
                activeTimeMs: timer.read(),
                retryIndex: chooseRetryIndex(
                  session.sequence.length - position - 1,
                  Math.random(),
                ),
              })
              setText('')
              input.current?.focus()
            }}
          >
            <label htmlFor="romaji" className="sr-only">
              {t('training.answer')}
            </label>
            <p className="sr-only" id="current-kana">
              {t('training.current', { kana: current.kana.glyph })}
            </p>
            <div
              className="training-answer-field"
              data-submit={!touchKeyboard ? 'true' : undefined}
            >
              <input
                ref={input}
                id="romaji"
                value={text}
                readOnly={touchKeyboard}
                inputMode={touchKeyboard ? 'none' : 'text'}
                onChange={(event) => {
                  const native = event.nativeEvent as InputEvent
                  setText(event.target.value.replace(/\s/g, ''))
                  if (
                    native.inputType === 'insertText' &&
                    native.data === ' ' &&
                    !native.isComposing
                  )
                    event.currentTarget.form?.requestSubmit()
                }}
                onPaste={(event) => {
                  event.preventDefault()
                  const field = event.currentTarget
                  const value = event.clipboardData
                    .getData('text')
                    .replace(/\s/g, '')
                  const begin = field.selectionStart ?? text.length
                  const end = field.selectionEnd ?? begin
                  setText(text.slice(0, begin) + value + text.slice(end))
                }}
                onKeyDown={(event) => {
                  if (event.ctrlKey || event.metaKey || event.altKey) return
                  if (event.nativeEvent.isComposing || event.keyCode === 229)
                    return
                  // A read-only mobile field suppresses the system keyboard;
                  // hardware keyboards still edit through these same actions.
                  if (touchKeyboard && /^[a-z]$/i.test(event.key)) {
                    event.preventDefault()
                    editAnswer(event.key)
                    return
                  }
                  if (
                    touchKeyboard &&
                    (event.key === 'Backspace' || event.key === 'Delete')
                  ) {
                    event.preventDefault()
                    editAnswer(
                      '',
                      event.key === 'Backspace' ? 'backward' : 'forward',
                    )
                    return
                  }
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  if (
                    event.repeat ||
                    event.nativeEvent.isComposing ||
                    event.keyCode === 229
                  )
                    return
                  event.currentTarget.form?.requestSubmit()
                }}
                aria-describedby="current-kana answer-hint"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                placeholder={t('training.answer')}
                className="min-h-14 min-w-0 w-full bg-transparent px-3 text-center text-lg outline-none"
              />
              {!touchKeyboard && (
                <button
                  type="submit"
                  aria-label={t('training.submit')}
                  className="training-control training-submit text-hiragana"
                >
                  <Icon name="arrow" className="size-5" />
                </button>
              )}
            </div>
            <p id="answer-hint" className="training-hint">
              {t(touchKeyboard ? 'training.touchHint' : 'training.hint')}
            </p>
          </form>
          {touchKeyboard && !settingsOpen && (
            <TouchKeyboard
              onLetter={(letter) => editAnswer(letter)}
              onDelete={() => editAnswer('', 'backward')}
              onConfirm={() => input.current?.form?.requestSubmit()}
              hasAnswer={text.length > 0}
            />
          )}
        </div>
      ) : (
        <div className="py-16 text-center">
          <h1 ref={done} tabIndex={-1} className="text-2xl outline-none">
            {t('training.done')}
          </h1>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              className="training-control border border-line-strong text-hiragana"
              onClick={() => {
                audio.stop()
                setText('')
                start(session.initialKana)
              }}
            >
              {t('training.again')}
            </button>
            <Link
              className="training-control text-muted"
              to="/"
              onClick={clear}
            >
              {t('training.back')}
            </Link>
          </div>
        </div>
      )}
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {latest
          ? t(latest.correct ? 'training.correct' : 'training.incorrect', {
              kana: latest.occurrence.kana.glyph,
              reading: latest.occurrence.kana.reading,
            })
          : ''}
      </p>
    </main>
  )
}
