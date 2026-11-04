<script setup lang="ts">
import { computed, ref } from 'vue';
import { useForm } from '@void/vue';
import { useToast } from '@nuxt/ui/composables/useToast';
import { actionErrorMessage } from '../shared/action-error';
import type { Props } from './account.server';

const props = defineProps<Props>();
const toast = useToast();

const form = useForm('/account?password', {
  oldPassword: '',
  newPassword: '',
  csrf: props.csrf,
});

const confirmPassword = ref('');
const showOld = ref(false);
const showNew = ref(false);
const showConfirm = ref(false);

const roleMeta = computed(() => {
  if (props.user.role === 100) {
    return { label: '超级管理员', color: 'error' as const, icon: 'i-lucide-shield-check' };
  }
  if (props.user.role === 1) {
    return { label: 'VIP 会员', color: 'warning' as const, icon: 'i-lucide-crown' };
  }
  return { label: '普通用户', color: 'neutral' as const, icon: 'i-lucide-user' };
});

const isPasswordTooShort = computed(() => form.data.newPassword.length > 0 && form.data.newPassword.length < 6);
const isPasswordMismatch = computed(() => confirmPassword.value.length > 0 && confirmPassword.value !== form.data.newPassword);
const canSubmit = computed(() => {
  return (
    form.data.oldPassword.trim().length > 0 &&
    form.data.newPassword.length >= 6 &&
    confirmPassword.value === form.data.newPassword &&
    !form.pending
  );
});

async function savePassword() {
  if (!canSubmit.value) return;
  form.clearError();
  form.clearErrors();
  form.data.csrf = props.csrf;

  await form.post();
  if (form.wasSuccessful) {
    toast.add({
      title: '密码修改成功',
      color: 'success',
      icon: 'i-lucide-check-circle-2',
    });
    form.data.oldPassword = '';
    form.data.newPassword = '';
    confirmPassword.value = '';
  }
}

function resetForm() {
  form.clearError();
  form.clearErrors();
  form.data.oldPassword = '';
  form.data.newPassword = '';
  confirmPassword.value = '';
}
</script>

