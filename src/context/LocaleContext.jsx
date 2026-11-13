import { createContext, useContext, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { applyLocale, readLocale, LOCALES } from '../i18n/index.js';

const LocaleContext = createContext(null);

/**
 * Owns the AR/EN switch. Direction is set on <html> rather than tracked in
 * React state, so Tailwind's logical utilities handle the mirroring and no
 * component needs an `isRtl` branch.
 */
export function LocaleProvider({ children }) {
  const { i18n } = useTranslation();
  const [locale, setLocaleState] = useState(readLocale);

  const setLocale = useCallback(
    (next) => {
      if (!LOCALES[next]) return;
      i18n.changeLanguage(next);
      applyLocale(next);
      setLocaleState(next);
    },
    [i18n],
  );

  const value = useMemo(
    () => ({ locale, setLocale, dir: LOCALES[locale].dir, isRtl: LOCALES[locale].dir === 'rtl' }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider');
  return ctx;
}
