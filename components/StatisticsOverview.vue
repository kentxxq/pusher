<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref } from 'vue';
import { useRouter } from '@void/vue';
import type { ChartDatum } from '../shared/chart-options';

const props = defineProps<{
  title: string;
  roomLabel: string;
  days: number;
  stats: { roomCount: number; channelCount: number; messageCount: number; failureCount: number; byDay: ChartDatum[] };
  sections: { title: string; data: ChartDatum[] }[];
}>();
const router = useRouter();
const mounted = ref(false);
onMounted(() => { mounted.value = true; });
const Chart = defineAsyncComponent(() => import('./StatisticsChart.vue'));
function changeDays(value: number | undefined) {
  if (value === undefined || !Number.isInteger(value) || value < 1 || value > 60 || value === props.days) return;
  const query = new URLSearchParams(router.url.search);
  query.set('days', String(value));
  router.visit(router.url.pathname + '?' + query);
}
</script>
<template>
  <div class="flex flex-wrap items-center justify-between gap-4">
    <h1 class="text-2xl font-semibold text-highlighted">{{ title }}</h1>
    <UFormField label="时间周期（天）"><UInputNumber :model-value="days" :min="1" :max="60" @update:model-value="changeDays" /></UFormField>
  </div>
  <div class="grid grid-cols-2 gap-4 xl:grid-cols-4">
    <UCard>{{ roomLabel }}<div class="mt-3 text-4xl font-semibold">{{ stats.roomCount }}</div></UCard>
    <UCard>推送管道<div class="mt-3 text-4xl font-semibold">{{ stats.channelCount }}</div></UCard>
    <UCard>接收消息<div class="mt-3 text-4xl font-semibold">{{ stats.messageCount }}</div></UCard>
    <UCard>失败发送<div class="mt-3 text-4xl font-semibold">{{ stats.failureCount }}</div></UCard>
  </div>
  <UCard><template #header><h2 class="text-lg font-semibold">每日消息</h2></template>
    <Chart v-if="mounted" kind="line" title="每日消息" :data="stats.byDay" />
    <div v-else class="grid h-80 place-items-center text-muted" role="status">图表加载中</div>
  </UCard>
  <div class="grid gap-6 xl:grid-cols-2">
    <UCard v-for="section in sections" :key="section.title">
      <template #header><h2 class="text-lg font-semibold">{{ section.title }}</h2></template>
      <Chart v-if="mounted" kind="pie" :title="section.title" :data="section.data" />
      <div v-else class="grid h-80 place-items-center text-muted" role="status">图表加载中</div>
    </UCard>
  </div>
</template>
