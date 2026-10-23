<script setup lang="ts">
import { useForm } from '@void/vue';
import { actionErrorMessage } from '../../shared/action-error';
import type { Props } from './db.server';
const props = defineProps<Props>();
const templates = useForm('/admin/db?templates', { confirmation: 'RESET', csrf: props.csrf });
const database = useForm('/admin/db?database', { confirmation: 'RESET', csrf: props.csrf });
async function resetTemplates() { if (confirm('覆盖四个系统模板？')) await templates.post(); }
async function resetDatabase() { if (prompt('此操作删除全部业务数据。输入 RESET 确认：') === 'RESET') await database.post(); }
</script>
<template>
  <h1 class="text-2xl font-semibold text-highlighted">数据库管理</h1>
  <UAlert color="warning" title="操作前请备份数据库" description="重置会修改或删除已有数据，无法通过页面撤销。" />
  <div class="grid gap-6 md:grid-cols-2">
    <UCard><template #header><h2 class="text-lg font-semibold">系统模板</h2></template>
      <p class="mb-4 text-muted">恢复四个内置模板，保留其他自定义模板。</p>
      <UButton color="warning" variant="outline" :loading="templates.pending" :disabled="database.pending" @click="resetTemplates">重置系统模板</UButton>
      <UAlert v-if="templates.wasSuccessful" class="mt-4" color="success" title="系统模板已重置" />
      <UAlert v-if="templates.error" class="mt-4" color="error" :description="actionErrorMessage(templates.error)" />
    </UCard>
    <UCard><template #header><h2 class="text-lg font-semibold">数据库重置</h2></template>
      <p class="mb-4 text-muted">删除全部业务数据并重新初始化，完成后返回登录页。</p>
      <UButton color="error" variant="outline" :loading="database.pending" :disabled="templates.pending" @click="resetDatabase">重置数据库</UButton>
      <UAlert v-if="database.error" class="mt-4" color="error" :description="actionErrorMessage(database.error)" />
    </UCard>
  </div>
</template>
