import type { AppTheme } from '../types';

export interface ThemePalette {
  primary: string; primaryStrong: string; accent: string; accentStrong: string;
  background: string; surface: string; text: string; muted: string; border: string;
  success: string; danger: string;
  sidebar: string; sidebarText: string; sidebarActive: string; sidebarActiveText: string; sidebarCaption: string;
}

interface ThemeDefinition {
  name: string;
  frenchName: string;
  light: ThemePalette;
  dark: ThemePalette;
}

export const APP_THEMES: Record<AppTheme, ThemeDefinition> = {
  classic: {
    name: 'الأصلي', frenchName: 'Bordeaux & or',
    light: { primary: '#7a2e3f', primaryStrong: '#58202b', accent: '#e3a13a', accentStrong: '#b87f27', background: '#f6f3ee', surface: '#ffffff', text: '#23201d', muted: '#71655c', border: '#eae3da', success: '#33705f', danger: '#b8463a', sidebar: '#7a2e3f', sidebarText: '#f6f3ee', sidebarActive: '#e3a13a', sidebarActiveText: '#58202b', sidebarCaption: '#f2c478' },
    dark: { primary: '#c27084', primaryStrong: '#cf869c', accent: '#e9b45f', accentStrong: '#f2cd8a', background: '#1c1714', surface: '#262019', text: '#f4ece2', muted: '#b9a99c', border: '#3b312b', success: '#63bdac', danger: '#e07362', sidebar: '#58202b', sidebarText: '#f4ece2', sidebarActive: '#e9b45f', sidebarActiveText: '#321b11', sidebarCaption: '#f2cd8a' },
  },
  sage: {
    name: 'المريمي والعاجي', frenchName: 'Sauge & ivoire',
    light: { primary: '#2b6852', primaryStrong: '#204d3d', accent: '#cba96c', accentStrong: '#836027', background: '#f1f5f0', surface: '#ffffff', text: '#203c30', muted: '#66766a', border: '#dce5db', success: '#2b6852', danger: '#ad514a', sidebar: '#ffffff', sidebarText: '#40594b', sidebarActive: '#e8f1e7', sidebarActiveText: '#285e49', sidebarCaption: '#526b5a' },
    dark: { primary: '#9bd5b4', primaryStrong: '#b9e5cb', accent: '#dfbe84', accentStrong: '#ebce9e', background: '#12201a', surface: '#1b2b22', text: '#e8f3ea', muted: '#acbcae', border: '#35493b', success: '#9bd5b4', danger: '#f1a09a', sidebar: '#18291f', sidebarText: '#d4e5d7', sidebarActive: '#293e2e', sidebarActiveText: '#b9e5cb', sidebarCaption: '#acbcae' },
  },
  blue: {
    name: 'الأزرق والخزفي', frenchName: 'Bleu & porcelaine',
    light: { primary: '#315cc7', primaryStrong: '#21489f', accent: '#b99a62', accentStrong: '#80602d', background: '#f3f6fb', surface: '#ffffff', text: '#21304d', muted: '#68768c', border: '#dfe6f1', success: '#287466', danger: '#b54b54', sidebar: '#ffffff', sidebarText: '#4b5b76', sidebarActive: '#eaf0ff', sidebarActiveText: '#315cc7', sidebarCaption: '#68768c' },
    dark: { primary: '#a7c2ff', primaryStrong: '#c4d7ff', accent: '#dfc188', accentStrong: '#f0d7a6', background: '#131d2e', surface: '#1c2940', text: '#e8efff', muted: '#aebbd3', border: '#35455f', success: '#83cfbc', danger: '#f2a6ae', sidebar: '#17233a', sidebarText: '#d8e3fb', sidebarActive: '#2a3b61', sidebarActiveText: '#c4d7ff', sidebarCaption: '#aebbd3' },
  },
  slate: {
    name: 'الأردوازي والكهرماني', frenchName: 'Ardoise & ambre',
    light: { primary: '#2e4249', primaryStrong: '#1d3037', accent: '#c29951', accentStrong: '#8a6021', background: '#f6f5f1', surface: '#ffffff', text: '#29383e', muted: '#657277', border: '#e2e5e4', success: '#347361', danger: '#ad514a', sidebar: '#263b43', sidebarText: '#e4eeee', sidebarActive: '#ebc47b', sidebarActiveText: '#302714', sidebarCaption: '#e4bd7d' },
    dark: { primary: '#e4bd7d', primaryStrong: '#f1d5a6', accent: '#d0aa65', accentStrong: '#f1d5a6', background: '#181d20', surface: '#232b2f', text: '#ecf1f3', muted: '#adbcc2', border: '#3a484d', success: '#8acdb7', danger: '#f1a09a', sidebar: '#101f26', sidebarText: '#d9e6eb', sidebarActive: '#d0aa65', sidebarActiveText: '#302714', sidebarCaption: '#e4bd7d' },
  },
};

export function normalizeTheme(value: unknown): AppTheme {
  return typeof value === 'string' && Object.hasOwn(APP_THEMES, value) ? value as AppTheme : 'classic';
}
