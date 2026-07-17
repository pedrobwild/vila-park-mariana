import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import pt from "./locales/pt.json";
import en from "./locales/en.json";

export const SUPPORTED_LANGUAGES = ["pt", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
    },
    fallbackLng: "pt",
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    nonExplicitSupportedLngs: true, // pt-BR -> pt, en-US -> en
    load: "languageOnly",
    interpolation: { escapeValue: false },
    detection: {
      // Only honor an explicit user choice from localStorage; otherwise use
      // fallbackLng (pt) so the site loads in PT-BR by default regardless of
      // the browser locale. The EN toggle still persists via localStorage.
      order: ["localStorage"],
      lookupLocalStorage: "bwild_lang",
      caches: ["localStorage"],
    },
    returnNull: false,
  });

// Keep <html lang="..."> in sync
if (typeof document !== "undefined") {
  const setHtmlLang = (lng: string) => {
    document.documentElement.lang = lng.startsWith("en") ? "en" : "pt-BR";
  };
  setHtmlLang(i18n.language || "pt");
  i18n.on("languageChanged", setHtmlLang);
}

export default i18n;
