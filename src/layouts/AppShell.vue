<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import {
  Aim,
  ArrowDown,
  ChatDotRound,
  ChatLineSquare,
  Compass,
  DataAnalysis,
  House,
  Menu,
  Moon,
  Search,
  Setting,
  Sunny,
  Trophy,
  User,
} from '@element-plus/icons-vue';

import { LOCALE_LABELS, SUPPORTED_LOCALES, type AppLocale } from '@/i18n';
import { useSettingsStore, type ThemePreference } from '@/stores/settings';

interface NavItem {
  key: string;
  icon: Component;
  to?: string;
  enabled: boolean;
}

const { t } = useI18n();
const route = useRoute();
const settings = useSettingsStore();

const mobileOpen = ref(false);

const navItems: NavItem[] = [
  { key: 'home', icon: House, to: '/', enabled: true },
  { key: 'goals', icon: Aim, enabled: false },
  { key: 'reviews', icon: Trophy, enabled: false },
  { key: 'feedback', icon: ChatDotRound, enabled: false },
  { key: 'oneOnOnes', icon: ChatLineSquare, enabled: false },
  { key: 'surveys', icon: Compass, enabled: false },
  { key: 'people', icon: User, enabled: false },
  { key: 'insights', icon: DataAnalysis, enabled: false },
  { key: 'admin', icon: Setting, enabled: false },
];

const themeIcons: Record<string, Component> = {
  light: Sunny,
  dark: Moon,
  midnight: Moon,
  'high-contrast': Sunny,
  system: Setting,
};

const themeLabelKeys: Record<ThemePreference, string> = {
  light: 'theme.light',
  dark: 'theme.dark',
  midnight: 'theme.midnight',
  'high-contrast': 'theme.highContrast',
  system: 'theme.system',
};

const currentThemeIcon = computed(() => themeIcons[settings.theme] ?? Setting);
const currentThemeLabel = computed(() => t(themeLabelKeys[settings.theme]));
const currentLocaleLabel = computed(() => LOCALE_LABELS[settings.locale]);
const pageTitle = computed(() => (route.name === 'home' ? t('nav.home') : t('app.name')));
const isHome = computed(() => route.name === 'home');

const onThemeCommand = (command: string | number | object): void => {
  settings.setTheme(String(command) as ThemePreference);
};

const onLocaleCommand = (command: string | number | object): void => {
  settings.setLocale(String(command));
};

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
  },
);

const localeOptions = SUPPORTED_LOCALES.map((locale) => ({
  value: locale,
  label: LOCALE_LABELS[locale],
}));

const themeOptions = (Object.keys(themeLabelKeys) as ThemePreference[]).map((value) => ({
  value,
  label: t(themeLabelKeys[value]),
}));

const localeLabel = (locale: AppLocale): string => LOCALE_LABELS[locale];
</script>

