import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import coffeeCup from '../assets/coffee-cup.svg'
import { TrainingPage } from '../features/training/TrainingPage'
import { TrainingProvider } from '../features/training/TrainingProvider'
import { SelectionPage } from '../features/selection/SelectionPage'
import { usePreferences } from '../shared/preferences/context'
import { Icon } from '../shared/ui/Icon'
import { SettingsDialog } from '../features/settings/SettingsDialog'

export function App() {
  const { t } = useTranslation()
  const location = useLocation()
  const { preferences } = usePreferences()
  const [settingsOpen, setSettingsOpen] = useState(false)
  useEffect(() => {
    document.documentElement.lang =
      preferences.language === 'pt' ? 'pt-BR' : 'en'
    document.title = t(
      location.pathname === '/training' ? 'training.pageTitle' : 'app.title',
    )
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t('app.description'))
  }, [preferences.language, t, location.pathname])

  return (
    <>
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-md bg-ink px-4 py-3 text-sm font-medium text-mocha focus:translate-y-0"
      >
        {t('app.skip')}
      </a>
      <header className="mx-auto flex min-h-20 max-w-[1000px] items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          to="/"
          aria-label={t('app.home')}
          title={t('app.home')}
          className="flex size-16 shrink-0 items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <img
            src={coffeeCup}
            width={64}
            height={64}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="size-16 select-none"
          />
        </Link>
        <button
          type="button"
          className="training-control training-toolbar-action shrink-0 text-xs text-muted"
          aria-haspopup="dialog"
          onClick={() => setSettingsOpen(true)}
        >
          <Icon name="sliders" className="size-4" />
          {t('settings.settings')}
        </button>
      </header>
      <TrainingProvider>
        <Routes>
          <Route
            path="/"
            element={<SelectionPage settingsOpen={settingsOpen} />}
          />

          <Route
            path="/training"
            element={<TrainingPage settingsOpen={settingsOpen} />}
          />
          <Route path="/results" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TrainingProvider>
      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} />
      )}
    </>
  )
}
