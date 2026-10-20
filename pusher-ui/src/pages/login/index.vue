<template>
    <div class="login">
        <div class="form">
            <h3 style="text-align: center;">
                <a style="color: black;" class="custom-link" target="_blank" href="https://pusher-docs.kentxxq.com">
                    {{ title }}
                </a>
            </h3>
            <el-form v-show="!form2Visible" :model="formData" :rules="rules" ref="formRef" @submit.prevent
                @keyup.enter.prevent="onSubmit">
                <el-form-item prop="username">
                    <el-input v-model="formData.username" clearable placeholder="请输入用户名" :autofocus="true">
                        <template #prefix>
                            <SvgIcon name="user" />
                        </template>
                    </el-input>
                </el-form-item>

                <el-form-item prop="password">
                    <el-input v-model="formData.password" type="password" clearable placeholder="请输入密码" show-password>
                        <template #prefix>
                            <SvgIcon name="lock" />
                        </template>
                    </el-input>
                </el-form-item>

                <el-form-item>
                    <div style="width:100%; display: flex;justify-content:center">
                        <el-button native-type="submit" type="primary" @click="onSubmit">登录</el-button>
                        <el-button type="info" @click="form2Visible = !form2Visible">注册/忘记密码</el-button>
                    </div>
                </el-form-item>
            </el-form>

            <div v-show="form2Visible">
                <el-input v-model="username" clearable placeholder="请输入邮箱地址" :autofocus="true">
                    <template #prefix>
                        <SvgIcon name="user" />
                    </template>
                </el-input>
                <div style="width:100%; display: flex;justify-content:center;margin-top: 1rem;">
                    <el-button type="primary" @click="GetPassword" :loading="forgetLogin">获取密码</el-button>
                    <el-button type="info" @click="form2Visible = !form2Visible">返回登录</el-button>
                </div>
            </div>
        </div>
    </div>
</template>



<script lang="ts" setup>

defineOptions({
    name: "loginIndex"
})

import { reactive, ref } from 'vue';
import router from "@/router/index";
import { useUserStore } from "@/stores/index";
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { userGetPasswordApi } from '@/api/user';

const title: string = import.meta.env.VITE_APP_TITLE
const userStore = useUserStore()
interface LoginForm {
    username: string,
    password: string
}
const formData = reactive<LoginForm>({
    username: '',
    password: '',
});
const formRef = ref<FormInstance>()
const rules = reactive<FormRules<LoginForm>>({
    username: [
        { required: true, message: '必填', trigger: 'blur' },
    ],
    password: [
        { required: true, message: '必填', trigger: 'blur' },
    ]
})
const onSubmit = async () => {
    if (!formRef.value) return
    await formRef.value.validate(async (valid, fields) => {
        if (valid) {
            const result = await userStore.userLogin({ username: formData.username, password: formData.password })
            console.debug("登录result", result)
            if (result) {
                console.debug("跳转result")
                router.push({ name: 'home' })
            }
        } else {
            ElMessage({
                message: "登录失败",
                type: 'error'
            })
        }
    })
};



// 注册/忘记密码
const forgetLogin = ref(false)
const form2Visible = ref(false)
const username = ref('')
const GetPassword = async () => {
    forgetLogin.value = true
    try {
        var result = await userGetPasswordApi(username.value)
        ElMessage({
            message: result,
            type: 'success',
            duration: 3000
        })
        form2Visible.value = !form2Visible.value
        formData.username = username.value
    } catch (error) {
        console.warn(`获取密码失败: ${error}`)
    } finally {
        forgetLogin.value = false
    }

}


</script>




<style scoped>
.login {
    height: 100vh;
    display: flex;
    /* 水平居中 */
    align-items: center;
    /* 垂直居中 */
    justify-content: center;
}


.form {
    padding: 1rem;
    width: 350px;
    border-radius: 1rem;
    box-shadow: 1rem 1rem 2rem rgba(0, 0, 0, 0.5);
}

.custom-link {
    text-decoration: none;
    /* 默认不显示下划线 */
}

.custom-link:hover {
    text-decoration: underline;
    /* 鼠标悬停时显示下划线 */
}
</style>