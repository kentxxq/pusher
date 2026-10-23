<script setup lang="ts">
import { Link } from '@void/vue';
import { listUrl } from '../shared/ui-navigation';
defineProps<{ page: number; pageSize: number; total: number; path: string; search?: string }>();
</script>
<template>
  <div class="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-muted"><span>共 {{ total }} 条 · 第 {{ page }} 页</span><div class="flex items-center gap-3">
    <Link class="text-primary hover:underline" v-if="page > 1" :href="listUrl(path, page - 1, search)">上一页</Link>
    <Link class="text-primary hover:underline" v-if="page * pageSize < total" :href="listUrl(path, page + 1, search)">下一页</Link>
  </div></div>
</template>
