import { Platform } from 'react-native';

export const C = {
  bg: '#EDE8DC',
  surface: '#F5F1E7',
  elevated: '#FDFAF5',
  border: '#DDD6C5',
  borderSubtle: '#E8E2D4',

  gold: '#C9A84C',
  goldSoft: '#F5ECD7',
  goldGlow: 'rgba(201,168,76,0.12)',
  goldBorder: 'rgba(201,168,76,0.35)',

  ink: '#1A1815',
  textPrimary: '#1A1815',
  textSecondary: '#6B6354',
  textMuted: '#9C9182',
  bodyText: '#3A3530',
  legalText: '#4A4540',

  highRisk: '#B83232',
  mediumRisk: '#C4702A',
  lowRisk: '#2A7A4A',

  mootRed: '#8B1A1A',
  mootRedBubble: '#FDF0F0',
  mootRedText: '#5A0A0A',
  mootNavy: '#0F1E3D',
  mootNavyBorder: '#1A3A6B',
  mootRedBorder: '#6B1A1A',

  glass: 'rgba(255,255,255,0.7)',
  glassBorder: 'rgba(0,0,0,0.06)',
  overlay: 'rgba(237,232,220,0.96)',

  fab: '#1A1815',
  fabIcon: '#FDFAF5',
} as const;

export const AppColors = {
  light: {
    background: C.bg,
    surface: C.surface,
    elevated: C.elevated,
    border: C.border,
    primary: C.gold,
    accent: C.gold,
    accentSoft: C.goldGlow,
    textPrimary: C.textPrimary,
    textSecondary: C.textSecondary,
    textMuted: C.textMuted,
    highRisk: C.highRisk,
    mediumRisk: C.mediumRisk,
    lowRisk: C.lowRisk,
    success: C.lowRisk,
    warning: C.mediumRisk,
    danger: C.highRisk,
    overlay: C.overlay,
  },
  dark: {
    background: C.bg,
    surface: C.surface,
    elevated: C.elevated,
    border: C.border,
    primary: C.gold,
    accent: C.gold,
    accentSoft: C.goldGlow,
    textPrimary: C.textPrimary,
    textSecondary: C.textSecondary,
    textMuted: C.textMuted,
    highRisk: C.highRisk,
    mediumRisk: C.mediumRisk,
    lowRisk: C.lowRisk,
    success: C.lowRisk,
    warning: C.mediumRisk,
    danger: C.highRisk,
    overlay: C.overlay,
  },
} as const;

export const Radius = {
  standard: 14,
  button: 10,
  pill: 99,
  bubble: 18,
  card: 14,
} as const;

export const RiskLevelColors = {
  high: C.highRisk,
  medium: C.mediumRisk,
  low: C.lowRisk,
} as const;

export const GlassCard = {
  backgroundColor: C.elevated,
  borderWidth: 1,
  borderColor: C.border,
  borderRadius: Radius.card,
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;

export const Serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
