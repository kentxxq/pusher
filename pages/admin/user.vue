<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useForm, useRouter } from '@void/vue';
import { useToast } from '@nuxt/ui/composables/useToast';
import ConfirmModal from '../../components/ConfirmModal.vue';
import Pagination from '../../components/Pagination.vue';
import { listUrl } from '../../shared/ui-navigation';
import { actionErrorMessage } from '../../shared/action-error';
import type { TableColumn } from '@nuxt/ui';
import type { Props } from './user.server';

const props = defineProps<Props>();
const router = useRouter();
const toast = useToast();

function showToast(msg: string, color: 'success' | 'error' | 'primary' = 'success') {
  toast.add({
    title: msg,
    color,
    icon: color === 'error' ? 'i-lucide-alert-circle' : 'i-lucide-check-circle-2',
  });
}

// 搜索与刷新逻辑
const searchValue = ref(props.search);
watch(() => props.search, (s) => {
  if (typeof document !== 'undefined') {
    const inputEl = document.querySelector('input[name="search"]') as HTMLInputElement | null;
    if (document.activeElement === inputEl) return;
  }
  searchValue.value = s;
});

let searchDebounceTimer: any = null;
function onSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    triggerSearch(searchValue.value);
  }, 350);
}

async function triggerSearch(keyword: string) {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  let isFocused = false;
  let selectionStart: number | null = null;
  let selectionEnd: number | null = null;

  if (typeof document !== 'undefined') {
    const inputEl = document.querySelector('input[name="search"]') as HTMLInputElement | null;
    isFocused = document.activeElement === inputEl;
    selectionStart = inputEl?.selectionStart ?? null;
    selectionEnd = inputEl?.selectionEnd ?? null;
  }

  await (router as any).visit(listUrl('/admin/user', 1, keyword), { preserveState: true, replace: true });

  if (isFocused && typeof document !== 'undefined') {
    nextTick(() => {
      const el = document.querySelector('input[name="search"]') as HTMLInputElement | null;
      if (el) {
        el.focus();
        if (selectionStart !== null && selectionEnd !== null) {
          try {
            el.setSelectionRange(selectionStart, selectionEnd);
          } catch {}
        }
      }
    });
  }
}

function refreshUsers() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchValue.value = '';
  (router as any).visit(listUrl('/admin/user', 1, ''), { preserveState: true, replace: true });
  showToast('已清空搜索并刷新数据');
}

// 表单 Actions
const roles = [
  { label: 'Free (普通用户)', value: 0 as const },
  { label: 'VIP (特权用户)', value: 1 as const },
  { label: 'Admin (管理员)', value: 100 as const },
];
const create = useForm('/admin/user?create', { username: '', password: '', role: 0, csrf: props.csrf });
const role = useForm('/admin/user?role', { id: 0, role: 0, csrf: props.csrf });
const deletion = useForm('/admin/user?delete', { id: 0, csrf: props.csrf });

// 创建用户弹窗
const createModalOpen = ref(false);
function openCreateModal() {
  create.clearError();
  create.clearErrors();
  create.data.username = '';
  create.data.password = '';
  create.data.role = 0;
  create.data.csrf = props.csrf;
  createModalOpen.value = true;
}

async function handleCreate() {
  create.data.csrf = props.csrf;
  await create.post();
  if (create.wasSuccessful) {
    showToast('新用户创建成功！');
    createModalOpen.value = false;
    create.data.username = '';
    create.data.password = '';
    create.data.role = 0;
  }
}

// 统一确认弹窗
const confirmState = ref<{
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  color: 'error' | 'warning' | 'primary';
  icon: string;
  loading: boolean;
  action: () => Promise<void> | void;
}>({
  open: false,
  title: '',
  description: '',
  confirmText: '确认',
  color: 'error',
  icon: 'i-lucide-alert-triangle',
  loading: false,
  action: () => {}
});

async function handleConfirm() {
  confirmState.value.loading = true;
  try {
    await confirmState.value.action();
  } finally {
    confirmState.value.loading = false;
  }
}

