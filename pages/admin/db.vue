<script setup lang="ts">
import { ref } from 'vue';
import { useForm } from '@void/vue';
import ConfirmModal from '../../components/ConfirmModal.vue';
import { actionErrorMessage } from '../../shared/action-error';
import type { Props } from './db.server';

const props = defineProps<Props>();
const templates = useForm('/admin/db?templates', { confirmation: 'RESET', csrf: props.csrf });
const database = useForm('/admin/db?database', { confirmation: 'RESET', csrf: props.csrf });

const confirmTemplatesOpen = ref(false);
const resetDbOpen = ref(false);
const resetDbInput = ref('');

async function doResetTemplates() {
  await templates.post();
  if (templates.wasSuccessful) {
    confirmTemplatesOpen.value = false;
  }
}

async function doResetDatabase() {
  if (resetDbInput.value !== 'RESET') return;
  await database.post();
  if (database.wasSuccessful) {
    resetDbOpen.value = false;
    resetDbInput.value = '';
  }
}
</script>
<template>
  <h1 class="text-2xl font-semibold text-highlighted">数据库管理</h1>
  <UAlert color="warning" title="操作前请备份数据库" />
  <div class="grid gap-6 md:grid-cols-2">
    <UCard><template #header><h2 class="text-lg font-semibold">系统模板</h2></template>
      <UButton color="warning" variant="outline" :loading="templates.pending" :disabled="database.pending" @click="confirmTemplatesOpen = true">重置系统模板</UButton>
      <UAlert v-if="templates.wasSuccessful" class="mt-4" color="success" title="系统模板已重置" />
      <UAlert v-if="templates.error" class="mt-4" color="error" :description="actionErrorMessage(templates.error)" />
    </UCard>
    <UCard><template #header><h2 class="text-lg font-semibold">数据库重置</h2></template>
      <UButton color="error" variant="outline" :loading="database.pending" :disabled="templates.pending" @click="resetDbOpen = true; resetDbInput = ''">重置数据库</UButton>
      <UAlert v-if="database.error" class="mt-4" color="error" :description="actionErrorMessage(database.error)" />
    </UCard>
  </div>

  <ConfirmModal
    v-model:open="confirmTemplatesOpen"
    title="重置系统模板"
    description="此操作将覆盖默认的四个系统模板，现有同名模板将被更新。确认重置？"
    confirm-text="确认重置"
    color="warning"
    icon="i-lucide-refresh-cw"
    :loading="templates.pending"
    @confirm="doResetTemplates"
  />

  <UModal v-model:open="resetDbOpen">
    <template #content>
      <div class="p-6 space-y-4">
        <div class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
            <UIcon name="i-lucide-alert-triangle" class="size-5" />
          </div>
          <div class="space-y-1">
            <h3 class="text-base font-semibold text-highlighted">高危操作：重置数据库</h3>
            <p class="text-xs text-muted">此操作将删除全部业务数据且不可恢复！如确认操作，请在下方输入 <span class="font-mono font-bold text-error">RESET</span> 后继续：</p>
          </div>
        </div>
        <UInput v-model="resetDbInput" placeholder="输入 RESET 确认" class="w-full font-mono" />
        <div class="flex justify-end gap-2 pt-2 border-t border-default">
          <UButton color="neutral" variant="ghost" @click="resetDbOpen = false">取消</UButton>
          <UButton color="error" :disabled="resetDbInput !== 'RESET'" :loading="database.pending" @click="doResetDatabase">确认彻底重置</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
