<template>
    <div>
        <!-- 查询表单 -->
        <el-row justify="space-between">
            <div class="left-container">
                <el-button type="primary" @click="openCreateRoomVisible"> 新建房间 </el-button>
                <el-button type="danger" :disabled="selectedRows.length === 0"
                    @click="deleteVisible = true">删除房间</el-button>
                <div v-if="selectedRows.length !== 0" class="selected-count">
                    你选择了{{ selectedRows.length }}个房间
                </div>
            </div>

            <div style="display: flex; align-items: center; justify-self: center;">
                <el-pagination background layout="sizes, prev, pager, next,->, total" v-model:current-page="pageIndex"
                    @change="change" :total="totalCount" />
            </div>

            <div class="right-container">
                <el-input style="width: 10rem;" placeholder="搜索房间名" v-model="searchValue" clearable>
                </el-input>
                <el-button @click="searchRoom">
                    <SvgIcon name="refresh" />
                </el-button>
            </div>
        </el-row>

        <!-- 表格 -->
        <div style="margin-top: 1rem;">
            <el-table ref="tableRef" :data="searchData" :table-layout="'auto'" @selection-change="handleSelectionChange"
                @row-click="rowClick">
                <el-table-column type="selection" width="50" />
                <el-table-column prop="roomName" label="房间名" width="160" />
                <el-table-column prop="roomCode" :show-overflow-tooltip="true" label="房间代码" />
                <el-table-column prop="roomKey" label="房间密钥" />
                <el-table-column prop="createDate" label="创建时间" :width="dateFixedWidth">
                    <template #default="scope">
                        {{ dateStringFormat(scope.row.createDate) }}
                    </template>
                </el-table-column>
                <el-table-column fixed="right" label="操作">
                    <template #default="scope">
                        <el-button type="primary" size="small" @click.stop="UpdateRoomChannel(scope.row.id)">
                            关联管道
                        </el-button>
                        <el-button type="primary" size="small" @click.stop="UpdateRoom(scope.row.id)">
                            修改房间
                        </el-button>
                        <el-button type="success" size="small"
                            @click.stop="SendTestMessage(scope.row.roomCode, scope.row.roomKey)">
                            发送测试信息
                        </el-button>
                        <el-button type="info" size="small" @click.stop="CopyUrl(scope.row.roomCode, 'Get')">
                            复制get地址
                        </el-button>
                        <el-button type="info" size="small" @click.stop="CopyUrl(scope.row.roomCode, 'Post')">
                            复制post地址
                        </el-button>
                        <el-button size="small" @click.stop="ShowRoomMessageHistory(scope.row.id)">
                            消息记录
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <!-- 新增/修改 -->
        <el-dialog v-model="createOrUpdateRoomVisible" :title="dialogTitle" @close="onRoomVisibleClose">
            <el-form ref="formRef" style="padding: 1rem;" :model="formData" :rules="rules">
                <el-form-item label="房间名称" prop="roomName">
                    <el-input v-model="formData.roomName" placeholder="请输入内容" />
                </el-form-item>
                <el-form-item label="房间Code" prop="roomCode">
                    <el-input v-model="formData.roomCode" placeholder="请输入内容" />
                </el-form-item>
                <el-form-item label="房间Key" prop="roomKey">
                    <el-input v-model="formData.roomKey" placeholder="请输入内容" />
                </el-form-item>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="onRoomVisibleClose">取消</el-button>
                    <el-button type="primary" @click="onCreateOrUpdateChannelConfirm">
                        确认
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 删除 -->
        <el-dialog v-model="deleteVisible" title="确认删除？" @close="deleteVisible = false">
            <p v-for="selectRow in selectedRows" :key="selectRow.id">
                <el-tag>{{ rooms.filter(r => r.id === selectRow.id)[0].roomName }}</el-tag>
            </p>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="deleteVisible = false">取消</el-button>
                    <el-button type="primary" @click="onDeleteRoomConfirm">
                        确认
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 关联 -->
        <el-dialog v-model="relationVisible" title="管道配置" @close="onRoomVisibleClose">
            <div style="display: flex;justify-content: center;align-items: center;">
                <el-transfer v-model="roomChannelIds" :data="transferData" :titles="['未加入的房间', '已加入的房间']" filterable />
            </div>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="onRelationClose">取消</el-button>
                    <el-button type="primary" @click="onRelationConfirm">
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
import { roomCreateRoomApi, roomDeleteRoomApi, roomGetRoomsWithPageApi, roomSendMessageByGetApi, roomGetRoomChannelsApi, roomUpdateRoomChannelApi, roomGetRoomMessageHistoryWithPageApi as roomGetRoomMessageHistoryWithPageApi, roomUpdateRoomApi } from '@/api/room';
import { computed, onMounted, reactive, ref } from 'vue';
import type { CreateRoomRO, Room, RoomMessageHistorySO, UpdateRoomRO } from '@/types/pusher/room'
import { ElMessage, ElTable, type FormInstance, type FormRules } from 'element-plus';
import { dateStringFormat } from '@/utils/convert';
import type { Channel } from '@/types/pusher/channel';
import { channelGetUserChannelsApi } from '@/api/channel';
import useClipboard from 'vue-clipboard3'
import { v4 as uuidv4 } from 'uuid';


