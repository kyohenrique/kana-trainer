import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { usePreferences } from '../../shared/preferences/context'
import type { TrainingAudio } from './TrainingAudio'

export function TrainingSettings({
  audio,
  onClose,
}: {
  audio: TrainingAudio
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { preferences, setVoice, setVolume, saved } = usePreferences()
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      aria-labelledby="settings-title"
      aria-describedby="settings-description"
      className="training-settings"
      onCancel={(event) => {
        event.preventDefault()
        dialog.current?.close()
      }}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose()
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="settings-title" className="text-lg font-medium">
          {t('settings.settings')}
        </h2>
        <button
          autoFocus
          type="button"
          className="training-control text-muted"
          aria-label={t('settings.close')}
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </div>
      <p
        id="settings-description"
        className="mt-1 text-xs leading-relaxed text-muted"
      >
        {t('settings.paused')}
      </p>
      <fieldset className="mt-7">
        <legend className="mb-3 text-sm">{t('settings.pronunciation')}</legend>
        <label className="flex items-center justify-between gap-4 text-sm text-muted">
          {t('training.voice')}
          <select
            className="training-control bg-mocha text-ink"
            value={preferences.voice}
            onChange={(event) => {
              audio.stop()
              setVoice(event.target.value === 'male' ? 'male' : 'female')
            }}
          >
            <option value="female">{t('training.female')}</option>
            <option value="male">{t('training.male')}</option>
          </select>
        </label>
        <label
          className="mt-3 block text-xs text-muted"
          htmlFor="pronunciation-volume"
        >
          {t('settings.volume')} — {t('settings.pronunciation')}
        </label>
        <div className="flex items-center gap-4">
          <input
            id="pronunciation-volume"
            className="min-h-11 min-w-0 flex-1 accent-hiragana"
            type="range"
            min="0"
            max="100"
            step="5"
            value={Math.round(preferences.pronunciationVolume * 100)}
            onChange={(event) => {
              audio.stop()
              setVolume('pronunciationVolume', Number(event.target.value) / 100)
            }}
          />
          <output
            htmlFor="pronunciation-volume"
            className="w-10 text-right text-xs tabular-nums text-muted"
          >
            {Math.round(preferences.pronunciationVolume * 100)}%
          </output>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="training-control border border-line text-xs"
            onClick={() =>
              void audio.play(
                'hiragana:あ',
                true,
                preferences.voice,
                preferences,
                'pronunciation',
              )
            }
          >
            {t('settings.tryVoice')}
          </button>
          <span className="text-xs text-muted">{t('settings.example')}</span>
        </div>
      </fieldset>
      <fieldset className="mt-6 border-t border-line pt-5">
        <legend className="text-sm">{t('settings.effects')}</legend>
        <label className="block text-xs text-muted" htmlFor="effects-volume">
          {t('settings.volume')} — {t('settings.effects')}
        </label>
        <div className="flex items-center gap-4">
          <input
            id="effects-volume"
            className="min-h-11 min-w-0 flex-1 accent-hiragana"
            type="range"
            min="0"
            max="100"
            step="5"
            value={Math.round(preferences.effectsVolume * 100)}
            onChange={(event) => {
              audio.stop()
              setVolume('effectsVolume', Number(event.target.value) / 100)
            }}
          />
          <output
            htmlFor="effects-volume"
            className="w-10 text-right text-xs tabular-nums text-muted"
          >
            {Math.round(preferences.effectsVolume * 100)}%
          </output>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="training-control border border-line text-xs"
            onClick={() =>
              void audio.play(
                'hiragana:あ',
                true,
                preferences.voice,
                preferences,
                'effect',
              )
            }
          >
            {t('settings.tryCorrect')}
          </button>
          <button
            className="training-control border border-line text-xs"
            onClick={() =>
              void audio.play(
                'hiragana:あ',
                false,
                preferences.voice,
                preferences,
                'effect',
              )
            }
          >
            {t('settings.tryWrong')}
          </button>
        </div>
      </fieldset>
      {!saved && (
        <p role="alert" className="mt-5 text-xs text-coral">
          {t('selection.notSaved')}
        </p>
      )}
    </dialog>
  )
}
