import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useSettingsStore } from '@/stores/settings';

describe('settings store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.className = '';
    document.documentElement.removeAttribute('dir');
    document.documentElement.removeAttribute('lang');
    setActivePinia(createPinia());
  });

  it('defaults to the system theme and resolves it to light', () => {
    const settings = useSettingsStore();
    expect(settings.theme).toBe('system');
    expect(settings.resolvedTheme).toBe('light');
  });

  it('applies and persists an explicit theme', () => {
    const settings = useSettingsStore();
    settings.setTheme('dark');

    expect(settings.theme).toBe('dark');
    expect(settings.resolvedTheme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('pms.theme')).toBe('dark');
  });

  it('keeps the Element Plus dark baseline for midnight and high contrast', () => {
    const settings = useSettingsStore();
    settings.setTheme('midnight');
    expect(document.documentElement.dataset.theme).toBe('midnight');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    settings.setTheme('high-contrast');
    expect(document.documentElement.dataset.theme).toBe('high-contrast');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    settings.setTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('switches locale and applies text direction', () => {
    const settings = useSettingsStore();

    settings.setLocale('ar');
    expect(settings.locale).toBe('ar');
    expect(settings.isRtl).toBe(true);
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(window.localStorage.getItem('pms.locale')).toBe('ar');

    settings.setLocale('fr');
    expect(settings.isRtl).toBe(false);
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('fr');
  });

  it('ignores unsupported locales', () => {
    const settings = useSettingsStore();
    settings.setLocale('en');
    settings.setLocale('xx');
    expect(settings.locale).toBe('en');
  });

  it('persists sidebar state', () => {
    const settings = useSettingsStore();
    settings.toggleSidebar();
    expect(settings.sidebarCollapsed).toBe(true);
    expect(window.localStorage.getItem('pms.sidebar.collapsed')).toBe('1');

    settings.setSidebarCollapsed(false);
    expect(settings.sidebarCollapsed).toBe(false);
    expect(window.localStorage.getItem('pms.sidebar.collapsed')).toBe('0');
  });
});
