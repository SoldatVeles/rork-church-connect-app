export const Colors = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceSecondary: '#f1f5f9',

  primary: '#1e3a8a',
  primaryLight: '#eff6ff',
  primaryBorder: '#bfdbfe',
  primaryDark: '#0f172a',

  success: '#10b981',
  successDark: '#065f46',
  successLight: '#dcfce7',
  successBorder: '#bbf7d0',

  danger: '#ef4444',
  dangerDark: '#991b1b',
  dangerLight: '#fee2e2',
  dangerBorder: '#fecaca',

  warning: '#f59e0b',
  warningDark: '#92400e',
  warningLight: '#fef3c7',
  warningBorder: '#fde68a',

  info: '#3b82f6',
  infoDark: '#1e40af',
  infoLight: '#eff6ff',
  infoBorder: '#bfdbfe',

  purple: '#8b5cf6',
  purpleDark: '#6b21a8',
  purpleLight: '#f3e8ff',

  indigo: '#3730a3',
  indigoLight: '#e0e7ff',
  indigoBorder: '#c7d2fe',

  textPrimary: '#0f172a',
  textSecondary: '#1e293b',
  textTertiary: '#475569',
  textMuted: '#64748b',
  textPlaceholder: '#94a3b8',
  textDisabled: '#cbd5e1',

  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  divider: '#e5e7eb',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 20,
  full: 9999,
} as const;

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 13,
  base: 14,
  lg: 15,
  xl: 16,
  '2xl': 18,
  '3xl': 20,
  '4xl': 22,
  '5xl': 24,
} as const;

export const FontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export const CardStyle = {
  backgroundColor: Colors.surface,
  borderRadius: Radius.xl,
  padding: Spacing.xl,
  ...Shadow.sm,
} as const;

export const SectionTitleStyle = {
  fontSize: FontSize['2xl'],
  fontWeight: FontWeight.bold,
  color: Colors.textSecondary,
  marginBottom: Spacing.lg,
} as const;

export const ScreenHeaderStyle = {
  fontSize: FontSize['3xl'],
  fontWeight: FontWeight.bold,
  color: Colors.textPrimary,
} as const;

export const BadgeColors = {
  draft: { bg: Colors.warningLight, text: Colors.warningDark, border: Colors.warningBorder },
  published: { bg: Colors.successLight, text: Colors.successDark, border: Colors.successBorder },
  cancelled: { bg: Colors.dangerLight, text: Colors.dangerDark, border: Colors.dangerBorder },
  accepted: { bg: Colors.successLight, text: Colors.successDark, border: Colors.successBorder },
  declined: { bg: Colors.dangerLight, text: Colors.dangerDark, border: Colors.dangerBorder },
  pending: { bg: Colors.warningLight, text: Colors.warningDark, border: Colors.warningBorder },
  replacement_suggested: { bg: Colors.indigoLight, text: Colors.indigo, border: Colors.indigoBorder },
  reassigned: { bg: Colors.purpleLight, text: Colors.purpleDark, border: '#ddd6fe' },
  active: { bg: Colors.infoLight, text: Colors.infoDark, border: Colors.infoBorder },
  answered: { bg: Colors.successLight, text: Colors.successDark, border: Colors.successBorder },
  shared: { bg: Colors.infoLight, text: Colors.infoDark, border: Colors.infoBorder },
  local: { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
  urgent: { bg: Colors.dangerLight, text: '#dc2626', border: Colors.dangerBorder },
  registered: { bg: Colors.successLight, text: '#16a34a', border: Colors.successBorder },
} as const;
