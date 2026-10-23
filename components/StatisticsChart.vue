<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';
import { statisticsOption, type ChartDatum, type ChartKind } from '../shared/chart-options';

use([LineChart, PieChart, GridComponent, TooltipComponent, CanvasRenderer]);
const props = defineProps<{ kind: ChartKind; title: string; data: ChartDatum[] }>();
const option = computed(() => statisticsOption(props.kind, props.title, props.data));
</script>
<template>
  <div class="h-80 w-full min-w-0" role="figure" :aria-label="title">
    <VChart v-if="data.length" :option="option" autoresize class="h-full w-full" />
    <UEmpty v-else title="暂无统计数据" class="h-full" />
  </div>
</template>
