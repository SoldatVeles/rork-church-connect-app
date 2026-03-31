import { StyleSheet, ViewStyle } from 'react-native';

export const DS = {
  colors: {
    primary: '#1e3a8a',
    primaryLight: '#3b82f6',
    primaryBg: '#eff6ff',
    primaryBorder: '#bfdbfe',

    background: '#f8fafc',
    surface: '#ffffff',
    surfaceSecondary: '#f1f5f9',

    text: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#64748b',
    textMuted: '#94a3b8',

    border: '#e2e8f0',
    borderLight: '#f1f5f9',

    success: '#10b981',
    successBg: '#d1fae5',
    successText: '#065f46',

    warning: '#f59e0b',
    warningBg: '#fef3c7',
    warningText: '#92400e',

    danger: '#ef4444',
    dangerBg: '#fee2e2',
    dangerText: '#991b1b',
    dangerBorder: '#fecaca',

    info: '#3b82f6',
    infoBg: '#eff6ff',

    purple: '#8b5cf6',
    purpleBg: '#e0e7ff',
    purpleText: '#3730a3',

    dark: '#0f172a',
    darkSecondary: '#1e3a5f',
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },

  font: {
    xs: 10,
    sm: 12,
    md: 13,
    base: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    title: 22,
    hero: 28,
  },

  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    } as ViewStyle,
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    } as ViewStyle,
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    } as ViewStyle,
  },
} as const;

export const dsStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },

  card: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.radius.lg,
    padding: DS.spacing.xl,
    ...DS.shadow.md,
  },

  cardCompact: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.radius.md,
    padding: DS.spacing.lg,
    ...DS.shadow.sm,
  },

  sectionTitle: {
    fontSize: DS.font.xl,
    fontWeight: '700' as const,
    color: DS.colors.text,
    marginBottom: DS.spacing.lg,
  },

  sectionTitleSmall: {
    fontSize: DS.font.lg,
    fontWeight: '700' as const,
    color: DS.colors.text,
    marginBottom: DS.spacing.md,
  },

  screenHeader: {
    backgroundColor: DS.colors.surface,
    paddingHorizontal: DS.spacing.xxl,
    paddingTop: DS.spacing.lg,
    paddingBottom: DS.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.border,
  },

  screenHeaderRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: DS.spacing.lg,
  },

  screenTitle: {
    fontSize: DS.font.title,
    fontWeight: '700' as const,
    color: DS.colors.text,
  },

  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  primaryButton: {
    backgroundColor: DS.colors.primary,
    borderRadius: DS.radius.md,
    paddingVertical: DS.spacing.md,
    paddingHorizontal: DS.spacing.xl,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: 8,
  },

  primaryButtonText: {
    fontSize: DS.font.base,
    fontWeight: '600' as const,
    color: '#ffffff',
  },

  secondaryButton: {
    backgroundColor: DS.colors.surfaceSecondary,
    borderRadius: DS.radius.md,
    paddingVertical: DS.spacing.md,
    paddingHorizontal: DS.spacing.xl,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: 8,
  },

  secondaryButtonText: {
    fontSize: DS.font.base,
    fontWeight: '600' as const,
    color: DS.colors.textSecondary,
  },

  dangerButton: {
    backgroundColor: DS.colors.danger,
    borderRadius: DS.radius.md,
    paddingVertical: DS.spacing.md,
    paddingHorizontal: DS.spacing.xl,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: 8,
  },

  dangerButtonText: {
    fontSize: DS.font.base,
    fontWeight: '600' as const,
    color: '#ffffff',
  },

  outlineButton: {
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.radius.md,
    paddingVertical: DS.spacing.md,
    paddingHorizontal: DS.spacing.xl,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: 8,
  },

  outlineButtonText: {
    fontSize: DS.font.base,
    fontWeight: '600' as const,
    color: DS.colors.textSecondary,
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  badgeText: {
    fontSize: DS.font.sm,
    fontWeight: '600' as const,
  },

  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
    paddingHorizontal: 32,
  },

  emptyStateTitle: {
    fontSize: DS.font.xl,
    fontWeight: '600' as const,
    color: '#334155',
    marginTop: DS.spacing.lg,
    textAlign: 'center' as const,
  },

  emptyStateText: {
    fontSize: DS.font.base,
    color: DS.colors.textMuted,
    marginTop: DS.spacing.sm,
    textAlign: 'center' as const,
    lineHeight: 20,
  },

  loadingState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
  },

  loadingText: {
    fontSize: DS.font.base,
    color: DS.colors.textTertiary,
    marginTop: DS.spacing.md,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },

  modalContainer: {
    backgroundColor: DS.colors.surface,
    borderTopLeftRadius: DS.radius.xl + 4,
    borderTopRightRadius: DS.radius.xl + 4,
    paddingHorizontal: DS.spacing.xxl,
    paddingTop: DS.spacing.md,
    paddingBottom: 34,
    maxHeight: '80%' as any,
  },

  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center' as const,
    marginBottom: DS.spacing.lg,
  },

  modalTitle: {
    fontSize: DS.font.xl,
    fontWeight: '700' as const,
    color: DS.colors.text,
    marginBottom: DS.spacing.sm,
  },

  formModalContainer: {
    flex: 1,
    backgroundColor: DS.colors.surface,
  },

  formModalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: DS.spacing.xxl,
    paddingVertical: DS.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.border,
  },

  formModalCancelText: {
    fontSize: DS.font.lg,
    color: DS.colors.textTertiary,
  },

  formModalTitle: {
    fontSize: DS.font.xl,
    fontWeight: '600' as const,
    color: DS.colors.text,
  },

  formModalSubmitText: {
    fontSize: DS.font.lg,
    fontWeight: '600' as const,
    color: DS.colors.primary,
  },

  formModalSubmitDisabled: {
    color: DS.colors.textMuted,
  },

  formContent: {
    flex: 1,
    padding: DS.spacing.xxl,
  },

  inputGroup: {
    marginBottom: DS.spacing.xxl,
  },

  inputLabel: {
    fontSize: DS.font.lg,
    fontWeight: '600' as const,
    color: DS.colors.text,
    marginBottom: DS.spacing.sm,
  },

  textInput: {
    backgroundColor: DS.colors.background,
    borderRadius: DS.radius.md,
    paddingHorizontal: DS.spacing.lg,
    paddingVertical: DS.spacing.md,
    fontSize: DS.font.lg,
    color: DS.colors.text,
    borderWidth: 1,
    borderColor: DS.colors.border,
  },

  textArea: {
    height: 120,
    textAlignVertical: 'top' as const,
  },

  spacer: {
    height: 40,
  },

  scrollContent: {
    padding: DS.spacing.xxl,
  },
});
