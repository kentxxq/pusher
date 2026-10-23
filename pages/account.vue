<script setup lang="ts">
import { Form, useForm } from '@void/vue';
import { actionErrorMessage } from '../shared/action-error';
import type { Props } from './account.server';
const props = defineProps<Props>();
const form = useForm('/account?password', { oldPassword: '', newPassword: '', csrf: props.csrf });
</script>
<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 class="text-2xl font-semibold text-highlighted">账号设置</h1><p class="text-muted">{{ user.username }}</p></div></div>
  <UCard class="w-full max-w-md"><template #header><h2 class="text-lg font-semibold text-highlighted">修改密码</h2></template>
    <Form :form="form" :render-error="actionErrorMessage" class="grid gap-4">
      <UFormField label="原密码" :error="form.errors.oldPassword"><UInput v-model="form.data.oldPassword" type="password" autocomplete="current-password" /></UFormField>
      <UFormField label="新密码" :error="form.errors.newPassword"><UInput v-model="form.data.newPassword" type="password" autocomplete="new-password" /></UFormField>
      <UButton type="submit" :loading="form.pending">保存密码</UButton>
      <p v-if="form.wasSuccessful" class="text-sm text-success">密码已更新。</p>
    </Form>
  </UCard>
</template>
