<template>
  <el-config-provider :locale="locale">
    <RouterView></RouterView>
  </el-config-provider>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
let locale = zhCn
</script>

<style scoped></style>
