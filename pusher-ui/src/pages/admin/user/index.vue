<template>
    <div>
        <!-- 查询表单 -->
        <el-row justify="space-between">
            <div class="left-container">
                <el-button type="primary" @click="openCreateUser"> 新建用户 </el-button>
                <el-button type="danger" :disabled="selectedRows.length === 0"
                    @click="deleteVisible = true">删除用户</el-button>
                <div v-if="selectedRows.length !== 0" class="selected-count">
                    你选择了{{ selectedRows.length }}个用户
                </div>
            </div>

            <div style="display: flex; align-items: center; justify-self: center;">
                <el-pagination background layout="sizes, prev, pager, next,->, total" v-model:current-page="pageIndex"
                    @change="change" :total="totalCount" />
            </div>

            <div class="right-container">
                <el-input style="width: 10rem;" placeholder="搜索用户名" v-model="searchValue" clearable>
                </el-input>
                <el-button @click="searchUser">
                    <SvgIcon name="refresh" />
                </el-button>
            </div>
        </el-row>

        <!-- 表格 -->
        <div style="margin-top: 1rem;">
            <el-table ref="tableRef" :data="searchData" :table-layout="'auto'" @selection-change="handleSelectionChange"
                @row-click="rowClick">
                <el-table-column type="selection" width="50" />
                <el-table-column prop="username" label="用户名" width="160" />
                <el-table-column prop="password" :show-overflow-tooltip="true" label="密码" />
                <el-table-column prop="roleType" label="角色">
                    <template #default="scope">
                        {{ roleTypeOptions.filter(t => t.enumKey === scope.row.roleType)[0].enumDisplayName }}
                    </template>
                </el-table-column>
                <el-table-column prop="lastLoginTime" label="最后登录时间" width="304">
                    <template #default="scope">
                        {{ scope.row.lastLoginTime ? dateStringFormat(scope.row.lastLoginTime) : '' }}
                    </template>
                </el-table-column>
                <el-table-column fixed="right" label="操作" width="120">
                    <template #default="scope">
                        <el-button type="primary" size="small" @click.stop="updateUserRole(scope.row.id)">
                            修改用户角色
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <!-- 新增 -->
        <el-dialog v-model="createUserVisible" title="创建用户" @close="onCreateUserClose">
            <el-form ref="formRef" style="padding: 1rem;" :model="formData" :rules="rules">
                <el-form-item label="用户名" prop="username">
                    <el-input v-model="formData.username" placeholder="请输入内容" />
                </el-form-item>
                <el-form-item label="用户名" prop="password">
                    <el-input v-model="formData.password" placeholder="请输入内容" />
                </el-form-item>
                <el-form-item label="用户类型">
                    <el-select v-model="formData.roleType" placeholder="请选择" size="large">
                        <el-option v-for="option in roleTypeOptions" :key="option.enumKey"
                            :label="option.enumDisplayName" :value="option.enumKey" />
                    </el-select>
                </el-form-item>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="onCreateUserClose">取消</el-button>
                    <el-button type="primary" @click="onCreateUserConfirm">
                        确认
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 删除 -->
        <el-dialog v-model="deleteVisible" title="确认删除？" @close="deleteVisible = false">
            <p v-for="selectRow in selectedRows" :key="selectRow.id">
                <el-tag>{{ users.filter(r => r.id === selectRow.id)[0].username }}</el-tag>
            </p>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="deleteVisible = false">取消</el-button>
                    <el-button type="primary" @click="onDeleteUserConfirm">
                        确认
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 修改用户信息 -->
        <el-dialog v-model="updateVisible" title="修改用户信息" @close="updateVisible = false">
            <el-select v-model="updateTmpUserRole" placelholder="请选择" size="large">
                <el-option v-for="option in roleTypeOptions" :key="option.enumKey" :label="option.enumDisplayName"
                    :value="option.enumKey" />
            </el-select>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="updateVisible = false">取消</el-button>
                    <el-button type="primary" @click="onUpdateUserConfirm">
                        确认
                    </el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang='ts'>
