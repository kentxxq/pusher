<template>
    <v-chart class="chart" :autoresize="true" :option="chartOption" />
</template>

<script setup lang='ts'>
defineOptions({
    name: 'pie-chart'
})


import { use } from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ComposeOption } from 'echarts/core'
import type { PieSeriesOption } from 'echarts/charts'
import type {
    TitleComponentOption,
    TooltipComponentOption
} from 'echarts/components'
import { ref, watch } from 'vue';
import type { TypeIntValueSO } from '@/types/pusher/dashboard';

use([TitleComponent, TooltipComponent, PieChart, CanvasRenderer])

type EChartsOption = ComposeOption<
    | TitleComponentOption
    | TooltipComponentOption
    | PieSeriesOption
>


const props = withDefaults(defineProps<{ titleText: string, seriesDataName: string, seriesData: Array<TypeIntValueSO> }>(), {
    titleText: () => "默认标题",
    seriesDataName: () => "默认数据名称",
    // 如果数据项太多,建议把前10展示出来,其他的都合并到其他,然后传入
    seriesData: () => []
})


const chartOption = ref<EChartsOption>({
    title: {
        text: props.titleText,
        left: 'center'
    },
    tooltip: {
        trigger: 'item',
        formatter: "{a} <br/>{b}: {c} ({d}%)"
    },
    series: [
        {
            name: props.seriesDataName,
            type: 'pie',
            radius: '60%',
            data: props.seriesData,
            // 太长了,会变成省略号
            // label: {
            //     show: true,
            //     formatter: '{b}: {c} ({d}%)'
            // },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }
    ]
});

// Watch for changes in props and update the chart options accordingly
watch(() => props.titleText, (newTitle) => {
    chartOption.value.title = { text: newTitle };
});

watch(() => props.seriesData, (newData) => {
    chartOption.value.series = [{ data: newData }];
});

</script>

<style scoped></style>