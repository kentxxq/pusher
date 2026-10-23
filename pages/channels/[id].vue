<script setup lang="ts">
import { Form, Link, useForm } from '@void/vue';
import Pagination from '../../components/Pagination.vue';
import { channelNames } from '../../shared/domain';
import { actionErrorMessage } from '../../shared/action-error';
import type { TableColumn } from '@nuxt/ui';
import type { Props } from './[id].server';
const props = defineProps<Props>();
const params = { id: String(props.channel.id) }, data = { id: props.channel.id, csrf: props.csrf };
const test = useForm('/channels/:id?test', data, { params });
const proxy = useForm('/channels/:id?clearProxy', data, { params });
async function clearProxy() { if (confirm('清除代理配置？')) await proxy.post(); }
type Row = Props['history']['items'][number];
const columns: TableColumn<Row>[] = [{ accessorKey: 'recordedAt', header: '时间（UTC）' }, { accessorKey: 'content', header: '内容' }, { accessorKey: 'status', header: '状态' }, { accessorKey: 'result', header: '结果' }];
</script>
<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 class="text-2xl font-semibold text-highlighted">{{ channel.name }}</h1><p class="text-muted">{{ channelNames[channel.type] }} · 凭据仅写入，不回显。</p></div><Link class="text-primary hover:underline" href="/channels">返回管道列表</Link></div>
  <UCard class="mb-6"><div class="flex flex-wrap items-center gap-2"><Form :form="test" :render-error="actionErrorMessage"><UButton type="submit" :loading="test.pending">发送测试消息</UButton></Form><UButton v-if="channel.hasProxy" variant="outline" @click="clearProxy">清除代理</UButton></div><p v-if="test.wasSuccessful" class="text-sm text-success">测试消息发送成功</p><p v-if="proxy.error" class="whitespace-pre-wrap text-sm text-error">{{ actionErrorMessage(proxy.error) }}</p><p class="text-muted">关联房间：<Link v-for="room in rooms" :key="room.id" :href="`/rooms/${room.id}`" class="text-primary hover:underline mr-3">{{ room.name }}</Link><span v-if="!rooms.length">暂无</span></p></UCard>
  <UCard><template #header><h2 class="text-lg font-semibold text-highlighted">发送历史</h2></template><UTable :data="history.items" :columns="columns" empty="暂无发送记录" :sorting-options="{ enableSorting: false }" :ui="{ td: 'max-w-sm whitespace-normal wrap-anywhere' }">
      <template #content-cell="{ row }"><span class="whitespace-pre-wrap wrap-anywhere">{{ row.original.content }}</span></template>
      <template #status-cell="{ row }"><UBadge :color="row.original.status === 0 ? 'neutral' : row.original.success ? 'success' : 'error'" variant="subtle">{{ row.original.status === 0 ? '待发送' : row.original.success ? '成功' : '失败' }}</UBadge></template>
    </UTable><Pagination v-bind="history" :path="`/channels/${channel.id}`" /></UCard>
</template>
