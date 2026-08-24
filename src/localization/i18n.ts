import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { resources } from './locales';

/**
 * i18next setup. Device locale is detected via expo-localization; English is the
 * seed/fallback. Locales live in `./locales` (one JSON per language, mirroring
 * en.json) and are registered in `./locales/index.ts` — add a language there.
 * The persisted user choice (settings.language) is applied on startup in App.tsx.
 */
export { resources };

const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';

void i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage in resources ? deviceLanguage : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;