<template>
  <div class="shell" :class="{ 'shell--collapsed': settings.sidebarCollapsed }">
    <aside class="sidebar" :class="{ 'sidebar--open': mobileOpen }">
      <div class="brand">
        <span class="brand__mark" aria-hidden="true">P</span>
        <span class="brand__text">
          <strong>{{ t('app.shortName') }}</strong>
          <small>{{ t('app.tagline') }}</small>
        </span>
      </div>

      <nav class="nav" :aria-label="t('app.name')">
        <template v-for="item in navItems" :key="item.key">
          <router-link
            v-if="item.enabled && item.to"
            :to="item.to"
            class="nav-item"
            :class="{ 'nav-item--active': isHome }"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span class="nav-item__label">{{ t(`nav.${item.key}`) }}</span>
          </router-link>
          <button
            v-else
            type="button"
            class="nav-item nav-item--disabled"
            disabled
            :title="t('nav.comingSoon')"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span class="nav-item__label">{{ t(`nav.${item.key}`) }}</span>
            <span class="nav-item__badge">{{ t('nav.comingSoon') }}</span>
          </button>
        </template>
      </nav>

      <div class="sidebar__footer">
        <span class="sidebar__version">v0.1.0</span>
        <span class="sidebar__hint">{{ t('home.modulesSubtitle') }}</span>
      </div>
    </aside>

    <div class="shell__body">
      <header class="header">
        <button
          type="button"
          class="icon-button header__menu"
          :aria-label="t('header.toggleMenu')"
          @click="mobileOpen = !mobileOpen"
        >
          <el-icon><Menu /></el-icon>
        </button>

        <h1 class="header__title">{{ pageTitle }}</h1>

        <div class="header__actions">
          <el-input
            class="header__search"
            :placeholder="t('header.searchPlaceholder')"
            :aria-label="t('header.searchPlaceholder')"
            disabled
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-dropdown trigger="click" @command="onLocaleCommand">
            <button
              type="button"
              class="icon-button icon-button--wide"
              :aria-label="t('header.language')"
              :title="t('header.language')"
            >
              <el-icon><Compass /></el-icon>
              <span class="icon-button__label">{{ currentLocaleLabel }}</span>
              <el-icon class="icon-button__caret"><ArrowDown /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="option in localeOptions"
                  :key="option.value"
                  :command="option.value"
                  :disabled="option.value === settings.locale"
                >
                  {{ localeLabel(option.value) }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <el-dropdown trigger="click" @command="onThemeCommand">
            <button
              type="button"
              class="icon-button icon-button--wide"
              :aria-label="t('header.theme')"
              :title="t('header.theme')"
            >
              <el-icon><component :is="currentThemeIcon" /></el-icon>
              <span class="icon-button__label">{{ currentThemeLabel }}</span>
              <el-icon class="icon-button__caret"><ArrowDown /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="option in themeOptions"
                  :key="option.value"
                  :command="option.value"
                  :disabled="option.value === settings.theme"
                >
                  {{ option.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <button
            type="button"
            class="icon-button header__notifications"
            :aria-label="t('header.notifications')"
            :title="t('header.notifications')"
          >
            <el-icon><ChatDotRound /></el-icon>
          </button>

          <div class="avatar" :title="t('header.profile')" aria-hidden="true">PM</div>
        </div>
      </header>

      <main id="main-content" class="content">
        <slot />
      </main>

      <footer class="footer">
        <span>{{ t('app.name') }}</span>
        <span class="footer__dot" aria-hidden="true">·</span>
        <span>{{ t('app.tagline') }}</span>
      </footer>
    </div>

    <button
      v-if="mobileOpen"
      type="button"
      class="overlay"
      :aria-label="t('header.toggleMenu')"
      @click="mobileOpen = false"
    />
  </div>
</template>

<style scoped lang="scss">
.shell {
  display: flex;
  min-height: 100vh;
  background: var(--pms-color-bg);
}

.sidebar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  flex: 0 0 264px;
  width: 264px;
  height: 100vh;
  padding: 1.25rem 1rem;
  background: var(--pms-sidebar-bg);
  color: var(--pms-sidebar-text);
  border-inline-end: 1px solid var(--pms-color-border);
  transition: width 180ms ease;
  z-index: 30;
}

.shell--collapsed .sidebar {
  flex-basis: 80px;
  width: 80px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.25rem 0.4rem 0.75rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.brand__mark {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 10px;
  background: var(--pms-color-primary);
  color: var(--pms-color-on-primary);
  font-weight: 800;
  font-size: 1.15rem;
}

.brand__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}

.brand__text strong {
  font-size: 1rem;
  letter-spacing: 0.02em;
}

.brand__text small {
  color: var(--pms-sidebar-muted);
  font-size: 0.72rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shell--collapsed .brand__text,
.shell--collapsed .nav-item__label,
.shell--collapsed .nav-item__badge,
.shell--collapsed .sidebar__footer {
  display: none;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1 1 auto;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--pms-sidebar-text);
  font: inherit;
  font-size: 0.9rem;
  text-align: start;
  text-decoration: none;
  cursor: pointer;
  transition:
    background 140ms ease,
    color 140ms ease;
}

.nav-item:hover:not(:disabled) {
  background: rgba(148, 163, 184, 0.12);
}

.nav-item--active {
  background: var(--pms-sidebar-active-bg);
  color: var(--pms-sidebar-active-text);
  font-weight: 600;
}

.nav-item--disabled {
  color: var(--pms-sidebar-muted);
  cursor: not-allowed;
}

.nav-item__label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-item__badge {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  color: var(--pms-sidebar-muted);
}

.sidebar__footer {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem 0.4rem 0;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
  color: var(--pms-sidebar-muted);
  font-size: 0.7rem;
  line-height: 1.4;
}

.sidebar__version {
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.shell__body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 100vh;
}

.header {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.7rem 1.4rem;
  background: var(--pms-header-bg);
  border-bottom: 1px solid var(--pms-color-border);
  backdrop-filter: blur(10px);
  z-index: 20;
}

.header__menu {
  display: none;
}

.header__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 650;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.header__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-inline-start: auto;
}

.header__search {
  width: 260px;
}

.header__search :deep(.el-input__wrapper) {
  background: var(--pms-color-surface-muted);
  box-shadow: none;
  border: 1px solid var(--pms-color-border);
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  height: 36px;
  min-width: 36px;
  padding: 0 0.55rem;
  border: 1px solid var(--pms-color-border);
  border-radius: 8px;
  background: var(--pms-color-surface);
  color: var(--pms-color-text);
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    background 140ms ease;
}

.icon-button:hover {
  border-color: var(--pms-color-primary);
  color: var(--pms-color-primary);
}

.icon-button__caret {
  font-size: 0.7rem;
  color: var(--pms-color-text-muted);
}

.icon-button__label {
  display: none;
}

.avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--pms-color-primary-soft);
  color: var(--pms-color-primary);
  font-size: 0.78rem;
  font-weight: 700;
  border: 1px solid var(--pms-color-border);
}

.content {
  flex: 1 1 auto;
  width: 100%;
  max-width: 1280px;
  margin-inline: auto;
  padding: 1.75rem 1.5rem 2.5rem;
}

.footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding: 1rem 1.5rem 1.5rem;
  color: var(--pms-color-text-muted);
  font-size: 0.76rem;
}

.footer__dot {
  opacity: 0.6;
}

.overlay {
  position: fixed;
  inset: 0;
  border: 0;
  background: rgba(2, 6, 23, 0.55);
  z-index: 25;
}

@media (min-width: 1180px) {
  .icon-button__label {
    display: inline;
  }

  .header__search {
    width: 320px;
  }
}

@media (max-width: 960px) {
  .sidebar {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    transform: translateX(calc(-1 * (100% + 8px)));
    transition: transform 200ms ease;
    width: 264px;
    flex-basis: 264px;
  }

  [dir='rtl'] .sidebar {
    transform: translateX(calc(100% + 8px));
  }

  .sidebar--open {
    transform: translateX(0);
  }

  .shell--collapsed .sidebar {
    width: 264px;
    flex-basis: 264px;
  }

  .shell--collapsed .brand__text,
  .shell--collapsed .nav-item__label,
  .shell--collapsed .nav-item__badge,
  .shell--collapsed .sidebar__footer {
    display: flex;
  }

  .header__menu {
    display: inline-flex;
  }

  .header__search {
    display: none;
  }

  .content {
    padding: 1.25rem 1rem 2rem;
  }
}

@media (max-width: 560px) {
  .icon-button--wide .icon-button__label {
    display: none;
  }

  .header__notifications {
    display: none;
  }
}
</style>