function remove(user: Row) {
  const isPermanent = user.username.startsWith('delete_');
  confirmState.value = {
    open: true,
    title: isPermanent ? '确认永久删除用户' : '确认标记删除用户',
    description: isPermanent
      ? `将永久删除用户「${user.username}」及其所有关联数据，不可恢复。确认继续？`
      : `第一次操作将标记删除「${user.username}」并修改用户名，再次操作将永久删除账号。确认继续？`,
    confirmText: isPermanent ? '永久删除' : '标记删除',
    color: 'error',
    icon: 'i-lucide-trash-2',
    loading: false,
    action: async () => {
      deletion.data.id = user.id;
      deletion.data.csrf = props.csrf;
      await deletion.post();
      if (deletion.wasSuccessful) {
        showToast(isPermanent ? '用户已被永久清除' : '用户已标记删除');
        confirmState.value.open = false;
      }
    }
  };
}

async function changeRole(id: number, value: 0 | 1 | 100) {
  role.data.id = id;
  role.data.role = value;
  role.data.csrf = props.csrf;
  await role.post();
  if (role.wasSuccessful) {
    showToast('用户角色已更新');
  }
}

function selectRole(id: number, value: unknown) {
  if (value === 0 || value === 1 || value === 100) {
    return changeRole(id, value);
  }
}

type Row = Props['users']['items'][number];
const columns: TableColumn<Row>[] = [
  { accessorKey: 'username', header: '用户名' },
  { accessorKey: 'role', header: '角色组' },
  { accessorKey: 'lastLoginTime', header: '最近登录（北京时间）' },
  { id: 'actions', header: '操作' }
];
</script>

