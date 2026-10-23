<script setup lang="ts">
import { ref } from 'vue';
import { Form, Link, useForm } from '@void/vue';
import { channelNames } from '../shared/domain';
import SearchForm from '../components/SearchForm.vue';
import Pagination from '../components/Pagination.vue';
import { actionErrorMessage } from '../shared/action-error';
import type { TableColumn } from '@nuxt/ui';
import type { Props } from './channels.server';

const props = defineProps<Props>();
const open = ref(false);
const form = useForm('/channels?save', { id: 0, name: '', type: 0, url: '', proxy: '', config: '', csrf: props.csrf });
const deletion = useForm('/channels?delete', { id: 0, csrf: props.csrf });
const types = channelNames.map((label, value) => ({ label, value }));

function edit(row?: Props['list']['items'][number]) {
  form.clearError();
  form.clearErrors();
  Object.assign(form.data, { id: row?.id ?? 0, name: row?.name ?? '', type: row?.type ?? 0, url: '', proxy: '', config: '' });
  open.value = true;
}

async function save() {
  form.data.csrf = props.csrf;
  await form.post();
  if (form.wasSuccessful) open.value = false;
}

async function remove(id: number) {
  if (confirm('删除管道及其关联？')) {
    deletion.data.id = id;
    await deletion.post();
  }
}

type Row = Props['list']['items'][number];
const columns: TableColumn<Row>[] = [
  { accessorKey: 'name', header: '名称' },
  { accessorKey: 'type', header: '类型' },
  { id: 'config', header: '配置' },
  { id: 'actions', header: '操作' }
];
</script>
<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <h1 class="text-2xl font-semibold text-highlighted">推送管道</h1>
    <UButton @click="edit()">新建管道</UButton>
  </div>
  <UCard>
    <SearchForm path="/channels" :search="search" placeholder="搜索管道" />
    <p v-if="deletion.error" class="whitespace-pre-wrap text-sm text-error">{{ actionErrorMessage(deletion.error) }}</p>
    <UTable :data="list.items" :columns="columns" empty="暂无管道" :sorting-options="{ enableSorting: false }" :ui="{ td: 'max-w-sm whitespace-normal wrap-anywhere' }">
      <template #name-cell="{ row }"><Link class="text-primary hover:underline" :href="'/channels/' + row.original.id">{{ row.original.name }}</Link></template>
      <template #type-cell="{ row }">{{ channelNames[row.original.type] }}</template>
      <template #config-cell="{ row }">{{ row.original.hasUrl ? '地址已设置' : '地址未设置' }} / {{ row.original.hasProxy ? '使用代理' : '直连' }}</template>
      <template #actions-cell="{ row }"><div class="flex flex-wrap items-center gap-2"><UButton variant="ghost" @click="edit(row.original)">编辑</UButton><Link class="text-primary hover:underline" :href="'/channels/' + row.original.id">详情与测试</Link><UButton color="error" variant="ghost" @click="remove(row.original.id)">删除</UButton></div></template>
    </UTable>
    <Pagination v-bind="list" path="/channels" :search="search" />
  </UCard>

  <UModal v-model:open="open" :title="form.data.id ? '编辑管道' : '新建管道'" :dismissible="!form.pending" :close="!form.pending">
    <template #body>
      <Form :form="{ ...form, post: save }" :render-error="actionErrorMessage" class="grid gap-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UFormField label="名称" :error="form.errors.name"><UInput v-model="form.data.name" class="w-full" /></UFormField>
          <UFormField label="类型" :error="form.errors.type"><USelect v-model="form.data.type" :items="types" class="w-full" /></UFormField>
        </div>
        <UFormField label="管道地址 / 收件邮箱" :error="form.errors.url"><UInput v-model="form.data.url" type="password" autocomplete="new-password" class="w-full" /></UFormField>
        <UFormField label="代理地址（可选）" :error="form.errors.proxy"><UInput v-model="form.data.proxy" type="password" autocomplete="new-password" class="w-full" /></UFormField>
        <UFormField label="管道 JSON 配置（可选，Bark 加密配置在此填写）" :error="form.errors.config"><UTextarea v-model="form.data.config" class="w-full" /></UFormField>
        <div class="flex justify-end gap-2">
          <UButton type="button" color="neutral" variant="ghost" :disabled="form.pending" @click="open = false">取消</UButton>
          <UButton type="submit" :loading="form.pending">保存</UButton>
        </div>
      </Form>
    </template>
  </UModal>
</template>
