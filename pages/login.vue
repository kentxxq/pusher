<script setup lang="ts">
import { ref, watch } from 'vue';
import { Form, useForm } from '@void/vue';
import { actionErrorMessage } from '../shared/action-error';
import type { Props } from './login.server';
const props = defineProps<Props>();
const login = useForm('/login?login', { username: '', password: '', csrf: props.csrf });
const mail = useForm('/login?passwordMail', { username: '', csrf: props.csrf });
const mailVisible = ref(false);
const passwordSent = ref(false);
function switchForm() {
  mailVisible.value = !mailVisible.value;
  passwordSent.value = false;
  login.clearError(); login.clearErrors();
  mail.clearError(); mail.clearErrors();
}
watch(() => mail.wasSuccessful, successful => {
  if (!successful) return;
  login.data.username = mail.data.username;
  login.clearError(); login.clearErrors();
  mailVisible.value = false;
  passwordSent.value = true;
});
</script>
<template>
  <UCard class="w-full max-w-md">
    <template #header><h1 class="text-2xl font-semibold text-highlighted">Pusher</h1></template>
    <Form v-if="!mailVisible" :form="login" :render-error="actionErrorMessage" class="grid gap-4">
      <UFormField label="邮箱 / 用户名" :error="login.errors.username"><UInput v-model="login.data.username" autocomplete="username" class="w-full" /></UFormField>
      <UFormField label="密码" :error="login.errors.password"><UInput v-model="login.data.password" type="password" autocomplete="current-password" class="w-full" /></UFormField>
      <UButton type="submit" :loading="login.pending" block>登录</UButton>
    </Form>
    <Form v-else :form="mail" :render-error="actionErrorMessage" class="grid gap-4">
      <UFormField label="邮箱" :error="mail.errors.username"><UInput v-model="mail.data.username" type="email" autocomplete="email" placeholder="输入邮箱" class="w-full" /></UFormField>
      <UButton type="submit" :loading="mail.pending" block>发送密码邮件</UButton>
    </Form>
    <p v-if="passwordSent" role="status" class="text-sm text-success">密码已发送，请查收邮箱后登录。</p>
    <template #footer>
      <UButton type="button" variant="outline" :disabled="login.pending || mail.pending" block @click="switchForm">{{ mailVisible ? '返回登录' : '注册 / 忘记密码' }}</UButton>
    </template>
  </UCard>
</template>
