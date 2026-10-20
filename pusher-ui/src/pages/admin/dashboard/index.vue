<template>
    <div> 时间周期 <el-input-number v-model="num" :min="1" :max="60" :step="7" @change="initData" /></div>
    <div style="height: 30vh;">
        <LineChartComponent :titleText="messageCountTitle" :seriesDataName="messageCountDataName"
            :seriesData="messageCountData" />
    </div>

    <el-row>
        <el-col :xs="24" :md="12">
            <div style="height: 30vh;">
                <PieChartComponent :titleText="userCountTitle" :seriesDataName="userCountDataName"
                    :seriesData="userCountData" />
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
    name: 'admin-dashboard-index'
})

import { adminGetChannelCountGroupByChannelTypeApi, adminGetRecentMessageCountGroupByDayApi, adminGetRecentMessageCountGroupByUserApi } from '@/api/admin';
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
    getUserCount()
    getChannelCount()
}


// 最近的消息数量
const messageCountTitle = ref("最近的消息数量")
const messageCountDataName = ref("请求数")
const messageCountData = ref<Array<[string, number]>>([["", 1]])
const getmessageCount = async () => {
    const data = await adminGetRecentMessageCountGroupByDayApi(num.value)
    messageCountData.value = data.map(item => [dateTimeStringToDateString(item.date), item.count])
}

// 用户消息数占比
const userCountTitle = ref("最近的用户消息占比")
const userCountDataName = ref("用户名")
const userCountData = ref<Array<TypeIntValueSO>>([])
const getUserCount = async () => {
    const data = await adminGetRecentMessageCountGroupByUserApi(num.value)
    userCountData.value = data
}

// 管道类型占比
const channelCountTitle = ref("当前管道类型占比")
const channelCountDataName = ref("管道类型")
const channelCountData = ref<Array<TypeIntValueSO>>([])
const getChannelCount = async () => {
    const data = await adminGetChannelCountGroupByChannelTypeApi()
    channelCountData.value = data
}





</script>



<style scoped>
div {
    margin-bottom: 1rem;
}
</style>