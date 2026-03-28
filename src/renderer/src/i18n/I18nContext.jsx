import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import labelsData from './labels.json';

const I18nContext = createContext(null);

// All unique LANG codes found in labels.json
const ALL_LANGS = [...new Set(labelsData.map((e) => e.LANG))];

// Build lookup: { hu: { 'splash.subtitle': 'PostgreSQL …', … }, … }
const LABEL_MAP = labelsData.reduce((map, entry) => {
  if (!map[entry.LANG]) map[entry.LANG] = {};
  map[entry.LANG][entry.CAPTION] = entry.TEXT;
  return map;
}, {});

const PREFS_KEY = 'app_lang';
const DEFAULT_LANG = 'en';

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);

  // Load persisted language on startup
  useEffect(() => {
    window.yumbosql.prefsGet(PREFS_KEY).then((saved) => {
      if (saved && LABEL_MAP[saved]) {
        setLangState(saved);
      }
    });
  }, []);

  const setLang = (newLang) => {
    window.yumbosql.prefsSet(PREFS_KEY, newLang);
    setLangState(newLang);
  };

  const t = useMemo(() => {
    const dict = LABEL_MAP[lang] || LABEL_MAP[DEFAULT_LANG] || {};
    return (caption) => dict[caption] ?? caption;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, langs: ALL_LANGS, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
