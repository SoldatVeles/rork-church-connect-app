"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { siteConfig } from "@/config/site";

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement: new (
          options: {
            pageLanguage: string;
            includedLanguages: string;
            autoDisplay: boolean;
          },
          elementId: string,
        ) => unknown;
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

const STORAGE_KEY = "sdarm-website-language";
const SCRIPT_ID = "google-translate-element-script";
const ELEMENT_ID = "google-translate-element";
const LANGUAGE_NAMES: Record<string, string> = {
  de: "Deutsch",
  fr: "Français",
  en: "English",
  es: "Español",
  pt: "Português",
  it: "Italiano",
};

function clearTranslationCookie() {
  document.cookie = "googtrans=; Max-Age=0; path=/";
  document.cookie = `googtrans=; Max-Age=0; path=/; domain=${window.location.hostname}`;
}

function findTranslateSelect(): HTMLSelectElement | null {
  return document.querySelector<HTMLSelectElement>(".goog-te-combo");
}

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
  const [language, setLanguage] = useState(siteConfig.defaultLanguage);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored || !languages.some((item) => item.code === stored)) return;

    const timeout = window.setTimeout(() => setLanguage(stored), 0);
    return () => window.clearTimeout(timeout);
  }, [languages]);

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

  useEffect(() => {
    if (language === "de") return;

    const initialize = () => {
      if (!window.google?.translate?.TranslateElement) return;

      const host = document.getElementById(ELEMENT_ID);
      if (host && !host.hasChildNodes()) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "de",
            includedLanguages: languages.map((item) => item.code).join(","),
            autoDisplay: false,
          },
          ELEMENT_ID,
        );
      }

      setReady(true);
    };

    window.googleTranslateElementInit = initialize;

    if (window.google?.translate?.TranslateElement) {
      initialize();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", initialize, { once: true });
      return () => existing.removeEventListener("load", initialize);
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    script.onerror = () => setFailed(true);
    document.head.appendChild(script);
  }, [language, languages]);

  useEffect(() => {
    if (!ready || language === "de") return;

    let attempts = 0;
    const applyLanguage = () => {
      const select = findTranslateSelect();
      if (select) {
        select.value = language;
        select.dispatchEvent(new Event("change"));
        return;
      }

      attempts += 1;
      if (attempts < 20) window.setTimeout(applyLanguage, 150);
      else setFailed(true);
    };

    applyLanguage();
  }, [language, ready]);

  const changeLanguage = (nextLanguage: string) => {
    setOpen(false);
    if (nextLanguage === language) return;

    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    setFailed(false);

    if (nextLanguage === "de") {
      clearTranslationCookie();
      window.location.reload();
      return;
    }

    setLanguage(nextLanguage);
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
                onClick={() => changeLanguage(item.code)}
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

      {failed ? (
        <p className="mt-1 text-[0.68rem] font-semibold text-red-700">
          Automatische Übersetzung konnte nicht geladen werden.
        </p>
      ) : null}

      <div
        id={ELEMENT_ID}
        className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
        aria-hidden="true"
      />
    </div>
  );
}
