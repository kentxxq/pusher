<script setup lang="ts">
import { Form, Link, useForm } from '@void/vue';
import Pagination from '../../components/Pagination.vue';
import { actionErrorMessage } from '../../shared/action-error';
import type { TableColumn } from '@nuxt/ui';
import type { Props } from './[id].server';
const props = defineProps<Props>();
const params = { id: String(props.room.id) };
const send = useForm('/rooms/:id?send', { id: props.room.id, content: '', templateCode: '', csrf: props.csrf }, { params });
const channels = useForm('/rooms/:id?channels', { id: props.room.id, channelIds: [...props.channelIds], csrf: props.csrf }, { params });
const clear = useForm('/rooms/:id?clearKey', { id: props.room.id, csrf: props.csrf }, { params });
async function clearKey() { if (confirm('清除房间密钥后，无密钥的请求也能推送。确认清除？')) await clear.post(); }
type Row = Props['history']['items'][number];
const columns: TableColumn<Row>[] = [{ accessorKey: 'recordedAt', header: '时间（UTC）' }, { accessorKey: 'content', header: '内容' }];
</script>
<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 class="text-2xl font-semibold text-highlighted">{{ room.name }}</h1><p class="font-mono text-xs wrap-anywhere">{{ room.code }}</p></div><Link class="text-primary hover:underline" href="/rooms">返回房间列表</Link></div>
  <UCard class="mb-6"><template #header><h2 class="text-lg font-semibold text-highlighted">推送入口</h2></template><p class="font-mono text-xs wrap-anywhere">GET /pusher.webapi/Room/SendMessageByGet/{{ room.code }}?content=消息内容</p><p class="font-mono text-xs wrap-anywhere">POST /pusher.webapi/Room/SendMessageByPost/{{ room.code }}</p><p v-if="room.hasKey">已启用密钥，请在调用中提供 roomKey。</p><UButton v-if="room.hasKey" color="error" variant="outline" @click="clearKey">清除密钥</UButton><p v-if="clear.error" class="whitespace-pre-wrap text-sm text-error">{{ actionErrorMessage(clear.error) }}</p></UCard>
  <div class="grid grid-cols-1 items-start gap-4 sm:grid-cols-2"><UCard class="min-w-0"><template #header><h2 class="text-lg font-semibold text-highlighted">关联管道</h2></template><Form :form="channels" :render-error="actionErrorMessage" class="grid gap-4">
      <p class="text-sm text-muted">已选 {{ channels.data.channelIds.length }} / {{ props.channels.length }} 个管道，点击列表项切换关联，保存后生效。</p>
      <UListbox v-model="channels.data.channelIds" :items="props.channels" value-key="id" label-key="name" multiple selection-behavior="toggle" :filter="{ placeholder: '搜索管道名称', disabled: channels.pending }" :disabled="channels.pending" virtualize aria-label="关联管道" :ui="{ content: 'h-64 overflow-y-auto' }">
        <template #item-label="{ item }"><span :title="item.name">{{ item.name }}</span></template>
        <template #empty="{ searchTerm }">{{ searchTerm ? '没有匹配的管道' : '请先创建管道' }}</template>
      </UListbox>
      <UButton type="submit" :loading="channels.pending">保存关联</UButton><p v-if="channels.wasSuccessful" class="text-sm text-success">关联已更新</p></Form></UCard>
    <UCard><template #header><h2 class="text-lg font-semibold text-highlighted">发送消息</h2></template><Form :form="send" :render-error="actionErrorMessage" class="grid gap-4"><UFormField label="消息内容" :error="send.errors.content"><UTextarea v-model="send.data.content" class="w-full" /></UFormField><UFormField label="模板代码（可选）"><UInput v-model="send.data.templateCode" class="w-full" /></UFormField><UButton type="submit" :loading="send.pending">发送</UButton><p v-if="send.wasSuccessful" class="text-sm text-success">已处理，请在管道历史中查看发送结果。</p></Form></UCard></div>
  <UCard><template #header><h2 class="text-lg font-semibold text-highlighted">消息历史</h2></template><UTable :data="history.items" :columns="columns" empty="暂无消息" :sorting-options="{ enableSorting: false }" :ui="{ td: 'max-w-sm whitespace-normal wrap-anywhere' }">
      <template #content-cell="{ row }"><span class="whitespace-pre-wrap wrap-anywhere">{{ row.original.content }}</span></template>
    </UTable><Pagination v-bind="history" :path="`/rooms/${room.id}`" /></UCard>
</template>
