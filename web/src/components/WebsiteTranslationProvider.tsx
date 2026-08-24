"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { siteConfig } from "@/config/site";

type TranslationStatus = "idle" | "loading" | "ready" | "failed";

type WebsiteTranslationContextValue = {
  language: string;
  status: TranslationStatus;
  changeLanguage: (language: string) => void;
};

type AttributeName = "alt" | "aria-label" | "placeholder" | "title";

type AttributeTarget = {
  element: Element;
  name: AttributeName;
};

type TranslationTargets = {
  attributes: AttributeTarget[];
  textNodes: Text[];
};

const WebsiteTranslationContext =
  createContext<WebsiteTranslationContextValue | null>(null);

const STORAGE_KEY = "staref-website-language";
const LEGACY_STORAGE_KEY = "sdarm-website-language";
const CACHE_PREFIX = "staref-website-translations-v1";
const TRANSLATION_ENDPOINT =
  "https://translate.googleapis.com/translate_a/single";
const BATCH_SEPARATOR = "\n<<<STAREF_SPLIT_7F3A>>>\n";
const BATCH_CHARACTER_LIMIT = 2_400;
const BATCH_ITEM_LIMIT = 18;
const ATTRIBUTE_NAMES: AttributeName[] = [
  "alt",
  "aria-label",
  "placeholder",
  "title",
];
const SKIPPED_ELEMENTS = new Set([
  "CODE",
  "NOSCRIPT",
  "PRE",
  "SCRIPT",
  "STYLE",
  "TEXTAREA",
]);

function shouldSkipElement(element: Element | null): boolean {
  if (!element) return true;

  return (
    SKIPPED_ELEMENTS.has(element.tagName) ||
    Boolean(element.closest('[translate="no"], .notranslate'))
  );
}

function translatableValue(value: string): string | null {
  const trimmed = value.trim();

  if (
    trimmed.length < 2 ||
    /^[\d\s.,:;+\-–—/()%€$£¥₣'"]+$/.test(trimmed) ||
    /^(?:https?:\/\/|mailto:|tel:|www\.)/i.test(trimmed)
  ) {
    return null;
  }

  return trimmed;
}

function splitIntoBatches(values: string[]): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let currentLength = 0;

  values.forEach((value) => {
    const addedLength =
      value.length + (current.length ? BATCH_SEPARATOR.length : 0);

    if (
      current.length > 0 &&
      (current.length >= BATCH_ITEM_LIMIT ||
        currentLength + addedLength > BATCH_CHARACTER_LIMIT)
    ) {
      batches.push(current);
      current = [];
      currentLength = 0;
    }

    current.push(value);
    currentLength +=
      value.length + (current.length > 1 ? BATCH_SEPARATOR.length : 0);
  });

  if (current.length) batches.push(current);
  return batches;
}

function parseTranslationResponse(data: unknown): string {
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error("Unexpected translation response.");
  }

  return data[0]
    .map((segment) =>
      Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : "",
    )
    .join("");
}

async function requestTranslation(
  values: string[],
  language: string,
): Promise<string[]> {
  const parameters = new URLSearchParams({
    client: "gtx",
    sl: siteConfig.defaultLanguage,
    tl: language,
    dt: "t",
    q: values.join(BATCH_SEPARATOR),
  });
  const response = await fetch(`${TRANSLATION_ENDPOINT}?${parameters}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Translation request failed (${response.status}).`);
  }

  const translated = parseTranslationResponse(await response.json());
  const results = translated.split(BATCH_SEPARATOR).map((value) => value.trim());

  if (results.length !== values.length || results.some((value) => !value)) {
    if (values.length === 1) {
      throw new Error("Translation response was incomplete.");
    }

    const fallbackResults = await Promise.all(
      values.map((value) => requestTranslation([value], language)),
    );
    return fallbackResults.flat();
  }

  return results;
}

