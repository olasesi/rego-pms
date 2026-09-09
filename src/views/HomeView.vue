<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import StatusChip from '@/components/StatusChip.vue';

const { t } = useI18n();

const mode = import.meta.env.MODE;
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
</script>

<template>
  <main class="home">
    <section class="hero">
      <h1>{{ t('app.name') }}</h1>
      <p class="hero__lead">{{ t('home.title') }}</p>
      <StatusChip status="success" label="Scaffold ready" />
      <p class="hero__note">{{ t('home.scaffold') }}</p>
    </section>

    <section class="panel">
      <div class="panel__row">
        <span>{{ t('home.env') }}</span>
        <code>{{ mode }}</code>
      </div>
      <div class="panel__row">
        <span>{{ t('home.api') }}</span>
        <code>{{ apiBaseUrl }}</code>
      </div>
    </section>
  </main>
</template>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 2rem;
}
.hero {
  text-align: center;
}
.hero h1 {
  margin: 0 0 0.5rem;
}
.hero__lead {
  margin: 0 0 0.75rem;
  color: var(--pms-color-text-muted);
}
.hero__note {
  margin: 1rem 0 0;
  color: var(--pms-color-text-muted);
}
.panel {
  width: 100%;
  max-width: 420px;
  border: 1px solid var(--pms-color-border);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.panel__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.panel__row span {
  color: var(--pms-color-text-muted);
}
code {
  background: var(--pms-color-code-bg);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}
</style>