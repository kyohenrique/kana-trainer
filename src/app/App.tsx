import { useEffect } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router'
import { useTranslation } from 'react-i18next'
import coffeeCup from '../assets/coffee-cup.svg'
import { SelectionPage } from '../features/selection/SelectionPage'
import { usePreferences } from '../shared/preferences/context'
import { Icon } from '../shared/ui/Icon'

export function App() {
  const { t } = useTranslation()
  const { preferences, setLanguage } = usePreferences()
  useEffect(() => {
    document.documentElement.lang =
      preferences.language === 'pt' ? 'pt-BR' : 'en'
    document.title = t('app.title')
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t('app.description'))
  }, [preferences.language, t])

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
        <div className="relative shrink-0">
          <label htmlFor="language" className="sr-only">
            {t('app.language')}
          </label>
          <select
            id="language"
            value={preferences.language}
            onChange={(event) => {
              const language = event.target.value
              if (language === 'pt' || language === 'en') setLanguage(language)
            }}
            className="min-h-10 cursor-pointer appearance-none rounded-sm bg-mocha py-2 pl-2 pr-6 text-xs text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <option value="pt" lang="pt-BR">
              Português
            </option>
            <option value="en" lang="en">
              English
            </option>
          </select>
          <Icon
            name="chevron"
            className="pointer-events-none absolute right-1 top-1/2 size-3 -translate-y-1/2 text-muted"
          />
        </div>
      </header>
      <Routes>
        <Route path="/" element={<SelectionPage />} />
        {/* Until a session exists, direct links return to the selection screen. */}
        <Route path="/training" element={<Navigate to="/" replace />} />
        <Route path="/results" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
