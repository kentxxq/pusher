<template>
    <div class="page">
        <el-container style="height: 100%;">
            <el-header class="header">
                <LayoutHeader />
            </el-header>
            <el-container>
                <el-aside width="200px">
                    <LayoutAside />
                </el-aside>
                <el-main class="content">
                    <RouterView />
                </el-main>
            </el-container>
        </el-container>
    </div>
    <!-- <div>
        <t-layout class="page">
            <t-header class="header">
                <LayoutHeader />
            </t-header>
            <t-layout class="layout_container">
                <t-aside width="auto">
                    <LayoutAside />
                </t-aside>
                <t-content class="content">
                    <RouterView />
                </t-content>
            </t-layout>
        </t-layout>
    </div> -->
</template>



<script lang="ts" setup>
import LayoutHeader from "@/components/layouts/LayoutHeader.vue";
import LayoutAside from "@/components/layouts/LayoutAside.vue";


defineOptions({
    name: "layoutC"
})

</script>


<style scoped>
.page {
    width: 100%;
    height: 100vh;
}

.header {
    display: flex;
    align-items: center;
    border-bottom: 1px solid #e7e7e7;
}

.content {
    padding: 1rem;
    border-left: 1px solid #e7e7e7;
}
</style>