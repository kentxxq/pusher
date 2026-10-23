<script setup lang="ts">
import { Form, useForm } from '@void/vue';
import type { TableColumn } from '@nuxt/ui';
import Pagination from '../../components/Pagination.vue';
import { actionErrorMessage } from '../../shared/action-error';
import type { Props } from './user.server';
const props = defineProps<Props>();
const roles = [{ label: 'Free', value: 0 as const }, { label: 'VIP', value: 1 as const }, { label: 'Admin', value: 100 as const }];
const create = useForm('/admin/user?create', { username: '', password: '', role: 0, csrf: props.csrf });
const role = useForm('/admin/user?role', { id: 0, role: 0, csrf: props.csrf });
const deletion = useForm('/admin/user?delete', { id: 0, csrf: props.csrf });
async function remove(id: number) { if (confirm('第一次操作标记删除并修改用户名，再次操作将永久删除账号及其全部数据。确认继续？')) { deletion.data.id = id; await deletion.post(); } }
async function changeRole(id: number, value: 0 | 1 | 100) { role.data.id = id; role.data.role = value; await role.post(); }
function selectRole(id: number, value: unknown) { if (value === 0 || value === 1 || value === 100) return changeRole(id, value); }
type Row = Props['users']['items'][number];
const columns: TableColumn<Row>[] = [{ accessorKey: 'username', header: '用户名' }, { accessorKey: 'role', header: '角色' }, { accessorKey: 'lastLoginTime', header: '最近登录（UTC）' }, { id: 'actions', header: '操作' }];
</script>
<template>
  <h1 class="text-2xl font-semibold text-highlighted">用户管理</h1>
  <UCard class="mb-6"><template #header><h2 class="text-lg font-semibold text-highlighted">创建用户</h2></template><Form :form="create" :render-error="actionErrorMessage" class="grid gap-4"><div class="grid grid-cols-1 gap-4 md:grid-cols-2"><UFormField label="用户名" :error="create.errors.username"><UInput v-model="create.data.username" class="w-full" /></UFormField><UFormField label="密码" :error="create.errors.password"><UInput v-model="create.data.password" type="password" autocomplete="new-password" class="w-full" /></UFormField><UFormField label="角色"><USelect v-model="create.data.role" :items="roles" class="w-full" /></UFormField></div><UButton type="submit" :loading="create.pending">创建</UButton><p v-if="create.wasSuccessful" class="text-sm text-success">用户已创建</p></Form></UCard>
  <UCard class="mb-6"><template #header><h2 class="text-lg font-semibold text-highlighted">用户</h2></template><p v-if="role.error || deletion.error" class="whitespace-pre-wrap text-sm text-error">{{ actionErrorMessage(role.error) || actionErrorMessage(deletion.error) }}</p><UTable :data="users.items" :columns="columns" empty="暂无用户" :sorting-options="{ enableSorting: false }" :ui="{ td: 'max-w-sm whitespace-normal wrap-anywhere' }">
      <template #role-cell="{ row }"><USelect :model-value="row.original.role as 0 | 1 | 100" :items="roles" @update:model-value="selectRole(row.original.id, $event)" /></template>
      <template #lastLoginTime-cell="{ row }">{{ row.original.lastLoginTime || '未登录' }}</template>
      <template #actions-cell="{ row }"><UButton color="error" variant="ghost" @click="remove(row.original.id)">{{ row.original.username.startsWith('delete_') ? '永久删除' : '标记删除' }}</UButton></template>
    </UTable><Pagination v-bind="users" path="/admin/user" /></UCard>
  
</template>
