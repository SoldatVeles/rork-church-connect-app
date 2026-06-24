import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en';
import de from '@/locales/de';
import es from '@/locales/es';
import pt from '@/locales/pt';
import rm from '@/locales/rm';
import pl from '@/locales/pl';
import fr from '@/locales/fr';
import it from '@/locales/it';
import ru from '@/locales/ru';
import uk from '@/locales/uk';

export const LANGUAGE_STORAGE_KEY = 'church-app-language';

export const supportedLanguages = [
  { code: 'en', nativeName: 'English' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'es', nativeName: 'Español' },
  { code: 'pt', nativeName: 'Português' },
  { code: 'rm', nativeName: 'Rumantsch' },
  { code: 'pl', nativeName: 'Polski' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'uk', nativeName: 'Українська' },
] as const;

export type AppLanguage = typeof supportedLanguages[number]['code'];

const resources = {
  en: { translation: en },
  de: { translation: de },
  es: { translation: es },
  pt: { translation: pt },
  rm: { translation: rm },
  pl: { translation: pl },
  fr: { translation: fr },
  it: { translation: it },
  ru: { translation: ru },
  uk: { translation: uk },
};

export const isSupportedLanguage = (value: string | null | undefined): value is AppLanguage => {
  return supportedLanguages.some((language) => language.code === value);
};

export const normalizeLanguageCode = (value: string | null | undefined): AppLanguage => {
  if (!value) return 'en';

  const lowerValue = value.toLowerCase();

  if (lowerValue.startsWith('de')) return 'de';
  if (lowerValue.startsWith('es')) return 'es';
  if (lowerValue.startsWith('pt')) return 'pt';
  if (lowerValue.startsWith('rm')) return 'rm';
  if (lowerValue.startsWith('pl')) return 'pl';
  if (lowerValue.startsWith('fr')) return 'fr';
  if (lowerValue.startsWith('it')) return 'it';
  if (lowerValue.startsWith('ru')) return 'ru';
  if (lowerValue.startsWith('uk')) return 'uk';
  if (lowerValue.startsWith('ua')) return 'uk';

  return 'en';
};

const deviceLanguage = normalizeLanguageCode(
  Localization.getLocales()[0]?.languageTag ??
    Localization.getLocales()[0]?.languageCode ??
    'en'
);

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: deviceLanguage,
    fallbackLng: 'en',
    supportedLngs: supportedLanguages.map((language) => language.code),
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export const loadStoredLanguage = async () => {
  const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (isSupportedLanguage(storedLanguage)) {
    await i18n.changeLanguage(storedLanguage);
  }
};

export const setAppLanguage = async (language: AppLanguage) => {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  await i18n.changeLanguage(language);
};

void loadStoredLanguage();

export default i18n;