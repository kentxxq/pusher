<script setup lang="ts">
import { ref } from 'vue';
import { Form, Link, useForm } from '@void/vue';
import SearchForm from '../components/SearchForm.vue';
import Pagination from '../components/Pagination.vue';
import { actionErrorMessage } from '../shared/action-error';
import type { TableColumn } from '@nuxt/ui';
import type { Props } from './rooms.server';

const props = defineProps<Props>();
const open = ref(false);
const form = useForm('/rooms?save', { id: 0, name: '', code: '', key: '', csrf: props.csrf });
const deletion = useForm('/rooms?delete', { id: 0, csrf: props.csrf });

function edit(row?: Props['list']['items'][number]) {
  form.clearError();
  form.clearErrors();
  Object.assign(form.data, { id: row?.id ?? 0, name: row?.name ?? '', code: row?.code ?? '', key: '' });
  open.value = true;
}

async function save() {
  form.data.csrf = props.csrf;
  await form.post();
  if (form.wasSuccessful) open.value = false;
}

async function remove(id: number) {
  if (confirm('删除房间及其消息记录？')) {
    deletion.data.id = id;
    await deletion.post();
  }
}

type Row = Props['list']['items'][number];
const columns: TableColumn<Row>[] = [
  { accessorKey: 'name', header: '房间' },
  { accessorKey: 'code', header: '代码' },
  { accessorKey: 'hasKey', header: '密钥' },
  { id: 'actions', header: '操作' }
];
</script>
<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <h1 class="text-2xl font-semibold text-highlighted">房间</h1>
    <UButton @click="edit()">新建房间</UButton>
  </div>
  <UCard>
    <SearchForm path="/rooms" :search="search" placeholder="搜索房间名称或代码" />
    <p v-if="deletion.error" class="whitespace-pre-wrap text-sm text-error">{{ actionErrorMessage(deletion.error) }}</p>
    <UTable :data="list.items" :columns="columns" empty="暂无房间" :sorting-options="{ enableSorting: false }" :ui="{ td: 'max-w-sm whitespace-normal wrap-anywhere' }">
      <template #name-cell="{ row }"><Link class="text-primary hover:underline" :href="'/rooms/' + row.original.id">{{ row.original.name }}</Link></template>
      <template #code-cell="{ row }"><span class="font-mono text-xs wrap-anywhere">{{ row.original.code }}</span></template>
      <template #hasKey-cell="{ row }">{{ row.original.hasKey ? '已设置' : '未设置' }}</template>
      <template #actions-cell="{ row }"><div class="flex flex-wrap items-center gap-2"><UButton variant="ghost" @click="edit(row.original)">编辑</UButton><Link class="text-primary hover:underline" :href="'/rooms/' + row.original.id">详情</Link><UButton color="error" variant="ghost" @click="remove(row.original.id)">删除</UButton></div></template>
    </UTable>
    <Pagination v-bind="list" path="/rooms" :search="search" />
  </UCard>

  <UModal v-model:open="open" :title="form.data.id ? '编辑房间' : '新建房间'" :dismissible="!form.pending" :close="!form.pending">
    <template #body>
      <Form :form="{ ...form, post: save }" :render-error="actionErrorMessage" class="grid gap-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UFormField label="房间名称" :error="form.errors.name"><UInput v-model="form.data.name" class="w-full" /></UFormField>
          <UFormField label="房间代码（留空自动生成）" :error="form.errors.code"><UInput v-model="form.data.code" class="w-full" /></UFormField>
        </div>
        <UFormField label="密钥（编辑时留空保留）" :error="form.errors.key"><UInput v-model="form.data.key" type="password" autocomplete="new-password" class="w-full" /></UFormField>
        <div class="flex justify-end gap-2">
          <UButton type="button" color="neutral" variant="ghost" :disabled="form.pending" @click="open = false">取消</UButton>
          <UButton type="submit" :loading="form.pending">保存</UButton>
        </div>
      </Form>
    </template>
  </UModal>
</template>
