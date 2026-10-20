<template>
    <div>
        测试页面
        <br>
        <p>测试svg</p>
        <svg class="svg">
            <use xlink:href="#icon-dollor"></use>
        </svg>
        <br>
        <p>自己的svg组件</p>
        <svg-icon name="dollor" size="2rem" fill="red"></svg-icon>
        <br>
        <el-button @click="aa">测试按钮</el-button>
    </div>

</template>



<script lang="ts" setup>
import { useUserStore } from "@/stores";

defineOptions({
    name: "homeIndex"
})

async function aa() {
    const userStore = useUserStore()
    await userStore.refreshToken()
}
</script>