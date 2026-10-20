<template>
    <div>
        <el-row justify="space-between">
            <div class="left-container">
                <el-button type="primary" @click="openCreateChannel"> 新建管道 </el-button>
                <el-button type="danger" :disabled="selectedRows.length === 0"
                    @click="deleteVisible = true">删除管道</el-button>
                <div v-if="selectedRows.length !== 0" class="selected-count">
                    你选择了{{ selectedRows.length }}个管道
                </div>
            </div>

            <div style="display: flex; align-items: center; justify-self: center;">
                <el-pagination background layout="sizes, prev, pager, next,->, total" v-model:current-page="pageIndex"
                    @change="change" :total="totalCount" />
            </div>

            <div class="right-container">
                <el-input style="width: 10rem;" placeholder="搜索管道名" v-model="searchValue" clearable>
                </el-input>
                <el-button @click="searchChannel">
                    <SvgIcon name="refresh" />
                </el-button>
            </div>
        </el-row>

        <div style="margin-top: 1rem;">
            <el-table ref="tableRef" :data="searchData" :table-layout="'auto'" @selection-change="handleSelectionChange"
                @row-click="rowClick">
                <el-table-column type="selection" width="50" />
                <el-table-column :show-overflow-tooltip="true" prop="channelName" label="管道名称" width="160" />
                <el-table-column prop="channelType" label="管道类型" width="160">
                    <template #default="scope">
                        <el-tag>{{ GetTagDisplayName(scope.row.channelType) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="channelUrl" :show-overflow-tooltip="true" label="管道地址" />
                <el-table-column fixed="right" label="操作">
                    <template #default="scope">
                        <el-button type="success" size="small" @click.stop="TestChannel(scope.row.id)">
                            发送测试信息
                        </el-button>
                        <el-button type="primary" size="small" @click.stop="openUpdateChannel(scope.row.id)">
                            编辑管道
                        </el-button>
                        <el-button type="info" size="small" @click.stop="GetChannelJoinedRooms(scope.row.id)">
                            加入的房间
                        </el-button>
                        <el-button size="small" @click.stop="ShowChannelMessageHistory(scope.row.id)">
                            消息记录
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <!-- 创建/修改 -->
        <el-dialog v-model="createOrUpdateChannelVisible" :title="dialogTitle" @close="onCreateChannelClose">
            <el-form ref="formRef" style="padding: 1rem;" :model="formData" :rules="rules">
                <el-form-item label="管道名称" prop="channelName">
                    <el-input v-model="formData.channelName" placeholder="请输入内容" />
                </el-form-item>
                <el-form-item label="管道类型" prop="channelType">
                    <el-select v-model="formData.channelType" placeholder="请选择" size="large">
                        <el-option v-for="option in channelTypeOptions" :key="option.enumKey"
                            :label="option.enumDisplayName" :value="option.enumKey" />
                    </el-select>
                </el-form-item>
                <el-form-item label="管道地址" prop="channelUrl">
                    <el-input v-model="formData.channelUrl" placeholder="请输入内容" />
                </el-form-item>
                <el-form-item label="代理地址" prop="channelProxyUrl">
                    <el-input v-model="formData.channelProxyUrl" placeholder="请输入内容" />
                </el-form-item>
                <template v-if="formData.channelType === 4">
                    <el-form-item label="加密模式">
                        <el-select v-model="barkConfig.encryptionMode" placeholder="请选择加密模式">
                            <el-option label="None" value="None" />
                            <el-option label="AES128CBC" value="AES128CBC" />
                            <el-option label="AES128ECB" value="AES128ECB" />
                            <el-option label="AES256CBC" value="AES256CBC" />
                            <el-option label="AES256ECB" value="AES256ECB" />
                        </el-select>
                    </el-form-item>
                    <el-form-item v-if="barkConfig.encryptionMode !== 'None'" label="加密密钥(Key)">
                        <el-input v-model="barkConfig.encryptionKey" placeholder="请输入加密密钥" />
                    </el-form-item>
                    <el-form-item v-if="barkConfig.encryptionMode.includes('CBC')" label="加密向量(IV)">
                        <el-input v-model="barkConfig.encryptionIv" placeholder="请输入加密向量" />
                    </el-form-item>
                </template>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="onCreateChannelClose">取消</el-button>
                    <el-button type="primary" @click="onCreateOrUpdateChannelConfirm">
                        确认
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 删除 -->
        <el-dialog v-model="deleteVisible" title="确认删除？" @close="deleteVisible = false">
            <p v-for="selectRow in selectedRows" :key="selectRow.id">
                <el-tag>{{ channels.filter(r => r.id === selectRow.id)[0].channelName }}</el-tag>
            </p>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="deleteVisible = false">取消</el-button>
                    <el-button type="primary" @click="onDeleteChannelConfirm">
                        确认
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 查看加入的rooms -->
        <el-dialog v-model="joinedRoomsVisible" title="加入的rooms" @close="joinedRoomsVisible = false">
            <template v-for="room in joinedRooms" :key="room.id">
                <el-tag style="margin: 1rem;">{{ room.roomName }}
                </el-tag>
            </template>
            <template #footer>
                <div class="dialog-footer">
                    <el-button type="primary" @click="joinedRoomsVisible = false">
                        确认
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 消息记录 -->
        <el-dialog v-model="historyVisible" title="消息记录" @close="historyVisible = false">
            <div style="display: flex; align-items: center; justify-self: center;">
                <el-pagination background layout="sizes, prev, pager, next,->, total"
                    v-model:current-page="historyPageIndex" @change="historyChange" :total="historyTotalCount" />
            </div>
            <el-table :data="history" :table-layout="'auto'"
                :default-sort="{ prop: 'recordTime', order: 'descending' }">
                <el-table-column prop="content" label="文本内容" />
                <el-table-column prop="recordTime" label="时间" sortable :width="dateFixedWidth">
                    <template #default="scope">
                        {{ dateStringFormat(scope.row.recordTime) }}
                    </template>
                </el-table-column>
                <el-table-column prop="status" label="状态">
                    <template #default="scope">
                        {{ toChannelMessageStatus(scope.row.status) }}
                    </template>
                </el-table-column>
                <el-table-column prop="success" label="是否处理成功" />
                <el-table-column prop="result" label="处理结果" />
            </el-table> <template #footer>
                <div class="dialog-footer">
                    <el-button type="primary" @click="historyVisible = false">
                        确认
                    </el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang='ts'>
import { dateStringFormat, toChannelMessageStatus } from '@/utils/convert';
import { computed, onMounted, reactive, ref } from 'vue';
import { BarkEncryptionMode, type BarkChannelConfig, type Channel, type ChannelJoinedRoomsSO, type ChannelMessageHistorySO, type CreateChannelRO, type UpdateChannelRO } from '@/types/pusher/channel'
import { channelCreateChannelApi, channelDeleteChannelApi, channelGetChannelJoinedRoomsApi, channelGetUserChannelsWithPageApi, channelSendTestMessageToChannelApi, channelUpdateChannelApi, channelGetChannelMessageHistoryWithPageApi } from '@/api/channel';
import type { EnumObject } from '@/types/pusher/common';
import { enumChannelEnumApi } from '@/api/enumapi';
import { ElMessage, ElTable, type FormInstance, type FormRules } from 'element-plus';

// 初始化/生命周期
defineOptions({
    name: 'ChannelIndex'
})
const dateFixedWidth: string = import.meta.env.VITE_DATE_FIXED_WIDTH;
const channelTypeOptions = ref<Array<EnumObject>>([])

// 分页
const pageIndex = ref(1)
const pageSize = ref(10)
const totalCount = ref(0)
const change = async (newCurrentPage: number, newPageSize: number) => {
    pageIndex.value = newCurrentPage
    pageSize.value = newPageSize
    await searchChannel();
}

// 挂载
onMounted(async () => {
    channelTypeOptions.value = await enumChannelEnumApi()
    await searchChannel()
})

// 表格
const GetTagDisplayName = (channelType: number) => {
    // const option = channelTypeOptions.value.filter(o => o.enumKey === channelType)[0]
    // return option ? option.enumDisplayName : ""
    return channelTypeOptions.value.filter(o => o.enumKey === channelType)[0].enumDisplayName
}
// 操作
const TestChannel = async (channelId: number) => {
    if (await channelSendTestMessageToChannelApi(channelId)) {
        ElMessage({
            message: "发送成功",
            type: 'success'
        })
    }
}
// 加入的房间
const joinedRoomsVisible = ref(false)
const joinedRooms = ref<ChannelJoinedRoomsSO[]>()
const GetChannelJoinedRooms = async (channelId: number) => {
    joinedRoomsVisible.value = true
    joinedRooms.value = await channelGetChannelJoinedRoomsApi(channelId)
}
// 消息记录
const historyPageIndex = ref(1)
const historyPageSize = ref(10)
const historyTotalCount = ref(0)
const historyChannelId = ref(0)
const historyChange = async (newCurrentPage: number, newPageSize: number) => {
    historyPageIndex.value = newCurrentPage
    historyPageSize.value = newPageSize
    await searchHistory(historyChannelId.value);
}

// 更新分页的数据
const searchHistory = async (channelId: number) => {
    const result = await channelGetChannelMessageHistoryWithPageApi(channelId, historyPageIndex.value, historyPageSize.value)
    history.value = result.pageData
    historyTotalCount.value = result.totalCount
}

const historyVisible = ref(false)
const history = ref<ChannelMessageHistorySO[]>([])
const ShowChannelMessageHistory = async (channelId: number) => {
    await searchHistory(channelId)
    historyChannelId.value = channelId
    historyVisible.value = true
}



let channels = ref<Channel[]>([])

// 搜索按钮
const searchValue = ref('');
const searchData = computed(() => {
    return channels.value.filter(c => c.channelName.indexOf(searchValue.value) !== -1);
})
async function searchChannel() {
    const result = await channelGetUserChannelsWithPageApi(pageIndex.value, pageSize.value)
    channels.value = result.pageData
    totalCount.value = result.totalCount
}

// 创建/修改 管道
const dialogTitle = ref("")
const updateChannelId = ref(0)
const formRef = ref<FormInstance>()
const formData: CreateChannelRO = reactive({
    channelName: '',
    channelType: 0,
    channelUrl: '',
    channelProxyUrl: '',
    channelConfig: null
});
const barkConfig: BarkChannelConfig = reactive({
    encryptionKey: '',
    encryptionIv: '',
    encryptionMode: BarkEncryptionMode.None
});
function resetFormData() {
    formData.channelName = ''
    formData.channelType = 0
    formData.channelUrl = ''
    formData.channelProxyUrl = ''
    formData.channelConfig = null
    barkConfig.encryptionKey = ''
    barkConfig.encryptionIv = ''
    barkConfig.encryptionMode = BarkEncryptionMode.None
}

const rules = reactive<FormRules<CreateChannelRO>>({
    channelName: [
        { required: true, message: '必填', trigger: 'blur' }
    ],
    channelType: [
        { required: true, message: '必填', trigger: 'blur' },
    ],
    channelUrl: [
        { required: true, message: '必填', trigger: 'blur' },
        // { type: 'url', message: '请输入正确的 Url 地址', trigger: 'blur' },
        // { type: 'email', message: '请输入正确的 email 地址', trigger: 'blur' }
    ],
    channelProxyUrl: [
        { type: 'url', message: '请输入正确的 Url 地址', trigger: 'blur' }
    ]
})
const createOrUpdateChannelVisible = ref(false)
function openCreateChannel() {
    createOrUpdateChannelVisible.value = true
    dialogTitle.value = "创建管道"
}
function openUpdateChannel(channelId: number) {
    const channel = channels.value.filter(c => c.id === channelId)[0]
    formData.channelName = channel.channelName
    formData.channelProxyUrl = channel.channelProxyUrl
    formData.channelType = channel.channelType
    formData.channelUrl = channel.channelUrl
    formData.channelConfig = channel.channelConfig
    
    if (channel.channelType === 4 && channel.channelConfig) {
        try {
            const parsed = JSON.parse(channel.channelConfig) as BarkChannelConfig
            barkConfig.encryptionMode = parsed.encryptionMode || BarkEncryptionMode.None
            barkConfig.encryptionKey = parsed.encryptionKey || ''
            barkConfig.encryptionIv = parsed.encryptionIv || ''
        } catch {
            barkConfig.encryptionMode = BarkEncryptionMode.None
            barkConfig.encryptionKey = ''
            barkConfig.encryptionIv = ''
        }
    }

    createOrUpdateChannelVisible.value = true
    dialogTitle.value = "修改管道"
    updateChannelId.value = channel.id
}
async function createChannel(createChannelRO: CreateChannelRO) {
    var result = await channelCreateChannelApi(createChannelRO)
    ElMessage({
        message: `成功创建管道${result}`,
        type: 'success',
    })
}
async function updateChannel(createChannelRO: CreateChannelRO) {
    var result = await channelUpdateChannelApi({ ...createChannelRO, id: updateChannelId.value })
    ElMessage({
        message: `成功修改管道${result}`,
        type: 'success',
    })
}
async function onCreateOrUpdateChannelConfirm() {
    if (!formRef.value) return
    await formRef.value.validate(async (valid, fields) => {
        if (valid) {
            if (formData.channelType === 4) {
                formData.channelConfig = JSON.stringify(barkConfig)
            } else {
                formData.channelConfig = null
            }

            if (dialogTitle.value === '创建管道') {
                await createChannel({ ...formData })
            } else if (dialogTitle.value === '修改管道') {
                await updateChannel({ ...formData })
            }

            createOrUpdateChannelVisible.value = false
            resetFormData()
            await searchChannel()
        } else {
            ElMessage({
                message: `校验不通过`,
                type: 'warning',
            })
        }
    })
}
function onCreateChannelClose() {
    resetFormData()
    createOrUpdateChannelVisible.value = false
}



// 删除管道
const selectedRows = ref<Channel[]>([])
// 选中就赋值
const handleSelectionChange = (val: Channel[]) => {
    selectedRows.value = val
}
const tableRef = ref<InstanceType<typeof ElTable>>()
const rowClick = (row: Channel, column: any, event: Event) => {
    if (selectedRows.value.some(r => r.id === row.id)) {
        tableRef.value?.toggleRowSelection(row, false)
    } else {
        tableRef.value?.toggleRowSelection(row, true)
    }
}
const deleteVisible = ref(false)
const onDeleteChannelConfirm = async () => {
    var deleteKeys = selectedRows.value!.map(row => row.id);
    const result = await channelDeleteChannelApi(deleteKeys)
    deleteVisible.value = false;
    await searchChannel()
    ElMessage({
        message: `成功删除${result}个管道`,
        type: 'success',
    })
};

</script>



<style scoped>
.left-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem
}

.right-container {
    display: flex;
    gap: 1rem
}
</style>