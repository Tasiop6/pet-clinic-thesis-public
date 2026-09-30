import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import type { SupportedLanguage } from "../i18n";
import "./LanguageToggle.css";

const flagPerLanguage: Record<SupportedLanguage, string> = {
  el: "🇬🇷",
  en: "🇬🇧",
};

const labelPerLanguage: Record<SupportedLanguage, string> = {
  el: "EL",
  en: "EN",
};

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation("common");

  const { nextLanguage, flag, badge } = useMemo(() => {
    const next: SupportedLanguage = language === "el" ? "en" : "el";
    return {
      nextLanguage: next,
      flag: flagPerLanguage[next],
      badge: labelPerLanguage[next],
    };
  }, [language]);

  const announcement =
    language === "el"
      ? t("language.english")
      : t("language.greek");

  return (
    <button
      type="button"
      className="language-toggle"
      onClick={() => setLanguage(nextLanguage)}
      aria-label={`${t("language.toggleLabel")} — ${announcement}`}
      title={`${t("language.toggleLabel")} — ${announcement}`}
    >
      <span aria-hidden="true" className="language-toggle__flag">
        {flag}
      </span>
      <span aria-hidden="true" className="language-toggle__label">
        {badge}
      </span>
    </button>
  );
}
