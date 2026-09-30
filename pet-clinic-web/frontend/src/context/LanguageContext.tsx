import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { I18nextProvider } from "react-i18next";
import i18n, {
  DEFAULT_LOCALE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "../i18n";

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (locale: SupportedLanguage) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LOCALE,
  setLanguage: () => undefined,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) ?? DEFAULT_LOCALE,
  );

  useEffect(() => {
    const applyDocumentLang = (locale: SupportedLanguage) => {
      if (typeof document === "undefined") {
        return;
      }
      document.documentElement.lang = locale;
      document.documentElement.dir = "ltr";
    };

    const handleLanguageChange = (lng: string) => {
      const next = SUPPORTED_LANGUAGES.includes(lng as SupportedLanguage)
        ? (lng as SupportedLanguage)
        : DEFAULT_LOCALE;
      setLanguage(next);
      applyDocumentLang(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
      }
    };

    applyDocumentLang(language);
    i18n.on("languageChanged", handleLanguageChange);

    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY && event.newValue) {
        const next = SUPPORTED_LANGUAGES.includes(event.newValue as SupportedLanguage)
          ? (event.newValue as SupportedLanguage)
          : DEFAULT_LOCALE;
        if (next !== i18n.language) {
          void i18n.changeLanguage(next);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleSetLanguage = useCallback((locale: SupportedLanguage) => {
    if (locale !== i18n.language) {
      void i18n.changeLanguage(locale);
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: handleSetLanguage,
    }),
    [handleSetLanguage, language],
  );

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
    </I18nextProvider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => useContext(LanguageContext);
