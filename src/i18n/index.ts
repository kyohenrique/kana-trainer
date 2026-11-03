import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Language } from '../shared/preferences/storage'
import { en } from './en'
import { pt } from './pt'

export async function createAppI18n(language: Language) {
  const instance = createInstance()
  await instance.use(initReactI18next).init({
    resources: { pt: { translation: pt }, en: { translation: en } },
    lng: language,
    fallbackLng: 'en',
    supportedLngs: ['pt', 'en'],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })
  return instance
}
