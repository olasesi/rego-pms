<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import StatusChip from '@/components/StatusChip.vue';

const { t } = useI18n();

const mode = import.meta.env.MODE;
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const moduleKeys = [
  'goals',
  'reviews',
  'feedback',
  'oneOnOnes',
  'surveys',
  'timeOff',
  'compensation',
  'onboarding',
  'calibration',
  'documents',
  'analytics',
  'integrations',
] as const;
</script>

<template>
  <div class="home">
    <section class="hero">
      <StatusChip status="success" :label="t('home.badge')" />
      <h2 class="hero__title">{{ t('home.title') }}</h2>
      <p class="hero__subtitle">{{ t('home.subtitle') }}</p>
      <p class="hero__note">{{ t('home.note') }}</p>
    </section>

    <section class="panel" aria-live="polite">
      <div class="panel__row">
        <span>{{ t('home.env') }}</span>
        <code>{{ mode }}</code>
      </div>
      <div class="panel__row">
        <span>{{ t('home.api') }}</span>
        <code>{{ apiBaseUrl }}</code>
      </div>
    </section>

    <section class="modules">
      <header class="modules__header">
        <h3>{{ t('home.modulesTitle') }}</h3>
        <p>{{ t('home.modulesSubtitle') }}</p>
      </header>
      <ul class="modules__grid">
        <li v-for="key in moduleKeys" :key="key" class="module-card">
          <span class="module-card__dot" aria-hidden="true" />
          <span>{{ t(`modules.${key}`) }}</span>
          <span class="module-card__badge">{{ t('nav.comingSoon') }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped lang="scss">
.home {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.hero {
  padding: 2rem;
  border: 1px solid var(--pms-color-border);
  border-radius: var(--pms-radius);
  background:
    radial-gradient(circle at 100% 0%, var(--pms-color-primary-soft), transparent 55%),
    var(--pms-color-surface);
  box-shadow: var(--pms-shadow-sm);
}

.hero__title {
  margin: 0.9rem 0 0.4rem;
  font-size: clamp(1.6rem, 3vw, 2.3rem);
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.hero__subtitle {
  margin: 0;
  max-width: 62ch;
  color: var(--pms-color-text-muted);
  font-size: 1rem;
}

.hero__note {
  margin: 1rem 0 0;
  max-width: 72ch;
  padding: 0.7rem 0.9rem;
  border-inline-start: 3px solid var(--pms-color-primary);
  background: var(--pms-color-surface-muted);
  border-radius: 6px;
  color: var(--pms-color-text-muted);
  font-size: 0.85rem;
}

.panel {
  display: grid;
  gap: 0.6rem;
  padding: 1rem 1.25rem;
  border: 1px solid var(--pms-color-border);
  border-radius: var(--pms-radius);
  background: var(--pms-color-surface);
}

.panel__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.88rem;
}

.panel__row span {
  color: var(--pms-color-text-muted);
}

.modules__header h3 {
  margin: 0 0 0.2rem;
  font-size: 1.05rem;
}

.modules__header p {
  margin: 0;
  color: var(--pms-color-text-muted);
  font-size: 0.86rem;
}

.modules__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.6rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}

.module-card {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--pms-color-border);
  border-radius: 8px;
  background: var(--pms-color-surface);
  font-size: 0.88rem;
}

.module-card__dot {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
  background: var(--pms-color-primary);
}

.module-card__badge {
  margin-inline-start: auto;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--pms-color-text-muted);
  border: 1px solid var(--pms-color-border);
  border-radius: 999px;
  padding: 0.05rem 0.4rem;
}
</style>
