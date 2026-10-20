<template>
    <div>
        <!-- 查询表单 -->
        <el-row justify="space-between">
            <div class="left-container">
                <el-button type="primary" @click="openCreateStringTemplate"> 新建模板 </el-button>
                <el-button type="danger" :disabled="selectedRows.length === 0"
                    @click="deleteVisible = true">删除模板</el-button>
                <div v-if="selectedRows.length !== 0" class="selected-count">
                    你选择了{{ selectedRows.length }}个模板
                </div>
            </div>

            <div style="display: flex; align-items: center; justify-self: center;">
                <el-pagination background layout="sizes, prev, pager, next,->, total" v-model:current-page="pageIndex"
                    @change="change" :total="totalCount" />
            </div>

            <div class="right-container">
                <el-input style="width: 10rem;" placeholder="搜索模板名" v-model="UpdateStringTemplate" clearable>
                </el-input>
                <el-button @click="searchStringTemplates">
                    <SvgIcon name="refresh" />
                </el-button>
            </div>
        </el-row>

        <!-- 表格 -->
        <div style="margin-top: 1rem;">
            <el-table ref="tableRef" :data="searchData" :table-layout="'auto'" @selection-change="handleSelectionChange"
                @row-click="rowClick">
                <el-table-column type="selection" width="50" />
                <el-table-column :show-overflow-tooltip="true" prop="templateName" label="模板名" width="160" />
                <el-table-column prop="templateCode" :show-overflow-tooltip="true" label="模板代码" />

                <el-table-column fixed="right" label="操作" width="120">
                    <template #default="scope">
                        <el-button type="primary" size="small" @click.stop="openUpdateStringTemplate(scope.row.id)">
                            编辑模板
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <!-- 新增/修改 -->
        <el-dialog width="80%" v-model="dialogVisible" :title="dialogTitle" @close="onDialogStringTemplateClose">
            <el-form ref="formRef" style="padding: 1rem;" :model="dialogStringTemplate" :rules="rules">
                <el-form-item label="模板名称" prop="templateName">
                    <el-input v-model="dialogStringTemplate.templateName" placeholder="请输入内容" />
                </el-form-item>
                <el-form-item label="模板Code" prop="templateCode">
                    <el-input v-model="dialogStringTemplate.templateCode" placeholder="请输入内容" />
                </el-form-item>

                <el-form-item>
                    <el-button type="primary" @click="addVariable">添加变量</el-button>
                </el-form-item>
                <template v-for="(item, index) in dialogStringTemplate.stringTemplateObject.variables" :key="index">
                    <el-row style="display: flex;justify-content: space-between;">
                        <el-form-item :label="'变量' + (index + 1)"
                            :prop="'stringTemplateObject.variables.' + index + '.variableName'"
                            :rules="{ required: true, message: '请输入', trigger: 'blur' }">
                            <el-input v-model="item.variableName" placeholder="请输入内容" />
                        </el-form-item>
                        <el-form-item label="jsonpath" :prop="'stringTemplateObject.variables.' + index + '.jsonPath'"
                            :rules="[{ required: true, message: '请输入', trigger: 'blur' }]">
                            <el-input v-model="item.jsonPath" placeholder="请输入内容" />
                        </el-form-item>
                        <el-button @click="removeVariable(index)">
                            <SvgIcon name="minus" />
                        </el-button>
                    </el-row>
                </template>

                <el-form-item label="模板文本" prop="stringTemplateObject.templateText"
                    :rules="{ required: true, message: '请输入', trigger: 'blur' }">
                    <el-input v-model="dialogStringTemplate.stringTemplateObject.templateText" autosize type="textarea"
                        placeholder="请输入内容" />
                </el-form-item>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="onDialogStringTemplateClose">取消</el-button>
                    <el-button type="primary" @click="onDialogStringTemplateConfirm">
                        确认
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 删除 -->
        <el-dialog v-model="deleteVisible" title="确认删除？" @close="deleteVisible = false">
            <p v-for="selectRow in selectedRows" :key="selectRow.id">
                <el-tag>{{ templates.filter(t => t.id === selectRow.id)[0].templateName }}</el-tag>
            </p>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="deleteVisible = false">取消</el-button>
                    <el-button type="primary" @click="onDeleteStringTemplateConfirm">
                        确认
                    </el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang='ts'>
import { StringTemplateDeleteStringTemplatesApi, StringTemplateGetUserStringTemplatesWithPageApi, StringTemplateCreateStringTemplateApi, StringTemplateUpdateStringTemplateApi } from '@/api/stringTemplate';
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElTable, type FormInstance, type FormRules } from 'element-plus';
import type { CreateStringTemplateRO, StringTemplate, UpdateStringTemplateRO } from '@/types/pusher/stringTemplate';
import { v4 as uuidv4 } from 'uuid';

defineOptions({
    name: 'StringTemplateIndex'
})