import { adminCreateUserApi, adminDeleteUserApi, adminGetUsersWithPageApi, adminUpdateUserRoleApi } from '@/api/admin';
import { computed, onMounted, reactive, ref } from 'vue';
import { RoleType, type CreateUserRO, type User } from '@/types/pusher/user'
import { ElMessage, ElTable, type FormInstance, type FormRules } from 'element-plus';
import { dateStringFormat } from '@/utils/convert';
import type { EnumObject } from '@/types/pusher/common';
import { enumRoleEnumApi } from '@/api/enumapi';


defineOptions({
    name: 'admin-user-index'
})


let users = ref<User[]>([])
const searchValue = ref('');
const searchData = computed(() => {
    return users.value.filter(r => r.username.indexOf(searchValue.value) !== -1);
})
// 分页
const pageIndex = ref(1)
const pageSize = ref(10)
const totalCount = ref(0)
const change = async (newCurrentPage: number, newPageSize: number) => {
    pageIndex.value = newCurrentPage
    pageSize.value = newPageSize
    await searchUser();
}

onMounted(async () => {
    // 先获取枚举,否则table会警告无法拿到枚举值
    roleTypeOptions.value = await enumRoleEnumApi()
    await searchUser()
})

// 搜索按钮
async function searchUser() {
    const result = await adminGetUsersWithPageApi(pageIndex.value, pageSize.value)
    users.value = result.pageData
    totalCount.value = result.totalCount
}

// 创建用户
const roleTypeOptions = ref<Array<EnumObject>>([])
const formData: CreateUserRO = reactive({
    username: '',
    password: '',
    roleType: RoleType.Free
});
const resetFormData = () => {
    formData.username = ''
    formData.password = ''
    formData.roleType = RoleType.Free
}
const rules = reactive<FormRules<CreateUserRO>>({
    username: [
        { required: true, message: '必填', trigger: 'blur' }
    ],
    password: [
        { required: true, message: '必填', trigger: 'blur' },
    ]
})
const createUserVisible = ref(false)
function openCreateUser() {
    createUserVisible.value = true
}
async function createUser(createUserRO: CreateUserRO) {
    var userId = await adminCreateUserApi(createUserRO)
    ElMessage({
        message: userId !== 0 ? "创建成功" : "创建失败",
        type: 'success',
    })
}
const formRef = ref<FormInstance>()
async function onCreateUserConfirm() {
    if (!formRef.value) return
    await formRef.value.validate(async (valid, fields) => {
        if (valid) {
            await createUser(formData)
            createUserVisible.value = false
            resetFormData()
            await searchUser()
        } else {
            ElMessage({
                message: `校验不通过`,
                type: 'warning',
            })
        }
    })
}
function onCreateUserClose() {
    resetFormData()
    createUserVisible.value = false
}

// 删除用户
const tableRef = ref<InstanceType<typeof ElTable>>()
const rowClick = (row: User, column: any, event: Event) => {
    if (selectedRows.value.some(r => r.id === row.id)) {
        tableRef.value?.toggleRowSelection(row, false)
    } else {
        tableRef.value?.toggleRowSelection(row, true)
    }
}
const deleteVisible = ref(false)
// 选中了行
const selectedRows = ref<User[]>([])
// 选中就赋值
const handleSelectionChange = (val: User[]) => {
    selectedRows.value = val
}
const onDeleteUserConfirm = async () => {
    var deleteKeys = selectedRows.value!.map(row => row.id);
    const result = await adminDeleteUserApi(deleteKeys)
    deleteVisible.value = false;
    await searchUser()
    ElMessage({
        message: `成功删除${result}个用户`,
        type: 'success',
    })
};

// 修改用户角色
const updateVisible = ref(false)
const updateTmpUserId = ref<number>()
const updateTmpUserRole = ref<RoleType>(RoleType.Free)
const updateUserRole = (userId: number) => {
    updateTmpUserId.value = userId
    updateTmpUserRole.value = users.value.filter(u => u.id === userId)[0].roleType
    updateVisible.value = true
}

const onUpdateUserConfirm = async () => {
    const username = users.value.filter(u => u.id === updateTmpUserId.value)[0].username
    const result = await adminUpdateUserRoleApi({ username: username, roleType: updateTmpUserRole.value })
    ElMessage({
        message: result,
        type: 'success'
    })

    updateVisible.value = false
    await searchUser()
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