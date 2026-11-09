import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { SelectionSounds } from './selectionSounds'
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

describe('kana selection', () => {
  it('cancels feedback on script changes, page hiding and unmount', async () => {
    const stop = vi.spyOn(SelectionSounds.prototype, 'stop')
    const dispose = vi.spyOn(SelectionSounds.prototype, 'dispose')
    const user = userEvent.setup()
    const view = await renderApp()
    await user.click(
      screen.getByRole('checkbox', { name: 'Selecionar grupo Básicos' }),
    )
    stop.mockClear()
    await user.click(screen.getByRole('radio', { name: 'Katakana' }))
    expect(stop).toHaveBeenCalledOnce()
    stop.mockClear()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(stop).toHaveBeenCalledOnce()
    view.unmount()
    expect(dispose).toHaveBeenCalledOnce()
  })

  it('only sounds the changed pairs when completing a partial group', async () => {
    const play = vi
      .spyOn(SelectionSounds.prototype, 'play')
      .mockImplementation(() => {})
    const user = userEvent.setup()
    await renderApp()
    expect(play).not.toHaveBeenCalled()
    for (const name of ['あ (a), Hiragana', 'う (u), Hiragana']) {
      await user.click(screen.getByRole('button', { name }))
    }
    play.mockClear()
    await user.click(
      screen.getByRole('checkbox', { name: 'Selecionar grupo Básicos' }),
    )
    expect(play).toHaveBeenCalledExactlyOnceWith(true, [0, 45])
    expect(within(screen.getByRole('status')).getByText('46')).toBeVisible()
    expect(loadPreferences('pt', localStorage).selectedPairIds).toHaveLength(46)
  })

  it('uses one sound for a paired tile and accepts rapid reversals without losing focus', async () => {
    const play = vi
      .spyOn(SelectionSounds.prototype, 'play')
      .mockImplementation(() => {})
    const user = userEvent.setup()
    await renderApp()
    await user.click(screen.getByRole('radio', { name: 'Ambos' }))
    expect(play).not.toHaveBeenCalled()
    const pair = screen.getByRole('button', { name: 'あ / ア (a), Ambos' })
    pair.focus()
    await user.keyboard('  ')
    expect(play.mock.calls).toEqual([
      [false, [0]],
      [true, [0]],
    ])
    expect(pair).toHaveAttribute('aria-pressed', 'true')
    expect(pair).toHaveFocus()
    expect(within(screen.getByRole('status')).getByText('92')).toBeVisible()
  })

  it('starts with basics selected and supports individual, row and category controls', async () => {
    const user = userEvent.setup()
    await renderApp()
    expect(within(screen.getByRole('status')).getByText('46')).toBeVisible()
    const basic = screen.getByRole('checkbox', {
      name: 'Selecionar grupo Básicos',
    })
    expect(basic).toBeChecked()
    const a = screen.getByRole('button', { name: 'あ (a), Hiragana' })
    await user.click(a)
    expect(a).toHaveAttribute('aria-pressed', 'false')
    expect(basic).toBePartiallyChecked()
    expect(within(screen.getByRole('status')).getByText('45')).toBeVisible()
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Selecionar linha K de Hiragana — Básicos',
      }),
    )
    expect(within(screen.getByRole('status')).getByText('40')).toBeVisible()
    await user.click(
      screen.getByRole('checkbox', { name: 'Selecionar grupo Variações' }),
    )
    expect(within(screen.getByRole('status')).getByText('65')).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'が (ga), Hiragana' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('shares choices between modes, pairs both scripts in one tile and survives reloads', async () => {
    const user = userEvent.setup()
    const view = await renderApp()
    await user.click(screen.getByRole('button', { name: 'あ (a), Hiragana' }))
    await user.click(screen.getByRole('radio', { name: 'Katakana' }))
    expect(within(screen.getByRole('status')).getByText('45')).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'ア (a), Katakana' }),
    ).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: 'ア (a), Katakana' }))
    await user.click(screen.getByRole('radio', { name: 'Ambos' }))
    expect(within(screen.getByRole('status')).getByText('92')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'ア (a), Katakana' }),
    ).not.toBeInTheDocument()
    const pair = screen.getByRole('button', { name: 'あ / ア (a), Ambos' })
    expect(pair).toHaveAttribute('aria-pressed', 'true')
    await user.click(pair)
    expect(within(screen.getByRole('status')).getByText('90')).toBeVisible()
    view.unmount()
    await renderApp()
    expect(screen.getByRole('radio', { name: 'Ambos' })).toBeChecked()
    expect(
      screen.getByRole('button', { name: 'あ / ア (a), Ambos' }),
    ).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('radio', { name: 'Hiragana' }))
    expect(
      screen.getByRole('button', { name: 'あ (a), Hiragana' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('changes language without losing selection and updates the document language', async () => {
    const user = userEvent.setup()
    await renderApp()
    await user.click(screen.getByRole('button', { name: 'あ (a), Hiragana' }))
    expect(
      screen.queryByRole('combobox', { name: 'Idioma' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    expect(screen.getByRole('dialog', { name: 'Ajustes' })).toBeVisible()
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Idioma' }),
      'en',
    )
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeVisible()
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Voice' }),
      'male',
    )
    await user.click(screen.getByRole('button', { name: 'Close settings' }))
    expect(loadPreferences('pt', localStorage).voice).toBe('male')
    expect(
      await screen.findByRole('heading', { name: 'Choose your kana.' }),
    ).toBeVisible()
    expect(document.documentElement).toHaveAttribute('lang', 'en')
    expect(within(screen.getByRole('status')).getByText('45')).toBeVisible()
    expect(loadPreferences('pt-BR', localStorage).language).toBe('en')
  })

  it('allows an empty selection to remain empty and supports keyboard activation', async () => {
    const user = userEvent.setup()
    await renderApp()
    await user.click(
      screen.getByRole('checkbox', { name: 'Selecionar grupo Básicos' }),
    )
    expect(loadPreferences('pt-BR', localStorage).selectedPairIds).toEqual([])
    expect(
      screen.getByRole('button', { name: 'Iniciar treino' }),
    ).toBeDisabled()
    const a = screen.getByRole('button', { name: 'あ (a), Hiragana' })
    a.focus()
    await user.keyboard(' ')
    expect(a).toHaveFocus()
    expect(a).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Iniciar treino' })).toBeEnabled()
    expect(localStorage.getItem(preferencesKey)).not.toContain('attempts')
  })

  it('selects and clears shared pairs by row and group in both mode', async () => {
    const user = userEvent.setup()
    await renderApp()
    await user.click(screen.getByRole('radio', { name: 'Ambos' }))
    await user.click(
      screen.getByRole('checkbox', { name: 'Selecionar grupo Variações' }),
    )
    await user.click(
      screen.getByRole('checkbox', { name: 'Selecionar grupo Combinações' }),
    )
    expect(within(screen.getByRole('status')).getByText('208')).toBeVisible()
    expect(loadPreferences('pt', localStorage).selectedPairIds).toHaveLength(
      104,
    )
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Selecionar linha K de Ambos — Básicos',
      }),
    )
    expect(within(screen.getByRole('status')).getByText('198')).toBeVisible()
    expect(
      screen.getByRole('checkbox', { name: 'Selecionar grupo Básicos' }),
    ).toBePartiallyChecked()
    await user.click(
      screen.getByRole('checkbox', { name: 'Selecionar grupo Variações' }),
    )
    expect(within(screen.getByRole('status')).getByText('148')).toBeVisible()
    // A partially selected group is first completed, then cleared.
    await user.click(
      screen.getByRole('checkbox', { name: 'Selecionar grupo Básicos' }),
    )
    await user.click(
      screen.getByRole('checkbox', { name: 'Selecionar grupo Básicos' }),
    )
    await user.click(
      screen.getByRole('checkbox', { name: 'Selecionar grupo Combinações' }),
    )
    expect(loadPreferences('pt', localStorage).selectedPairIds).toEqual([])
    const pair = screen.getByRole('button', { name: 'あ / ア (a), Ambos' })
    pair.focus()
    await user.keyboard(' ')
    expect(pair).toHaveFocus()
    expect(within(screen.getByRole('status')).getByText('2')).toBeVisible()
  })

  it.each(['/training', '/results', '/unknown'])(
    'returns %s to selection when there is no session',
    async (route) => {
      await renderApp('en', route)
      await waitFor(() =>
        expect(
          screen.getByRole('heading', { name: 'Choose your kana.' }),
        ).toBeVisible(),
      )
    },
  )
})
