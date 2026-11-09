import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TrainingAudio } from './TrainingAudio'
import { ActiveTimer } from './ActiveTimer'
import * as sessionCore from '../../core/session/session'
import { App } from '../../app/App'
import { createAppI18n } from '../../i18n'
import { PreferencesProvider } from '../../shared/preferences/PreferencesProvider'
import {
  loadPreferences,
  preferencesKey,
  type Language,
} from '../../shared/preferences/storage'

async function renderApp(language: Language = 'pt', route = '/') {
  const preferences = loadPreferences(language, localStorage)
  const i18n = await createAppI18n(preferences.language)
  return render(
    <I18nextProvider i18n={i18n}>
      <PreferencesProvider
        initialPreferences={preferences}
        initialSaved
        storage={localStorage}
      >
        <MemoryRouter initialEntries={[route]}>
          <App />
        </MemoryRouter>
      </PreferencesProvider>
    </I18nextProvider>,
  )
}

describe('training integration', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses touch keys to edit, retry and complete without the system keyboard', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    const play = vi.spyOn(TrainingAudio.prototype, 'play').mockResolvedValue()
    localStorage.setItem(
      preferencesKey,
      JSON.stringify({ version: 2, selectedPairIds: ['kana:し'] }),
    )
    const user = userEvent.setup()
    await renderApp()
    await user.click(screen.getByRole('button', { name: 'Iniciar treino' }))
    const field = screen.getByRole('textbox') as HTMLInputElement
    expect(field).toHaveAttribute('readonly')
    expect(field).toHaveAttribute('inputmode', 'none')
    const keyboard = () =>
      within(screen.getByRole('group', { name: 'Teclado de romaji' }))
    expect(keyboard().getAllByRole('button')).toHaveLength(28)
    expect(keyboard().getByRole('button', { name: 'Confirmar' })).toBeDisabled()
    await user.click(keyboard().getByRole('button', { name: 'x' }))
    await user.click(keyboard().getByRole('button', { name: 'Confirmar' }))
    expect(play).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toHaveTextContent('a leitura é shi')
    await user.click(keyboard().getByRole('button', { name: 's' }))
    await user.click(keyboard().getByRole('button', { name: 'x' }))
    await user.click(keyboard().getByRole('button', { name: 'Apagar' }))
    await user.click(keyboard().getByRole('button', { name: 'i' }))
    field.setSelectionRange(1, 1)
    await user.click(keyboard().getByRole('button', { name: 'h' }))
    expect(field).toHaveValue('shi')
    expect(field).toHaveFocus()
    expect(play).toHaveBeenCalledOnce() // Letters themselves are silent.
    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    expect(
      screen.queryByRole('group', { name: 'Teclado de romaji' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fechar ajustes' }))
    expect(field).toHaveValue('shi')
    expect(field).toHaveFocus()
    await user.click(keyboard().getByRole('button', { name: 'Confirmar' }))
    expect(
      screen.getByRole('heading', { name: 'Treino concluído.' }),
    ).toHaveFocus()
    expect(
      screen.queryByRole('group', { name: 'Teclado de romaji' }),
    ).not.toBeInTheDocument()
  })

  it('supports hardware keys and resizing while the touch field is read-only', async () => {
    let mobile = true
    const listeners = new Set<() => void>()
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return mobile
      },
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    }))
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    vi.spyOn(TrainingAudio.prototype, 'play').mockResolvedValue()
    localStorage.setItem(
      preferencesKey,
      JSON.stringify({ version: 2, selectedPairIds: ['kana:し'] }),
    )
    const user = userEvent.setup()
    await renderApp()
    await user.click(screen.getByRole('button', { name: 'Iniciar treino' }))
    const field = screen.getByRole('textbox') as HTMLInputElement
    await user.keyboard('shx{Backspace}i')
    expect(field).toHaveValue('shi')
    field.setSelectionRange(1, 2)
    await user.keyboard('{Delete}')
    expect(field).toHaveValue('si')
    act(() => {
      mobile = false
      listeners.forEach((fn) => fn())
    })
    expect(field).not.toHaveAttribute('readonly')
    expect(
      screen.queryByRole('group', { name: 'Teclado de romaji' }),
    ).not.toBeInTheDocument()
    act(() => {
      mobile = true
      listeners.forEach((fn) => fn())
    })
    expect(field).toHaveAttribute('readonly')
    expect(field).toHaveValue('si')
    await user.keyboard(' ')
    expect(
      screen.getByRole('heading', { name: 'Treino concluído.' }),
    ).toBeVisible()
  })

  it('routes typing from the page, strips pasted spaces and confirms with Space once', async () => {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    const play = vi.spyOn(TrainingAudio.prototype, 'play').mockResolvedValue()
    localStorage.setItem(
      preferencesKey,
      JSON.stringify({ version: 2, selectedPairIds: ['kana:し'] }),
    )
    const user = userEvent.setup()
    await renderApp()
    await user.click(screen.getByRole('button', { name: 'Iniciar treino' }))
    const field = screen.getByRole('textbox')
    screen.getByRole('main').focus()
    await user.keyboard('s')
    expect(field).toHaveFocus()
    expect(field).toHaveValue('s')
    await user.clear(field)
    await user.paste(' s h i ')
    expect(field).toHaveValue('shi')
    fireEvent.keyDown(field, { key: ' ', repeat: true })
    expect(play).not.toHaveBeenCalled()
    await user.keyboard(' ')
    expect(
      screen.getByRole('heading', { name: 'Treino concluído.' }),
    ).toBeVisible()
    expect(play).toHaveBeenCalledOnce()
  })

  it('accepts a mobile space insertion but does not submit composing input', async () => {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    const play = vi.spyOn(TrainingAudio.prototype, 'play').mockResolvedValue()
    localStorage.setItem(
      preferencesKey,
      JSON.stringify({ version: 2, selectedPairIds: ['kana:あ'] }),
    )
    await renderApp()
    await userEvent.click(
      screen.getByRole('button', { name: 'Iniciar treino' }),
    )
    const field = screen.getByRole('textbox')
    fireEvent.change(field, { target: { value: 'a' } })
    fireEvent(
      field,
      new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: ' ',
        inputType: 'insertText',
        isComposing: true,
      }),
    )
    expect(play).not.toHaveBeenCalled()
    fireEvent(
      field,
      new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: ' ',
        inputType: 'insertText',
      }),
    )
    expect(play).toHaveBeenCalledOnce()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('pauses for settings, keeps the answer and saves independent volumes', async () => {
    let clock = 0
    vi.spyOn(performance, 'now').mockImplementation(() => clock)
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    const submit = vi.spyOn(sessionCore, 'submitAnswer')
    const play = vi.spyOn(TrainingAudio.prototype, 'play').mockResolvedValue()
    localStorage.setItem(
      preferencesKey,
      JSON.stringify({ version: 2, selectedPairIds: ['kana:あ'] }),
    )
    const user = userEvent.setup()
    await renderApp()
    await user.click(screen.getByRole('button', { name: 'Iniciar treino' }))
    const field = screen.getByRole('textbox')
    await user.type(field, 'a')
    clock = 500
    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    expect(screen.getByRole('dialog', { name: 'Ajustes' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Fechar ajustes' })).toHaveFocus()
    fireEvent.keyDown(document.body, { key: 'x' })
    expect(field).toHaveValue('a')
    fireEvent.change(
      screen.getByRole('slider', { name: 'Volume — Efeitos de acerto e erro' }),
      { target: { value: '25' } },
    )
    fireEvent.change(
      screen.getByRole('slider', { name: 'Volume — Pronúncia dos kana' }),
      { target: { value: '0' } },
    )
    await user.click(screen.getByRole('button', { name: 'Ouvir erro' }))
    expect(play).toHaveBeenLastCalledWith(
      'hiragana:あ',
      false,
      'female',
      expect.objectContaining({ effectsVolume: 0.25, pronunciationVolume: 0 }),
      'effect',
    )
    expect(submit).not.toHaveBeenCalled()
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Idioma' }),
      'en',
    )
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeVisible()
    expect(field).toHaveValue('a')
    clock = 5500
    fireEvent(
      screen.getByRole('dialog'),
      new Event('cancel', { cancelable: true }),
    )
    expect(field).toHaveFocus()
    expect(field).toHaveValue('a')
    clock = 6000
    await user.keyboard('{Enter}')
    expect(submit).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ answer: 'a', activeTimeMs: 1000 }),
    )
    expect(loadPreferences('pt', localStorage)).toMatchObject({
      language: 'en',
      effectsVolume: 0.25,
      pronunciationVolume: 0,
    })
  })

  it('leaves browser shortcuts and other controls alone', async () => {
    localStorage.setItem(
      preferencesKey,
      JSON.stringify({ version: 2, selectedPairIds: ['kana:あ'] }),
    )
    await renderApp()
    await userEvent.click(
      screen.getByRole('button', { name: 'Iniciar treino' }),
    )
    screen.getByRole('main').focus()
    const shortcut = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    fireEvent(screen.getByRole('main'), shortcut)
    expect(shortcut.defaultPrevented).toBe(false)
    expect(screen.getByRole('textbox')).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    const language = screen.getByRole('combobox', { name: 'Idioma' })
    language.focus()
    fireEvent.keyDown(language, { key: 'e' })
    expect(language).toHaveFocus()
    expect(screen.getByRole('textbox')).toHaveValue('')
  })
  it('answers, retries an error, preserves focus and voice, completes and restarts', async () => {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    vi.spyOn(TrainingAudio.prototype, 'unlock').mockImplementation(() => {})
    const play = vi.spyOn(TrainingAudio.prototype, 'play').mockResolvedValue()
    const user = userEvent.setup()
    localStorage.setItem(
      preferencesKey,
      JSON.stringify({
        version: 2,
        language: 'pt',
        mode: 'hiragana',
        selectedPairIds: ['kana:し'],
      }),
    )
    await renderApp()
    await user.click(screen.getByRole('button', { name: 'Iniciar treino' }))
    const field = screen.getByRole('textbox', {
      name: 'Sua resposta em romaji',
    })
    expect(field).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(play).not.toHaveBeenCalled()
    await user.type(field, 'wrong{Enter}')
    expect(field).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent('a leitura é shi')
    expect(play).toHaveBeenLastCalledWith(
      'hiragana:し',
      false,
      'female',
      expect.objectContaining({
        effectsVolume: 0.75,
        pronunciationVolume: 0.8,
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Voz' }),
      'male',
    )
    expect(loadPreferences('pt', localStorage).voice).toBe('male')
    expect(play).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Fechar ajustes' }))
    await user.type(field, 'SI ')
    expect(
      screen.getByRole('heading', { name: 'Treino concluído.' }),
    ).toHaveFocus()
    expect(play).toHaveBeenLastCalledWith(
      'hiragana:し',
      true,
      'male',
      expect.objectContaining({ voice: 'male' }),
    )
    await user.click(screen.getByRole('button', { name: 'Treinar novamente' }))
    expect(screen.getByRole('textbox')).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    expect(screen.getByRole('combobox', { name: 'Voz' })).toHaveValue('male')
    expect(localStorage.getItem(preferencesKey)).not.toContain('attempts')
  })
  it('pauses time and cancels audio when hidden', async () => {
    let clock = 100
    const timer = new ActiveTimer(() => clock)
    timer.reset(true)
    clock = 600
    timer.pause()
    clock = 10000
    expect(timer.read()).toBe(500)
    timer.resume()
    clock = 10300
    expect(timer.read()).toBe(800)
    timer.reset(true)
    expect(timer.read()).toBe(0)
    localStorage.setItem(
      preferencesKey,
      JSON.stringify({ version: 2, selectedPairIds: ['kana:あ'] }),
    )
    const stop = vi.spyOn(TrainingAudio.prototype, 'stop')
    await renderApp()
    await userEvent.click(
      screen.getByRole('button', { name: 'Iniciar treino' }),
    )
    stop.mockClear()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(stop).toHaveBeenCalledOnce()
  })
})
