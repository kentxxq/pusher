<template>
    <el-menu :default-active="route.fullPath" :collapsed="collapsed" router>
        <MenuContent :routes="menus" />
    </el-menu>
</template>


<script lang="ts" setup>
import MenuContent from "@/components/layouts/MenuContent.vue";

defineOptions({
    name: "LayoutAside"
})


// 外部处理路由数据,menu只是内部组件. 
// 方便递归,减少递归工作量

import { constantRoutes, whiteList } from '@/router';
import { usePermissionStore } from '@/stores';
import { storeToRefs } from 'pinia';
import { computed, ref } from "vue";
import { useRoute } from "vue-router";

// 处理菜单
const route = useRoute()
const permissionStore = usePermissionStore()
const { accessedRouters } = storeToRefs(permissionStore)
const menus = computed(() => {
    // 固定路由+动态路由
    let routes = accessedRouters.value.concat(constantRoutes)
    // 过滤掉白名单的路由
    routes = routes.filter(r => !whiteList.includes(r.path))
    // 排序. 最低100,最多999. 中间值500
    routes = routes.sort((a, b) => {
        const a_tmp = a.meta?.order ?? 500
        const b_tmp = b.meta?.order ?? 500
        if (a_tmp !== b_tmp) {
            return a_tmp - b_tmp
        } else {
            return (a.name!.toString() ?? a.path).localeCompare((b.name!.toString() ?? b.path))
        }
    })
    return routes
})

// 折叠菜单
const collapsed = ref(false);
const iconName = computed(() => (collapsed.value ? 'chevron-right' : 'chevron-left'));
const changeCollapsed = () => {
    collapsed.value = !collapsed.value;
};

</script>