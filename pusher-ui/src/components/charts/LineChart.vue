<template>
    <v-chart class="chart" :autoresize="true" :option="chartOption" />
</template>

<script lang="ts" setup>
defineOptions({
    name: "line-chart"
})

import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
    TitleComponent,
    TooltipComponent,
    // ToolboxComponent,
    GridComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ComposeOption } from 'echarts/core'
import type { LineSeriesOption } from 'echarts/charts'
import type {
    TitleComponentOption,
    TooltipComponentOption,
    // ToolboxComponentOption,
    GridComponentOption
} from 'echarts/components'
import { ref, watch } from 'vue';

use([
    TitleComponent,
    TooltipComponent,
    // ToolboxComponent,
    GridComponent,
    LineChart,
    CanvasRenderer
])

type EChartsOption = ComposeOption<
    | TitleComponentOption
    | TooltipComponentOption
    // | ToolboxComponentOption
    | GridComponentOption
    | LineSeriesOption
>


// const props = defineProps<{
//     titleText: string;
//     seriesData: Array<[string, number]>
// }>();

const props = withDefaults(defineProps<{ titleText: string, seriesDataName: string, seriesData: Array<[string, number]> }>(), {
    titleText: () => "默认标题",
    seriesDataName: () => "默认数据名称",
    seriesData: () => []
})

const chartOption = ref<EChartsOption>({
    title: {
        text: props.titleText,
        left: 'center'
    },
    tooltip: {
        trigger: 'axis',
        // todo 日期去掉时间
        // formatter: function (params) {
        //     var date = new Date(params[0].value[0]);
        //     var year = date.getFullYear();
        //     var month = (date.getMonth() + 1).toString().padStart(2, '0');
        //     var day = date.getDate().toString().padStart(2, '0');
        //     var formattedDate = `${year}-${month}-${day}`;
        //     var value = params[0].value[1];
        //     return `${formattedDate}<br/>请求数: ${value}`;
        // }
    },
    // toolbox: {
    //     show: true,
    //     feature: {
    //         dataView: { readOnly: false },
    //         saveAsImage: {}
    //     }
    // },
    xAxis: {
        type: 'time',
        axisLabel: {
            formatter: function (value) {
                var date = new Date(value);
                var year = date.getFullYear();
                var month = (date.getMonth() + 1).toString().padStart(2, '0');
                var day = date.getDate().toString().padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        }
    },
    yAxis: {
        type: 'value'
    },
    series: [
        {
            name: props.seriesDataName,
            data: props.seriesData,
            type: 'line',
            smooth: true
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

<style scoped>
.chart {
    width: 100%;
}
</style>