function readCachedTranslations(language: string): Map<string, string> {
  try {
    const cached = window.localStorage.getItem(`${CACHE_PREFIX}-${language}`);
    if (!cached) return new Map();

    const entries = JSON.parse(cached) as unknown;
    if (!Array.isArray(entries)) return new Map();

    return new Map(
      entries.filter(
        (entry): entry is [string, string] =>
          Array.isArray(entry) &&
          typeof entry[0] === "string" &&
          typeof entry[1] === "string",
      ),
    );
  } catch {
    return new Map();
  }
}

function writeCachedTranslations(
  language: string,
  cache: Map<string, string>,
) {
  try {
    const entries = [...cache.entries()].slice(-800);
    window.localStorage.setItem(
      `${CACHE_PREFIX}-${language}`,
      JSON.stringify(entries),
    );
  } catch {
    // Translation still works when local storage is unavailable.
  }
}

function preserveSpacing(original: string, translated: string): string {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

export function WebsiteTranslationProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const languages = useMemo(
    () => siteConfig.languages.filter((language) => language.enabled),
    [],
  );
  const [language, setLanguage] = useState(siteConfig.defaultLanguage);
  const [status, setStatus] = useState<TranslationStatus>("idle");
  const originalText = useRef(new WeakMap<Text, string>());
  const translatedText = useRef(new WeakMap<Text, string>());
  const trackedTextNodes = useRef(new Set<Text>());
  const originalAttributes = useRef(
    new WeakMap<Element, Map<AttributeName, string>>(),
  );
  const translatedAttributes = useRef(
    new WeakMap<Element, Map<AttributeName, string>>(),
  );
  const trackedElements = useRef(new Set<Element>());
  const translationRun = useRef(0);

  const restoreOriginalContent = useCallback(() => {
    trackedTextNodes.current.forEach((node) => {
      const original = originalText.current.get(node);
      if (original !== undefined && node.isConnected) node.nodeValue = original;
    });

    trackedElements.current.forEach((element) => {
      const attributes = originalAttributes.current.get(element);
      if (!attributes || !element.isConnected) return;

      attributes.forEach((value, name) => element.setAttribute(name, value));
    });
  }, []);

  const collectTargets = useCallback(() => {
    const targets = new Map<string, TranslationTargets>();
    const root = document.body;

    const addTextNode = (node: Text) => {
      if (shouldSkipElement(node.parentElement)) return;

      const lastTranslation = translatedText.current.get(node);
      if (
        !originalText.current.has(node) ||
        (lastTranslation !== undefined && node.nodeValue !== lastTranslation)
      ) {
        originalText.current.set(node, node.nodeValue ?? "");
      }

      trackedTextNodes.current.add(node);
      const original = originalText.current.get(node) ?? "";
      const value = translatableValue(original);
      if (!value) return;

      const entry = targets.get(value) ?? { attributes: [], textNodes: [] };
      entry.textNodes.push(node);
      targets.set(value, entry);
    };

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let currentNode = walker.nextNode();
    while (currentNode) {
      addTextNode(currentNode as Text);
      currentNode = walker.nextNode();
    }

    root.querySelectorAll("*").forEach((element) => {
      if (shouldSkipElement(element)) return;

      ATTRIBUTE_NAMES.forEach((name) => {
        const currentValue = element.getAttribute(name);
        if (!currentValue) return;

        let originals = originalAttributes.current.get(element);
        const lastTranslations = translatedAttributes.current.get(element);
        const lastTranslation = lastTranslations?.get(name);

        if (
          !originals?.has(name) ||
          (lastTranslation !== undefined && currentValue !== lastTranslation)
        ) {
          originals ??= new Map();
          originals.set(name, currentValue);
          originalAttributes.current.set(element, originals);
        }

        trackedElements.current.add(element);
        const original = originals.get(name) ?? currentValue;
        const value = translatableValue(original);
        if (!value) return;

        const entry = targets.get(value) ?? { attributes: [], textNodes: [] };
        entry.attributes.push({ element, name });
        targets.set(value, entry);
      });
    });

    return targets;
  }, []);

  const translateDocument = useCallback(
    async (targetLanguage: string, runId: number) => {
      const targets = collectTargets();
      const cache = readCachedTranslations(targetLanguage);
      const missing = [...targets.keys()].filter((value) => !cache.has(value));
      const batches = splitIntoBatches(missing);

      const batchResults = await Promise.all(
        batches.map((batch) => requestTranslation(batch, targetLanguage)),
      );

      if (translationRun.current !== runId) return;

      batches.forEach((batch, batchIndex) => {
        batch.forEach((value, index) => {
          cache.set(value, batchResults[batchIndex][index]);
        });
      });
      writeCachedTranslations(targetLanguage, cache);

      if (translationRun.current !== runId) return;

      targets.forEach((target, original) => {
        const translated = cache.get(original);
        if (!translated) return;

        target.textNodes.forEach((node) => {
          const source = originalText.current.get(node);
          if (source === undefined || !node.isConnected) return;

          const value = preserveSpacing(source, translated);
          if (node.nodeValue !== value) node.nodeValue = value;
          translatedText.current.set(node, value);
        });

        target.attributes.forEach(({ element, name }) => {
          const source = originalAttributes.current.get(element)?.get(name);
          if (source === undefined || !element.isConnected) return;

          const value = preserveSpacing(source, translated);
          if (element.getAttribute(name) !== value) {
            element.setAttribute(name, value);
          }

          const translations =
            translatedAttributes.current.get(element) ??
            new Map<AttributeName, string>();
          translations.set(name, value);
          translatedAttributes.current.set(element, translations);
        });
      });
    },
    [collectTargets],
  );

  useEffect(() => {
    const stored =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);

    if (!stored || !languages.some((item) => item.code === stored)) return;

    window.localStorage.setItem(STORAGE_KEY, stored);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);

    const timeout = window.setTimeout(() => {
      setStatus(
        stored === siteConfig.defaultLanguage ? "idle" : "loading",
      );
      setLanguage(stored);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [languages]);

  useEffect(() => {
    const runId = ++translationRun.current;
    document.documentElement.lang = language;

    if (language === siteConfig.defaultLanguage) {
      restoreOriginalContent();
      return;
    }

    window.queueMicrotask(() => {
      if (translationRun.current === runId) setStatus("loading");
    });
    let mutationTimer: number | undefined;
    const observer = new MutationObserver(() => {
      window.clearTimeout(mutationTimer);
      mutationTimer = window.setTimeout(() => {
        if (translationRun.current !== runId) return;

        void translateDocument(language, runId).catch(() => {
          if (translationRun.current === runId) setStatus("failed");
        });
      }, 120);
    });

    void translateDocument(language, runId)
      .then(() => {
        if (translationRun.current !== runId) return;
        setStatus("ready");
        observer.observe(document.body, {
          attributes: true,
          attributeFilter: ATTRIBUTE_NAMES,
          characterData: true,
          childList: true,
          subtree: true,
        });
      })
      .catch(() => {
        if (translationRun.current === runId) setStatus("failed");
      });

    return () => {
      observer.disconnect();
      window.clearTimeout(mutationTimer);
    };
  }, [language, pathname, restoreOriginalContent, translateDocument]);

  const changeLanguage = useCallback(
    (nextLanguage: string) => {
      if (!languages.some((item) => item.code === nextLanguage)) return;

      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
      setStatus(
        nextLanguage === siteConfig.defaultLanguage ? "idle" : "loading",
      );
      setLanguage(nextLanguage);
    },
    [languages],
  );

  const value = useMemo(
    () => ({ language, status, changeLanguage }),
    [changeLanguage, language, status],
  );

  return (
    <WebsiteTranslationContext.Provider value={value}>
      {children}
    </WebsiteTranslationContext.Provider>
  );
}

export function useWebsiteTranslation(): WebsiteTranslationContextValue {
  const context = useContext(WebsiteTranslationContext);

  if (!context) {
    throw new Error(
      "useWebsiteTranslation must be used inside WebsiteTranslationProvider.",
    );
  }

  return context;
}
