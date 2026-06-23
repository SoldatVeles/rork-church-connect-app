import { Check, ChevronDown, Globe } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n, {
  normalizeLanguageCode,
  setAppLanguage,
  supportedLanguages,
  type AppLanguage,
} from '@/lib/i18n';

type LanguageSelectorProps = {
  variant?: 'light' | 'dark';
};

export default function LanguageSelector({ variant = 'light' }: LanguageSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = useMemo(() => {
    const code = normalizeLanguageCode(i18n.language);
    return supportedLanguages.find((language) => language.code === code) ?? supportedLanguages[0];
  }, [i18n.language]);

  const isDark = variant === 'dark';

  const handleSelectLanguage = async (language: AppLanguage) => {
    await setAppLanguage(language);
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, isDark ? styles.darkButton : styles.lightButton]}
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('common.selectLanguage')}
      >
        <Globe size={16} color={isDark ? 'white' : '#1e293b'} />
        <Text style={[styles.buttonText, isDark ? styles.darkButtonText : styles.lightButtonText]}>
          {currentLanguage.nativeName}
        </Text>
        <ChevronDown size={16} color={isDark ? 'white' : '#1e293b'} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('common.selectLanguage')}</Text>

            {supportedLanguages.map((language) => {
              const isSelected = language.code === currentLanguage.code;

              return (
                <TouchableOpacity
                  key={language.code}
                  style={[styles.languageRow, isSelected && styles.languageRowSelected]}
                  onPress={() => handleSelectLanguage(language.code)}
                >
                  <Text style={[styles.languageText, isSelected && styles.languageTextSelected]}>
                    {language.nativeName}
                  </Text>

                  {isSelected && <Check size={18} color="#1e3a8a" />}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsOpen(false)}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lightButton: {
    backgroundColor: '#f1f5f9',
  },
  darkButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  lightButtonText: {
    color: '#1e293b',
  },
  darkButtonText: {
    color: 'white',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
  },
  languageRow: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageRowSelected: {
    backgroundColor: '#eff6ff',
  },
  languageText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '600',
  },
  languageTextSelected: {
    color: '#1e3a8a',
  },
  cancelButton: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
  },
});