<script setup lang="ts">
import { computed } from 'vue';
import StatisticsOverview from '../../components/StatisticsOverview.vue';
import { channelNames } from '../../shared/domain';
import type { Props } from './dashboard.server';
const props = defineProps<Props>();
const sections = computed(() => [
  { title: '用户消息占比', data: props.stats.byUser },
  { title: '当前管道类型占比', data: props.stats.byChannelType.map(row => ({ ...row, name: channelNames[Number(row.name)] || row.name })) },
]);
</script>
<template>
  <StatisticsOverview title="全局仪表盘" room-label="全部房间" :days="days" :stats="stats" :sections="sections" />
</template>
