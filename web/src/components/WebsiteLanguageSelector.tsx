"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { siteConfig } from "@/config/site";
import { useWebsiteTranslation } from "@/components/WebsiteTranslationProvider";

const LANGUAGE_NAMES: Record<string, string> = {
  de: "Deutsch",
  fr: "Français",
  en: "English",
  es: "Español",
  pt: "Português",
  it: "Italiano",
};

type WebsiteLanguageSelectorProps = {
  mobile?: boolean;
};

export function WebsiteLanguageSelector({
  mobile = false,
}: WebsiteLanguageSelectorProps) {
  const languages = useMemo(
    () => siteConfig.languages.filter((language) => language.enabled),
    [],
  );
  const { language, status, changeLanguage } = useWebsiteTranslation();
  const [open, setOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!selectorRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const selectLanguage = (nextLanguage: string) => {
    setOpen(false);
    if (nextLanguage !== language) changeLanguage(nextLanguage);
  };

  return (
    <div
      ref={selectorRef}
      className={`notranslate relative ${mobile ? "w-full" : "flex-none"}`}
      translate="no"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center border border-[#e5dfd0] bg-white font-extrabold text-[#0b2341] shadow-sm transition hover:border-[#b9c9ad] focus:outline-none focus:ring-2 focus:ring-[#dce8d5] ${
          mobile
            ? "min-h-12 w-full rounded-xl px-4 text-sm"
            : "min-h-10 rounded-xl px-3 text-xs"
        }`}
        aria-label="Sprache auswählen – automatische Übersetzung"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-busy={status === "loading"}
      >
        <span className="tracking-[0.12em]">{language.toUpperCase()}</span>
        <ChevronDown
          size={mobile ? 17 : 14}
          className={`ml-auto flex-none text-[#526174] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Sprache auswählen"
          className={`absolute top-[calc(100%+0.45rem)] z-[90] overflow-hidden rounded-2xl border border-[#e5dfd0] bg-white p-1.5 shadow-[0_18px_45px_rgba(11,35,65,0.18)] ${
            mobile ? "left-0 right-0" : "right-0 min-w-44"
          }`}
        >
          {languages.map((item) => {
            const selected = item.code === language;
            return (
              <button
                key={item.code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => selectLanguage(item.code)}
                className={`flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-bold transition ${
                  selected
                    ? "bg-[#eef5ea] text-[#234f30]"
                    : "text-[#0b2341] hover:bg-[#f8f5ed]"
                }`}
              >
                <span>{LANGUAGE_NAMES[item.code] ?? item.label}</span>
                {selected ? (
                  <Check size={15} className="ml-auto text-[#496b3f]" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {status === "failed" ? (
        <p className="absolute right-0 top-[calc(100%+0.45rem)] z-[95] w-56 max-w-[calc(100vw-1rem)] rounded-xl border border-red-200 bg-white px-3 py-2 text-[0.68rem] font-semibold text-red-700 shadow-lg">
          Automatische Übersetzung konnte nicht geladen werden.
        </p>
      ) : null}
    </div>
  );
}