<template>
  <div class="space-y-6">
    <!-- 顶部标题导航栏 -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-default pb-5">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold tracking-tight text-highlighted">账号设置</h1>
          <UBadge :color="roleMeta.color" variant="subtle" size="sm" class="gap-1 px-2.5 py-0.5">
            <UIcon :name="roleMeta.icon" class="size-3.5" />
            <span>{{ roleMeta.label }}</span>
          </UBadge>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <UBadge variant="outline" color="neutral" class="font-mono text-xs py-1 px-2.5">
          UID: #{{ user.id }}
        </UBadge>
      </div>
    </div>

    <!-- 主体栅格布局：左侧个人资料卡片，右侧安全密码修改 -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- 左侧：个人基本信息概览 -->
      <div class="lg:col-span-5 space-y-6">
        <UCard class="shadow-sm">
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-highlighted">个人资料</h3>
              </div>
              <UIcon name="i-lucide-badge-check" class="size-4.5 text-primary" />
            </div>
          </template>

          <div class="space-y-5">
            <!-- 头像与主信息徽章 -->
            <div class="flex items-center gap-4 p-3.5 rounded-xl bg-elevated/70 border border-default">
              <div class="relative">
                <div class="size-14 rounded-2xl bg-primary/10 text-primary border border-primary/25 flex items-center justify-center font-bold text-xl uppercase shadow-xs">
                  {{ user.username.slice(0, 1) }}
                </div>
                <span class="absolute -bottom-1 -right-1 size-3.5 rounded-full bg-emerald-500 border-2 border-background ring-1 ring-emerald-500/30" title="在线会话有效" />
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <h4 class="text-base font-bold text-highlighted truncate">{{ user.username }}</h4>
                </div>
              </div>
            </div>

            <!-- 详细属性列表 -->
            <div class="space-y-3 text-xs">
              <div class="flex items-center justify-between py-1.5 border-b border-default/60">
                <span class="text-muted flex items-center gap-2">
                  <UIcon name="i-lucide-id-card" class="size-3.5 text-muted" />
                  账户识别号
                </span>
                <span class="font-mono font-medium text-highlighted">#{{ user.id }}</span>
              </div>

              <div class="flex items-center justify-between py-1.5 border-b border-default/60">
                <span class="text-muted flex items-center gap-2">
                  <UIcon name="i-lucide-shield" class="size-3.5 text-muted" />
                  用户权限组
                </span>
                <UBadge :color="roleMeta.color" variant="subtle" size="xs">
                  {{ roleMeta.label }}
                </UBadge>
              </div>

              <div class="flex items-center justify-between py-1.5 border-b border-default/60">
                <span class="text-muted flex items-center gap-2">
                  <UIcon name="i-lucide-inbox" class="size-3.5 text-muted" />
                  拥有房间
                </span>
                <span class="font-medium text-highlighted">{{ user.roomCount }} 个房间</span>
              </div>

              <div class="flex items-center justify-between py-1.5 border-b border-default/60">
                <span class="text-muted flex items-center gap-2">
                  <UIcon name="i-lucide-radio" class="size-3.5 text-muted" />
                  配置管道
                </span>
                <span class="font-medium text-highlighted">{{ user.channelCount }} 条推送管道</span>
              </div>

              <div class="flex items-center justify-between py-1.5">
                <span class="text-muted flex items-center gap-2">
                  <UIcon name="i-lucide-clock" class="size-3.5 text-muted" />
                  最近登录（北京时间）
                </span>
                <span class="font-mono text-xs text-muted">{{ user.lastLoginTime || '当前会话已激活' }}</span>
              </div>
            </div>
          </div>
        </UCard>

      </div>

      <!-- 右侧：安全设置与密码变更卡片 -->
      <div class="lg:col-span-7">
        <UCard class="shadow-sm">
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-highlighted">安全与密码修改</h3>
              </div>
              <UIcon name="i-lucide-key-round" class="size-4.5 text-primary" />
            </div>
          </template>

          <form class="space-y-5" @submit.prevent="savePassword">
            <!-- 业务错误告警 -->
            <UAlert
              v-if="form.error"
              color="error"
              variant="subtle"
              :description="actionErrorMessage(form.error)"
              icon="i-lucide-alert-circle"
            />

            <!-- 原密码字段 -->
            <UFormField label="原密码" :error="form.errors.oldPassword" required>
              <UInput
                v-model="form.data.oldPassword"
                :type="showOld ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="输入当前使用的密码"
                icon="i-lucide-key"
                class="w-full font-mono text-xs"
                :ui="{ trailing: 'pr-2' }"
              >
                <template #trailing>
                  <UButton
                    color="neutral"
                    variant="link"
                    size="xs"
                    :icon="showOld ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    :padded="false"
                    type="button"
                    class="text-muted hover:text-highlighted cursor-pointer"
                    tabindex="-1"
                    @click="showOld = !showOld"
                  />
                </template>
              </UInput>
            </UFormField>

            <!-- 新密码字段 -->
            <UFormField label="新密码" :error="form.errors.newPassword || (isPasswordTooShort ? '新密码长度至少需要 6 个字符' : undefined)" required>
              <UInput
                v-model="form.data.newPassword"
                :type="showNew ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="设置新的登录密码（至少 6 位）"
                icon="i-lucide-lock"
                class="w-full font-mono text-xs"
                :ui="{ trailing: 'pr-2' }"
              >
                <template #trailing>
                  <UButton
                    color="neutral"
                    variant="link"
                    size="xs"
                    :icon="showNew ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    :padded="false"
                    type="button"
                    class="text-muted hover:text-highlighted cursor-pointer"
                    tabindex="-1"
                    @click="showNew = !showNew"
                  />
                </template>
              </UInput>
            </UFormField>

            <!-- 确认新密码字段 -->
            <UFormField label="确认新密码" :error="isPasswordMismatch ? '两次输入的新密码不一致，请仔细核对' : undefined" required>
              <UInput
                v-model="confirmPassword"
                :type="showConfirm ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="再次输入新密码"
                icon="i-lucide-shield-check"
                class="w-full font-mono text-xs"
                :ui="{ trailing: 'pr-2' }"
              >
                <template #trailing>
                  <UButton
                    color="neutral"
                    variant="link"
                    size="xs"
                    :icon="showConfirm ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    :padded="false"
                    type="button"
                    class="text-muted hover:text-highlighted cursor-pointer"
                    tabindex="-1"
                    @click="showConfirm = !showConfirm"
                  />
                </template>
              </UInput>
            </UFormField>

            <!-- 密码规则提示 -->
            <div class="rounded-lg bg-muted/10 border border-default/70 p-3 text-xs space-y-1.5">
              <span class="font-medium text-highlighted block mb-1">修改准则：</span>
              <div class="flex items-center gap-2" :class="form.data.newPassword.length >= 6 ? 'text-success' : 'text-muted'">
                <UIcon :name="form.data.newPassword.length >= 6 ? 'i-lucide-check-circle-2' : 'i-lucide-circle'" class="size-3.5 shrink-0" />
                <span>密码长度达到 6 位及以上</span>
              </div>
              <div class="flex items-center gap-2" :class="confirmPassword.length > 0 && confirmPassword === form.data.newPassword ? 'text-success' : 'text-muted'">
                <UIcon :name="confirmPassword.length > 0 && confirmPassword === form.data.newPassword ? 'i-lucide-check-circle-2' : 'i-lucide-circle'" class="size-3.5 shrink-0" />
                <span>两次输入的新密码完全一致</span>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-default">
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                size="sm"
                :disabled="form.pending"
                @click="resetForm"
              >
                重置表单
              </UButton>
              <UButton
                type="submit"
                color="primary"
                size="sm"
                icon="i-lucide-check"
                :loading="form.pending"
                :disabled="!canSubmit"
              >
                保存密码
              </UButton>
            </div>
          </form>
        </UCard>
      </div>
    </div>
  </div>
</template>
