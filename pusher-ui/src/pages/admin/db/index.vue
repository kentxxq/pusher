<template>
    <div class="card-container">
        <el-card>
            <template #header>
                <div class="card-header">
                    <el-button type="danger" @click="resetDatabase">重置数据库</el-button>
                </div>
            </template>
            <ul>
                <li>删除所有的表</li>
                <li>重建管理员ken</li>
                <li>初始化ken的示例数据</li>
                <li>重置系统模板</li>
            </ul>
        </el-card>
        <el-card>
            <template #header>
                <div class="card-header">
                    <el-button type="warning" @click="resetSystemStringTemplates">重置模板数据</el-button>
                </div>
            </template>
            <ul>
                <li>删除系统内置的模板</li>
                <li>模板名称为DingTalk,Lark等,具体以文档/代码为准</li>
            </ul>
        </el-card>
    </div>
</template>

<script setup lang='ts'>
import { adminResetDatabaseApi, adminResetSystemStringTemplatesApi } from '@/api/admin';
import { ElMessage } from 'element-plus';

defineOptions({
    name: 'admin-db-index'
})

const resetDatabase = async () => {
    const result = await adminResetDatabaseApi();
    ElMessage({
        message: result,
        type: 'success'
    })
}

const resetSystemStringTemplates = async () => {
    const result = await adminResetSystemStringTemplatesApi();
    ElMessage({
        message: result,
        type: 'success'
    })
}

</script>

<style scoped>
.card-container {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
}
</style>