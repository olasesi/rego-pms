<script setup lang="ts">
import { computed } from 'vue';
import { ElConfigProvider } from 'element-plus';
import ar from 'element-plus/es/locale/lang/ar';
import de from 'element-plus/es/locale/lang/de';
import en from 'element-plus/es/locale/lang/en';
import es from 'element-plus/es/locale/lang/es';
import fr from 'element-plus/es/locale/lang/fr';
import hi from 'element-plus/es/locale/lang/hi';
import zhCn from 'element-plus/es/locale/lang/zh-cn';

import AppShell from '@/layouts/AppShell.vue';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();

const elementLocales = { en, fr, es, de, hi, zh: zhCn, ar };

const elementLocale = computed(() => elementLocales[settings.locale] ?? en);
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <AppShell>
      <router-view />
    </AppShell>
  </el-config-provider>
</template>