let templates = ref<StringTemplate[]>([])
const UpdateStringTemplate = ref('');
const searchData = computed(() => {
    return templates.value.filter(t => t.templateName.indexOf(UpdateStringTemplate.value) !== -1);
})

// 分页
const pageIndex = ref(1)
const pageSize = ref(10)
const totalCount = ref(0)
const change = async (newCurrentPage: number, newPageSize: number) => {
    pageIndex.value = newCurrentPage
    pageSize.value = newPageSize
    await searchStringTemplates();
}

onMounted(async () => {
    await searchStringTemplates()
})

// 搜索按钮
async function searchStringTemplates() {
    const result = await StringTemplateGetUserStringTemplatesWithPageApi(pageIndex.value, pageSize.value)
    templates.value = result.pageData
    totalCount.value = result.totalCount
}

// 创建模板
const dialogTitle = ref('')
const dialogStringTemplate: CreateStringTemplateRO = reactive({
    templateName: '',
    templateCode: '',
    stringTemplateObject: {
        templateText: '',
        variables: []
    }
})
const addVariable = () => {
    dialogStringTemplate.stringTemplateObject.variables.push({ variableName: '', jsonPath: '' })
}
const removeVariable = (index: number) => {
    dialogStringTemplate.stringTemplateObject.variables.splice(index, 1)
}
const openCreateStringTemplate = () => {
    addVariable()
    dialogTitle.value = '新建模板'
    dialogStringTemplate.templateCode = uuidv4()
    dialogVisible.value = true
}
const dialogVisible = ref(false)
const resetStringTemplate = () => {
    dialogStringTemplate.templateName = ''
    dialogStringTemplate.stringTemplateObject.templateText = ''
    dialogStringTemplate.stringTemplateObject.variables = []
}
const rules = reactive<FormRules>({
    templateName: [
        { required: true, message: '必填', trigger: 'blur' }
    ],
    templateCode: [
        { required: true, message: '必填', trigger: 'blur' }
    ]
})

const createStringTemplate = async (createStringTemplateRO: CreateStringTemplateRO) => {
    var result = await StringTemplateCreateStringTemplateApi(createStringTemplateRO)
    ElMessage({
        message: `成功创建${result}个模板`,
        type: 'success',
    })
}
const updateStringTemplate = async (updateStringTemplateRO: UpdateStringTemplateRO) => {
    var result = await StringTemplateUpdateStringTemplateApi(updateStringTemplateRO)
    ElMessage({
        message: result ? `编辑成功` : "编辑失败",
        type: 'success',
    })
}
const formRef = ref<FormInstance>()

// 新增和修改都走一样的逻辑
async function onDialogStringTemplateConfirm() {
    if (!formRef.value) return
    await formRef.value.validate(async (valid, fields) => {
        if (valid) {
            if (dialogTitle.value === '新建模板') {
                await createStringTemplate(dialogStringTemplate)
            } else if (dialogTitle.value === '编辑模板') {
                await updateStringTemplate({ id: updateId.value, ...dialogStringTemplate })
            }
            dialogVisible.value = false
            resetStringTemplate()
            await searchStringTemplates()


        } else {
            ElMessage({
                message: `校验不通过`,
                type: 'warning',
            })
        }
    })

}
function onDialogStringTemplateClose() {
    dialogVisible.value = false
    resetStringTemplate()
}

// 删除模板
const tableRef = ref<InstanceType<typeof ElTable>>()
const rowClick = (row: StringTemplate, column: any, event: Event) => {
    if (selectedRows.value.some(r => r.id === row.id)) {
        tableRef.value?.toggleRowSelection(row, false)
    } else {
        tableRef.value?.toggleRowSelection(row, true)
    }
}
const deleteVisible = ref(false)
// 选中了行
const selectedRows = ref<StringTemplate[]>([])
// 选中就赋值
const handleSelectionChange = (val: StringTemplate[]) => {
    selectedRows.value = val
}
const onDeleteStringTemplateConfirm = async () => {
    var deleteKeys = selectedRows.value!.map(row => row.id);
    const result = await StringTemplateDeleteStringTemplatesApi(deleteKeys)
    deleteVisible.value = false;
    await searchStringTemplates()
    ElMessage({
        message: `成功删除${result}个模板`,
        type: 'success',
    })
};



// 修改模板
const updateId = ref<number>(-1)
const openUpdateStringTemplate = (id: number) => {
    updateId.value = id;
    const data = templates.value.filter(t => t.id === id)[0]

    dialogStringTemplate.templateName = data.templateName
    dialogStringTemplate.templateCode = data.templateCode
    dialogStringTemplate.stringTemplateObject.templateText = data.stringTemplateObject.templateText
    dialogStringTemplate.stringTemplateObject.variables = data.stringTemplateObject.variables

    dialogTitle.value = '编辑模板'
    dialogVisible.value = true
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