<script setup lang="ts">
import StatisticsOverview from '../components/StatisticsOverview.vue';
import type { Props } from './index.server';
defineProps<Props>();
</script>
<template>
  <StatisticsOverview title="消息概览" room-label="我的房间" :days="days" :stats="stats" :sections="[{ title: '房间消息占比', data: stats.byRoom }, { title: '管道发送占比', data: stats.byChannel }]" />
</template>