<template>
  <div class="space-y-4">
    <!-- 顶部标题与创建操作栏 -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex items-center gap-2.5">
          <h1 class="text-2xl font-bold tracking-tight text-highlighted">用户管理</h1>
          <UBadge variant="subtle" color="neutral" size="sm">共 {{ users.total }} 个用户</UBadge>
        </div>
      </div>

      <div>
        <UButton
          color="primary"
          icon="i-lucide-user-plus"
          @click="openCreateModal"
        >
          创建用户
        </UButton>
      </div>
    </div>

    <!-- 表格与分页卡片 -->
    <UCard class="w-full overflow-hidden" :ui="{ body: 'p-0 sm:p-0' }">
      <div class="p-4 sm:p-5 border-b border-default">
        <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
          <!-- 搜索与刷新 -->
          <form method="get" action="/admin/user" class="flex items-center gap-2 m-0" @submit.prevent="triggerSearch(searchValue)">
            <UInput
              v-model="searchValue"
              name="search"
              placeholder="搜索用户名"
              aria-label="搜索用户名"
              icon="i-lucide-search"
              class="w-56 sm:w-64"
              @input="onSearchInput"
            />
            <UButton
              type="button"
              variant="outline"
              color="neutral"
              icon="i-lucide-refresh-cw"
              title="刷新列表并清空搜索"
              @click="refreshUsers"
            >
              刷新
            </UButton>
          </form>

          <Pagination v-bind="users" path="/admin/user" :search="search">
            <span>共 <strong class="font-semibold text-highlighted">{{ users.total }}</strong> 个用户</span>
          </Pagination>
        </div>
        <p v-if="role.error || deletion.error" class="whitespace-pre-wrap text-sm text-error mt-2">
          {{ actionErrorMessage(role.error) || actionErrorMessage(deletion.error) }}
        </p>
      </div>

      <!-- 表格全宽展示 -->
      <div class="w-full overflow-x-auto">
        <UTable
          :data="users.items"
          :columns="columns"
          empty="暂无用户记录"
          :sorting-options="{ enableSorting: false }"
          class="w-full"
          :ui="{
            base: 'w-full min-w-full table-auto',
            th: 'py-3.5 px-4 text-xs font-semibold text-muted bg-muted/20 border-b border-default whitespace-nowrap',
            td: 'py-3.5 px-4 text-sm border-b border-default'
          }"
        >
          <template #username-cell="{ row }">
            <div class="flex items-center gap-2.5">
              <div
                class="size-7 rounded-lg flex items-center justify-center font-bold text-xs uppercase"
                :class="row.original.username.startsWith('delete_') ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'"
              >
                {{ row.original.username.replace(/^delete_/, '').slice(0, 1) || '?' }}
              </div>
              <div class="flex items-center gap-1.5">
                <span
                  class="font-medium"
                  :class="row.original.username.startsWith('delete_') ? 'line-through text-muted' : 'text-highlighted'"
                >
                  {{ row.original.username }}
                </span>
                <UBadge v-if="row.original.username.startsWith('delete_')" color="error" variant="subtle" size="xs">
                  已标记删除
                </UBadge>
              </div>
            </div>
          </template>

          <template #role-cell="{ row }">
            <USelect
              :model-value="row.original.role as 0 | 1 | 100"
              :items="roles"
              size="xs"
              class="w-40"
              @update:model-value="selectRole(row.original.id, $event)"
            />
          </template>

          <template #lastLoginTime-cell="{ row }">
            <span class="font-mono text-xs text-muted whitespace-nowrap">
              {{ row.original.lastLoginTime || '未登录' }}
            </span>
          </template>

          <!-- 操作列表头：靠右对齐 -->
          <template #actions-header>
            <div class="w-full text-right pr-2 whitespace-nowrap">操作</div>
          </template>

          <!-- 操作按钮：靠右对齐 -->
          <template #actions-cell="{ row }">
            <div class="flex items-center justify-end">
              <UButton
                color="error"
                variant="ghost"
                size="xs"
                :icon="row.original.username.startsWith('delete_') ? 'i-lucide-user-x' : 'i-lucide-trash-2'"
                @click="remove(row.original)"
              >
                {{ row.original.username.startsWith('delete_') ? '永久删除' : '标记删除' }}
              </UButton>
            </div>
          </template>
        </UTable>
      </div>
    </UCard>

    <!-- 创建用户弹窗 -->
    <UModal v-model:open="createModalOpen">
      <template #content>
        <div class="p-6 space-y-5">
          <div class="flex items-center gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UIcon name="i-lucide-user-plus" class="size-5" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-highlighted">创建新用户</h3>
            </div>
          </div>

          <form class="space-y-4" @submit.prevent="handleCreate">
            <UAlert
              v-if="create.error"
              color="error"
              variant="subtle"
              :description="actionErrorMessage(create.error)"
              icon="i-lucide-alert-circle"
            />

            <UFormField label="用户名" :error="create.errors.username" required>
              <UInput
                v-model="create.data.username"
                icon="i-lucide-user"
                placeholder="输入用户名"
                autocomplete="off"
                class="w-full"
              />
            </UFormField>

            <UFormField label="登录密码" :error="create.errors.password" required>
              <UInput
                v-model="create.data.password"
                type="password"
                icon="i-lucide-lock"
                placeholder="设置登录初始密码"
                autocomplete="new-password"
                class="w-full font-mono text-xs"
              />
            </UFormField>

            <UFormField label="初始角色组" required>
              <USelect
                v-model="create.data.role"
                :items="roles"
                class="w-full"
              />
            </UFormField>

            <div class="flex items-center justify-end gap-2 pt-4 border-t border-default">
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="createModalOpen = false"
              >
                取消
              </UButton>
              <UButton
                type="submit"
                color="primary"
                size="xs"
                icon="i-lucide-check"
                :loading="create.pending"
              >
                确认创建
              </UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <!-- 统一确认操作弹窗 -->
    <ConfirmModal
      v-model:open="confirmState.open"
      :title="confirmState.title"
      :description="confirmState.description"
      :confirm-text="confirmState.confirmText"
      :color="confirmState.color"
      :icon="confirmState.icon"
      :loading="confirmState.loading"
      @confirm="handleConfirm"
    />
  </div>
</template>
