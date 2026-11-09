import type { AppSettings } from '../types';
import { APP_THEMES, normalizeTheme } from '../data/themes.ts';

export function restoreSettings(value: unknown, defaults: AppSettings): AppSettings {
  const saved = value && typeof value === 'object' ? value as Partial<AppSettings> : {};
  return {
    schoolName: typeof saved.schoolName === 'string' ? saved.schoolName : defaults.schoolName,
    defaultPeriodType: ['week', 'month', 'custom'].includes(saved.defaultPeriodType ?? '') ? saved.defaultPeriodType! : defaults.defaultPeriodType,
    darkMode: typeof saved.darkMode === 'boolean' ? saved.darkMode : defaults.darkMode,
    theme: normalizeTheme(saved.theme),
  };
}

export function appearanceTokens(theme: unknown, darkMode: boolean): Record<string, string> {
  const p = APP_THEMES[normalizeTheme(theme)][darkMode ? 'dark' : 'light'];
  return {
    '--color-bordeaux': p.primary, '--color-bordeaux-dark': p.primaryStrong,
    '--color-gold': p.accent, '--color-gold-dark': p.accentStrong,
    '--color-cream': p.background, '--color-paper': p.surface,
    '--color-ink': p.text, '--color-ink-soft': p.muted, '--color-line': p.border,
    '--color-teal': p.success, '--color-clay': p.danger,
    '--sidebar-bg': p.sidebar, '--sidebar-text': p.sidebarText,
    '--sidebar-active': p.sidebarActive, '--sidebar-active-text': p.sidebarActiveText,
    '--sidebar-caption': p.sidebarCaption,
  };
}

export function applyAppearance(settings: Pick<AppSettings, 'theme' | 'darkMode'>): void {
  const root = document.documentElement;
  const theme = normalizeTheme(settings.theme);
  root.dataset.theme = theme;
  root.classList.toggle('dark', settings.darkMode);
  root.style.colorScheme = settings.darkMode ? 'dark' : 'light';
  const tokens = appearanceTokens(theme, settings.darkMode);
  Object.entries(tokens).forEach(([name, value]) => root.style.setProperty(name, value));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tokens['--sidebar-bg']);
}