defineOptions({
    name: 'RoomIndex'
})


// 分页
const pageIndex = ref(1)
const pageSize = ref(10)
const totalCount = ref(0)
const change = async (newCurrentPage: number, newPageSize: number) => {
    pageIndex.value = newCurrentPage
    pageSize.value = newPageSize
    await searchRoom();
}

const dateFixedWidth: string = import.meta.env.VITE_DATE_FIXED_WIDTH;
let rooms = ref<Room[]>([])
const searchValue = ref('');
const searchData = computed(() => {
    return rooms.value.filter(r => r.roomName.indexOf(searchValue.value) !== -1);
})

onMounted(async () => {
    await searchRoom()
})

// 搜索按钮
async function searchRoom() {
    const result = await roomGetRoomsWithPageApi(pageIndex.value, pageSize.value)
    rooms.value = result.pageData
    totalCount.value = result.totalCount
}

// 创建/编辑房间
const dialogTitle = ref('')
const formData: CreateRoomRO = reactive({
    roomName: '',
    roomCode: uuidv4(),
    roomKey: '',
});
function initFormData() {
    formData.roomName = ''
    formData.roomCode = uuidv4()
    formData.roomKey = ''
}
const rules = reactive<FormRules<CreateRoomRO>>({
    roomName: [
        { required: true, message: '必填', trigger: 'blur' }
    ],
    roomCode: [
        { required: true, message: '必填', trigger: 'blur' },
    ],
    // roomKey: [
    //     { required: true, message: '必填', trigger: 'blur' },
    // ]
})
const createOrUpdateRoomVisible = ref(false)
const updateRoomId = ref(0)
function openCreateRoomVisible() {
    dialogTitle.value = '创建房间'
    createOrUpdateRoomVisible.value = true
    initFormData()
}
function UpdateRoom(roomId: number) {
    dialogTitle.value = '修改房间'
    updateRoomId.value = roomId
    const data = rooms.value.filter(r => r.id === roomId)[0]
    formData.roomName = data.roomName
    formData.roomCode = data.roomCode
    formData.roomKey = data.roomKey ?? ''
    createOrUpdateRoomVisible.value = true
}

async function createRoom(createRoomRO: CreateRoomRO) {
    var result = await roomCreateRoomApi(createRoomRO)
    ElMessage({
        message: `成功创建房间: ${result}`,
        type: 'success',
    })
}
async function updateRoom(updateRoomRO: UpdateRoomRO) {
    var result = await roomUpdateRoomApi(updateRoomRO)
    ElMessage({
        message: `操作完成: ${result}`,
        type: 'success',
    })
}
const formRef = ref<FormInstance>()
async function onCreateOrUpdateChannelConfirm() {
    if (!formRef.value) return
    await formRef.value.validate(async (valid, fields) => {
        if (valid) {
            if (dialogTitle.value === '创建房间') {
                await createRoom({ ...formData })
            } else if (dialogTitle.value === '修改房间') {
                await updateRoom({ id: updateRoomId.value, ...formData })
            }

            createOrUpdateRoomVisible.value = false
            await searchRoom()
        } else {
            ElMessage({
                message: `校验不通过`,
                type: 'warning',
            })
        }
    })
}
function onRoomVisibleClose() {
    createOrUpdateRoomVisible.value = false
}

