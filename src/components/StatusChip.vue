<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    status: 'success' | 'error' | 'pending';
    label?: string;
  }>(),
  { label: '' },
);

const label = computed(() => props.label || props.status);
</script>

<template>
  <span class="status-chip" :class="`status-chip--${status}`" data-test="status-chip">{{ label }}</span>
</template>

<style scoped>
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.status-chip--success {
  background: var(--pms-color-success-bg);
  color: var(--pms-color-success-text);
}
.status-chip--error {
  background: var(--pms-color-danger-bg);
  color: var(--pms-color-danger-text);
}
.status-chip--pending {
  background: var(--pms-color-warning-bg);
  color: var(--pms-color-warning-text);
}
</style>