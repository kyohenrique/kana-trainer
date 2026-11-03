import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { I18nextProvider } from 'react-i18next'
import { App } from './app/App'
import { createAppI18n } from './i18n'
import { PreferencesProvider } from './shared/preferences/PreferencesProvider'
import {
  browserStorage,
  loadPreferences,
  savePreferences,
} from './shared/preferences/storage'
import './app/styles.css'

async function bootstrap() {
  const storage = browserStorage()
  const preferences = loadPreferences(navigator.language, storage)
  const saved = savePreferences(preferences, storage)
  const i18n = await createAppI18n(preferences.language)
  const container = document.getElementById('root')
  if (!container) throw new Error('Missing application root')

  createRoot(container).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <PreferencesProvider
          initialPreferences={preferences}
          initialSaved={saved}
          storage={storage}
        >
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </PreferencesProvider>
      </I18nextProvider>
    </StrictMode>,
  )
}

void bootstrap()