// 删除房间
const tableRef = ref<InstanceType<typeof ElTable>>()
const rowClick = (row: Room, column: any, event: Event) => {
    if (selectedRows.value.some(r => r.id === row.id)) {
        tableRef.value?.toggleRowSelection(row, false)
    } else {
        tableRef.value?.toggleRowSelection(row, true)
    }
}
const deleteVisible = ref(false)
// 选中了行
const selectedRows = ref<Room[]>([])
// 选中就赋值
const handleSelectionChange = (val: Room[]) => {
    selectedRows.value = val
}
const onDeleteRoomConfirm = async () => {
    var deleteKeys = selectedRows.value!.map(row => row.id);
    const result = await roomDeleteRoomApi(deleteKeys)
    deleteVisible.value = false;
    await searchRoom()
    ElMessage({
        message: `成功删除${result}个房间`,
        type: 'success',
    })
};


// 操作
// 关联管道
const relationVisible = ref(false)
const roomChannelIds = ref<number[]>([])
const allChannels = ref<Channel[]>([])

interface Option {
    key: number
    label: string
    disabled: boolean
}

const transferData = ref<Option[]>()
const relationRoomId = ref<number>()
const UpdateRoomChannel = async (roomId: number) => {
    relationRoomId.value = roomId

    const [allChannelsResponse, roomChannelsResponse] = await Promise.all([
        channelGetUserChannelsApi(),
        roomGetRoomChannelsApi(roomId)
    ]);

    // 拿到管道数据
    allChannels.value = allChannelsResponse
    transferData.value = allChannels.value.map(c => { return { key: c.id, label: c.channelName, disabled: false } })
    // 拿到房间的管道
    const roomChannels = roomChannelsResponse
    roomChannelIds.value = roomChannels.map(r => r.id)

    relationVisible.value = true
}
const onRelationConfirm = async () => {
    const result = await roomUpdateRoomChannelApi({ roomId: relationRoomId.value!, channelIds: roomChannelIds.value })
    ElMessage({
        message: `更新后房间的管道数量:${result}`,
        type: 'success'
    })
    relationVisible.value = false
}
const onRelationClose = () => {
    relationVisible.value = false
}

// 复制url
const GetUrlByMethod = (url: string, method: string) => {
    if (method == 'Get') {
        return `${window.location.protocol}//${window.location.host}${import.meta.env.VITE_SERVER}/Room/SendMessageBy${method}/${url}?content=消息内容`
    } else {
        return `${window.location.protocol}//${window.location.host}${import.meta.env.VITE_SERVER}/Room/SendMessageBy${method}/${url}`
    }
}

const CopyUrl = (url: string, method: string) => {
    const { toClipboard } = useClipboard()
    toClipboard(GetUrlByMethod(url, method))
    ElMessage({
        message: `已拷贝到粘贴板`,
        type: 'success',
    })
}

// 发送测试消息
const SendTestMessage = async (roomCode: string, roomKey: string) => {
    let result;
    if (roomKey) {
        result = await roomSendMessageByGetApi(roomCode, "测试内容\nby pusher", roomKey)
    } else {
        result = await roomSendMessageByGetApi(roomCode, "测试内容\nby pusher")
    }

    ElMessage({
        message: result,
        type: 'success',
    })
}


// 查看消息记录
// 分页
const historyPageIndex = ref(1)
const historyPageSize = ref(10)
const historyTotalCount = ref(0)
const historyRoomId = ref(0)
const historyChange = async (newCurrentPage: number, newPageSize: number) => {
    historyPageIndex.value = newCurrentPage
    historyPageSize.value = newPageSize
    await searchHistory(historyRoomId.value);
}

// 更新分页的数据
const searchHistory = async (roomId: number) => {
    const result = await roomGetRoomMessageHistoryWithPageApi(roomId, historyPageIndex.value, historyPageSize.value)
    history.value = result.pageData
    historyTotalCount.value = result.totalCount
}

const historyVisible = ref(false)
const history = ref<RoomMessageHistorySO[]>([])
const ShowRoomMessageHistory = async (roomId: number) => {
    await searchHistory(roomId)
    historyVisible.value = true
    historyRoomId.value = roomId
}

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