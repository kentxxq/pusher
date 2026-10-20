<template>
    <div class="header_content">
        <div class="header_left">
            {{ title }}
        </div>
        <div class="spacer"></div>
        <div class="header_right">
            <a style="color: black;" target="_blank" href="https://github.com/kentxxq/pusher">
                <SvgIcon name="github-fill" />
            </a>

            <a style="color: black;" target="_blank" href="https://pusher-docs.kentxxq.com">
                <SvgIcon name="doc-search" />
            </a>

            <el-dropdown @command="handleCommand">
                <span style="display: flex;align-items: center;">
                    {{ userStore.username }} &nbsp;
                    <SvgIcon name="down" />
                </span>
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item v-for="option in options" :command="option.value" :key="option.value">{{
                            option.content
                        }}</el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </div>
    </div>
    <el-dialog v-model="visible" title="修改密码">
        <el-form ref="formRef" :model="formData" :rules="rules" label-width="auto">
            <el-form-item label="原密码" prop="oldPassword">
                <el-input v-model="formData.oldPassword" placeholder="请输入内容" type="password" show-password />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
                <el-input v-model="formData.newPassword" placeholder="请输入内容" type="password" show-password />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
                <el-input v-model="formData.confirmPassword" placeholder="请输入内容" type="password" show-password />
            </el-form-item>
        </el-form>
        <template #footer>
            <div>
                <el-button @click="onFormClose">取消</el-button>
                <el-button type="primary" @click="onConfirm(formRef)">
                    确认
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script lang="ts" setup>
import router from "@/router";
import { useUserStore } from "@/stores";
import { reactive, ref } from 'vue';
import { userUpdatePasswordApi } from '@/api/user';
import { ElMessage, type FormInstance, type FormRules } from "element-plus";

defineOptions({
    name: "LayoutHeader"
})
const userStore = useUserStore()
const title: string = import.meta.env.VITE_APP_TITLE
const options = [
    {
        content: '修改密码',
        value: 1,
    },
    {
        content: '退出登录',
        value: 2,
    }
];
const handleCommand = (command: string | number | object) => {
    // ElMessage(`click on item ${command}`)
    // 修改密码
    if (command === 1) {
        visible.value = true
    }
    // 退出登录
    if (command === 2) {
        userStore.loginOut()
        router.push({ name: 'login' })
    }
}

// const clickHandler = (data) => {
//     console.debug(`点击了${data.content},${data.value}`, data)
//     // 修改密码
//     if (data.value === 1) {
//         visible.value = true
//         console.debug("改完了")
//     }
//     // 退出登录
//     if (data.value === 2) {
//         userStore.loginOut()
//         router.push({ name: 'login' })
//     }
// };


//修改密码
const formRef = ref()
let visible = ref(false)
interface formModel {
    oldPassword: string
    newPassword: string
    confirmPassword: string
}
const formData: formModel = reactive({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
});

const resetFormData = () => {
    if (formData) {
        formData.oldPassword = ''
        formData.newPassword = ''
        formData.confirmPassword = ''
    }
}

const onFormClose = () => {
    resetFormData()
    visible.value = false;
}

const onConfirm = async (formRef: FormInstance | undefined) => {
    if (!formRef) return
    await formRef.validate(async (valid, fields) => {
        if (valid) {
            let res = await userUpdatePasswordApi({ oldPassword: formData.oldPassword, newPassword: formData.newPassword })
            ElMessage({ message: res, type: 'success' })
            visible.value = false;
            resetFormData()
        } else {
            ElMessage({ message: "校验失败", type: 'error' })
        }
    })
};


const rules = reactive<FormRules<formModel>>({
    oldPassword: [
        { required: true, message: '必填', trigger: 'blur' }
    ],
    newPassword: [
        { required: true, message: '必填', trigger: 'blur' },
        {
            validator: (rule: any, value: any, callback: any) => {
                if (value === '') {
                    callback(new Error('必须填写'))
                } else if (value === formData.oldPassword) {
                    callback(new Error("新老密码必须不一致"))
                } else {
                    callback()
                }
            },
            message: '新密码不能和原密码一样!',
            trigger: 'blur'
        },
    ],
    confirmPassword: [
        { required: true, message: '必填', trigger: 'blur' },
        {
            validator: (rule: any, value: any, callback: any) => {
                if (value === '') {
                    callback(new Error('必须填写'))
                } else if (value !== formData.newPassword) {
                    callback(new Error("密码必须一致"))
                } else {
                    callback()
                }
            },
            message: '两次密码不一致!',
            trigger: 'blur'
        },
    ]
})

</script>

<style scoped>
.header_content {
    /* 两边间隔 */
    margin: 0 1rem;
    width: 100%;
    /* line-height: 40px; */

    display: flex;
    /* 垂直居中 */
    align-items: center;
    /* 两边顶住父元素, 中间的间隔一致 */
    justify-content: space-between;

}

.header_left {
    font-size: x-large;
    font-weight: bolder;
}

.header_right {
    display: flex;
    gap: 2rem;
}

.spacer {
    /* 占据剩余空间 */
    flex: 1 1 0%;
    /* background-color: red; */

}
</style>