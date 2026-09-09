<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();
</script>

<template>
  <main class="nf">
    <el-result icon="warning" :title="t('notFound.title')">
      <template #extra>
        <el-button type="primary" @click="router.push('/')">{{ t('notFound.back') }}</el-button>
      </template>
    </el-result>
  </main>
</template>

<style scoped>
.nf {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>