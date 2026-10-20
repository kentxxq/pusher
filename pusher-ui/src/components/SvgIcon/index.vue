<template>
    <svg :style="{ width: size, height: size }">
        <use :xlink:href="prefix + name" :fill="fill"></use>
    </svg>
</template>



<script lang="ts" setup>
defineOptions({
    name: "svg-component"
})

const prefix = "#icon-"

withDefaults(defineProps<{ name?: string, size?: string, fill?: string }>(), {
    // 默认图标
    name: () => "info-circle",
    // 大小
    size: () => "1rem",
    // 填充颜色
    fill: () => ""
})
</script>