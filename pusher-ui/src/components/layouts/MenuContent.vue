<template>
    <template v-for="item in routes" :key="item.name">
        <!-- 一级菜单隐藏 -->
        <template v-if="item.meta?.hidden === true">
        </template>

        <!-- 没有children -->
        <template v-else-if="!item.children">
            <el-menu-item :index="item.path" :key="item.name">
                <template #title>
                    <SvgIcon :name="item.meta?.icon ?? 'doller'" />
                    <span style="margin-left: 1rem;">{{ item.meta?.title ?? item.name }}</span>
                </template>
            </el-menu-item>
        </template>

        <!-- 只有一个children的时候 -->
        <template v-else-if="item.children?.length === 1 && item.children[0].meta?.hidden !== true">
            <el-menu-item :index="item.children[0].path" :key="item.children[0].path">
                <template #title>
                    <SvgIcon :name="item.meta?.icon ?? 'doller'" />
                    <span style="margin-left: 1rem;">{{ item.meta?.title ?? item.name }}</span>
                </template>
            </el-menu-item>
        </template>

        <!-- 二级菜单必须有一个child符合要求 -->
        <el-sub-menu :index="item.path" v-else-if="item.children?.some(route => route.meta?.hidden !== true)"
            :title="item.name">
            <template #title>
                <SvgIcon :name="item.meta?.icon ?? 'doller'" />
                <span style="margin-left: 1rem;">{{ item.meta?.title ?? item.name }}</span>
            </template>
            <MenuContent :routes="item.children!" />
        </el-sub-menu>
    </template>
</template>


<script lang="ts" setup>
import type { RouteRecordRaw } from 'vue-router';

defineOptions({
    name: "MenuContent"
})

// 接收数据
defineProps<{
    routes: RouteRecordRaw[]
}>()

</script>