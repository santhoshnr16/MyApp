export const AppColors = {
  light: {
    primary: '#061633',
    accent: '#F5C84B',
    accentSoft: '#FFF2CC',
    background: '#F8FAFF',
    surface: '#FFFFFF',
    border: '#D3DBEA',
    textPrimary: '#061633',
    textSecondary: '#243B6B',
    textMuted: '#5B6E9A',
    highRisk: '#C0392B',
    mediumRisk: '#E67E22',
    lowRisk: '#1A7A4A',
    success: '#1A7A4A',
    warning: '#E67E22',
    danger: '#C0392B',
    overlay: 'rgba(6, 22, 51, 0.75)',
  },
  dark: {
    primary: '#D7E2FF',
    accent: '#F5C84B',
    accentSoft: '#3B2F12',
    background: '#0B1222',
    surface: '#121B2E',
    border: '#25324C',
    textPrimary: '#F8FAFF',
    textSecondary: '#CAD6F3',
    textMuted: '#92A3C7',
    highRisk: '#E16A5E',
    mediumRisk: '#F0A24E',
    lowRisk: '#57B27B',
    success: '#57B27B',
    warning: '#F0A24E',
    danger: '#E16A5E',
    overlay: 'rgba(6, 10, 20, 0.8)',
  },
} as const;

export const Radius = {
  standard: 10,
  pill: 20,
  bubble: 18,
} as const;

export const RiskLevelColors = {
  high: AppColors.light.highRisk,
  medium: AppColors.light.mediumRisk,
  low: AppColors.light.lowRisk,
} as const;
