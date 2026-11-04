import { defineStore } from 'pinia';

import { applyLocale, detectLocale, isRtlLocale, isSupportedLocale, type AppLocale } from '@/i18n';

export const THEMES = ['light', 'dark', 'midnight', 'high-contrast', 'system'] as const;

export type ThemePreference = (typeof THEMES)[number];
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

export const THEME_STORAGE_KEY = 'pms.theme';
export const SIDEBAR_STORAGE_KEY = 'pms.sidebar.collapsed';

const isTheme = (value: string): value is ThemePreference =>
  (THEMES as readonly string[]).includes(value);

const readStoredTheme = (): ThemePreference => {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored && isTheme(stored) ? stored : 'system';
};

const prefersDark = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

interface SettingsState {
  theme: ThemePreference;
  locale: AppLocale;
  systemPrefersDark: boolean;
  sidebarCollapsed: boolean;
}

let systemListenerAttached = false;

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    theme: readStoredTheme(),
    locale: detectLocale(),
    systemPrefersDark: prefersDark(),
    sidebarCollapsed:
      typeof window !== 'undefined' && window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1',
  }),

  getters: {
    resolvedTheme(state): ResolvedTheme {
      if (state.theme === 'system') return state.systemPrefersDark ? 'dark' : 'light';
      return state.theme;
    },
    isRtl(state): boolean {
      return isRtlLocale(state.locale);
    },
  },

  actions: {
    /** Apply persisted preferences and start listening for OS theme changes. */
    init(): void {
      this.applyTheme();
      applyLocale(this.locale);
      if (systemListenerAttached || typeof window === 'undefined') return;
      if (typeof window.matchMedia !== 'function') return;
      const query = window.matchMedia('(prefers-color-scheme: dark)');
      query.addEventListener('change', (event) => {
        this.systemPrefersDark = event.matches;
        if (this.theme === 'system') this.applyTheme();
      });
      systemListenerAttached = true;
    },

    setTheme(theme: ThemePreference): void {
      this.theme = theme;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      }
      this.applyTheme();
    },

    setLocale(locale: string): void {
      if (!isSupportedLocale(locale)) return;
      this.locale = locale;
      applyLocale(locale);
    },

    toggleSidebar(): void {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, this.sidebarCollapsed ? '1' : '0');
      }
    },

    setSidebarCollapsed(collapsed: boolean): void {
      this.sidebarCollapsed = collapsed;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
      }
    },

    applyTheme(): void {
      if (typeof document === 'undefined') return;
      const root = document.documentElement;
      const resolved = this.resolvedTheme;
      root.dataset.theme = resolved;
      // Element Plus ships a single dark baseline; every non-light theme uses it.
      root.classList.toggle('dark', resolved !== 'light');
      root.style.colorScheme = resolved === 'light' ? 'light' : 'dark';
    },
  },
});
