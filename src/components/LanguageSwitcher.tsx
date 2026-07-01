"use client";

import { LOCALES, type Locale } from "@/lib/i18n";
import { useI18n } from "./LanguageProvider";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 p-0.5 shadow-sm backdrop-blur">
      {LOCALES.map((l: Locale) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase transition ${
            locale === l ? "bg-brand text-white bg-blue-700" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
