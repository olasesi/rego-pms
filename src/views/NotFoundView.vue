<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();
</script>

<template>
  <section class="nf">
    <el-result icon="warning" :title="t('notFound.title')" :sub-title="t('notFound.description')">
      <template #extra>
        <el-button type="primary" @click="router.push('/')">{{ t('notFound.back') }}</el-button>
      </template>
    </el-result>
  </section>
</template>

<style scoped>
.nf {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
}
</style>
