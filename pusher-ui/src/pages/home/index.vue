<template>
    <div> 时间周期 <el-input-number v-model="num" :min="1" :max="60" :step="7" @change="initData" /></div>
    <div style="height: 30vh;">
        <LineChartComponent :titleText="messageCountTitle" :seriesDataName="messageCountDataName"
            :seriesData="messageCountData" />
    </div>

    <el-row>
        <el-col :xs="24" :md="12">
            <div style="height: 30vh;">
                <PieChartComponent :titleText="roomCountTitle" :seriesDataName="roomCountDataName"
                    :seriesData="roomCountData" />
            </div>
        </el-col>
        <el-col :xs="24" :md="12">
            <div style="height: 30vh;">
                <PieChartComponent :titleText="channelCountTitle" :seriesDataName="channelCountDataName"
                    :seriesData="channelCountData" />
            </div>
        </el-col>
    </el-row>

</template>



<script lang="ts" setup>

defineOptions({
    name: 'page-home'
})

import { dashboardGetRecentMessageCountGroupByChannelApi, dashboardGetRecentMessageCountGroupByDayApi, dashboardGetRecentMessageCountGroupByRoomApi } from '@/api/dashboard';
import LineChartComponent from '@/components/charts/LineChart.vue';
import PieChartComponent from '@/components/charts/PieChart.vue';
import type { TypeIntValueSO } from '@/types/pusher/dashboard';
import { dateTimeStringToDateString } from '@/utils/convert';
import { onMounted, ref } from 'vue';


const num = ref(7)
onMounted(async () => {
    initData()
})

const initData = () => {
    getmessageCount()
    getRoomCount()
    getChannelCount()
}


// 最近的消息数量
const messageCountTitle = ref("最近的消息数量")
const messageCountDataName = ref("请求数")
const messageCountData = ref<Array<[string, number]>>([["", 1]])
const getmessageCount = async () => {
    const data = await dashboardGetRecentMessageCountGroupByDayApi(num.value)
    messageCountData.value = data.map(item => [dateTimeStringToDateString(item.date), item.count])
}

// 房间消息数占比
const roomCountTitle = ref("房间消息占比")
const roomCountDataName = ref("房间名")
const roomCountData = ref<Array<TypeIntValueSO>>([])
const getRoomCount = async () => {
    const data = await dashboardGetRecentMessageCountGroupByRoomApi(num.value)
    roomCountData.value = data
}

// 管道消息数占比
const channelCountTitle = ref("管道消息占比")
const channelCountDataName = ref("管道名")
const channelCountData = ref<Array<TypeIntValueSO>>([])
const getChannelCount = async () => {
    const data = await dashboardGetRecentMessageCountGroupByChannelApi(num.value)
    channelCountData.value = data
}





</script>



<style scoped>
div {
    margin-bottom: 1rem;
}
</style>