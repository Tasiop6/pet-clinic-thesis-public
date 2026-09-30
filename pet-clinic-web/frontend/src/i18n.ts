import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import elCommon from "./locales/el/common.json";
import enCommon from "./locales/en/common.json";
import elNavigation from "./locales/el/navigation.json";
import enNavigation from "./locales/en/navigation.json";
import elDashboard from "./locales/el/dashboard.json";
import enDashboard from "./locales/en/dashboard.json";
import elOwnerDetail from "./locales/el/ownerDetail.json";
import enOwnerDetail from "./locales/en/ownerDetail.json";
import elAppointments from "./locales/el/appointments.json";
import enAppointments from "./locales/en/appointments.json";
import elAdmin from "./locales/el/admin.json";
import enAdmin from "./locales/en/admin.json";
import elOwners from "./locales/el/owners.json";
import enOwners from "./locales/en/owners.json";
import elVets from "./locales/el/vets.json";
import enVets from "./locales/en/vets.json";
import elLanding from "./locales/el/landing.json";
import enLanding from "./locales/en/landing.json";

export const DEFAULT_LOCALE = "el";
export const SUPPORTED_LANGUAGES = ["el", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const LANGUAGE_STORAGE_KEY = "petclinic.language";

const resources = {
  el: {
    common: elCommon,
    navigation: elNavigation,
    dashboard: elDashboard,
    ownerDetail: elOwnerDetail,
    appointments: elAppointments,
    admin: elAdmin,
    owners: elOwners,
    vets: elVets,
    landing: elLanding,
  },
  en: {
    common: enCommon,
    navigation: enNavigation,
    dashboard: enDashboard,
    ownerDetail: enOwnerDetail,
    appointments: enAppointments,
    admin: enAdmin,
    owners: enOwners,
    vets: enVets,
    landing: enLanding,
  },
} as const;

const ensureDefaultLanguage = () => {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }
  const persisted = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (persisted && SUPPORTED_LANGUAGES.includes(persisted as SupportedLanguage)) {
    return persisted as SupportedLanguage;
  }
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, DEFAULT_LOCALE);
  return DEFAULT_LOCALE;
};

const initialLanguage = ensureDefaultLanguage();

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    lng: initialLanguage,
    supportedLngs: SUPPORTED_LANGUAGES,
    defaultNS: "common",
    ns: ["common", "navigation", "dashboard", "ownerDetail", "appointments", "admin", "owners", "vets", "landing"],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
      convertDetectedLanguage: (lng: string) =>
        SUPPORTED_LANGUAGES.includes(lng as SupportedLanguage) ? lng : DEFAULT_LOCALE,
    },
    returnNull: false,
  });

export default i18n;
