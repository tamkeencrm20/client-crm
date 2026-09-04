import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar.json';
import en from './en.json';

export const LOCALES = {
  ar: { label: 'العربية', dir: 'rtl' },
  en: { label: 'English', dir: 'ltr' },
};

const STORAGE_KEY = 'tamkeen.locale';

export const readLocale = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved && LOCALES[saved] ? saved : 'ar';
};

/**
 * Direction lives on <html>, so Tailwind's logical utilities (ms-, pe-, start-)
 * flip for the whole tree without a single conditional in a component.
 */
export function applyLocale(locale) {
  const { dir } = LOCALES[locale] ?? LOCALES.ar;
  document.documentElement.lang = locale;
  document.documentElement.dir = dir;
  localStorage.setItem(STORAGE_KEY, locale);
}

i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: readLocale(),
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
});

applyLocale(readLocale());

export default i18n;
