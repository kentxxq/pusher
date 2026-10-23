<script setup lang="ts">
import { Link } from '@void/vue';
import { listUrl } from '../shared/ui-navigation';
defineProps<{ page: number; pageSize: number; total: number; path: string; search?: string }>();
</script>
<template>
  <div class="flex flex-wrap items-center justify-between gap-3 pt-4 text-xs text-muted">
    <div class="flex items-center gap-2">
      <div class="flex items-center gap-1">
        <Link
          v-if="page > 1"
          class="inline-flex items-center justify-center size-6 rounded-md border border-default bg-elevated hover:bg-muted/40 text-highlighted transition-colors"
          title="上一页"
          :href="listUrl(path, page - 1, search)"
        >
          <UIcon name="i-lucide-chevron-left" class="size-3.5" />
        </Link>
        <span
          v-else
          class="inline-flex items-center justify-center size-6 rounded-md border border-default/40 bg-muted/10 text-muted/40 cursor-not-allowed"
          title="上一页（已是第一页）"
        >
          <UIcon name="i-lucide-chevron-left" class="size-3.5" />
        </span>

        <Link
          v-if="page * pageSize < total"
          class="inline-flex items-center justify-center size-6 rounded-md border border-default bg-elevated hover:bg-muted/40 text-highlighted transition-colors"
          title="下一页"
          :href="listUrl(path, page + 1, search)"
        >
          <UIcon name="i-lucide-chevron-right" class="size-3.5" />
        </Link>
        <span
          v-else
          class="inline-flex items-center justify-center size-6 rounded-md border border-default/40 bg-muted/10 text-muted/40 cursor-not-allowed"
          title="下一页（已是最后一页）"
        >
          <UIcon name="i-lucide-chevron-right" class="size-3.5" />
        </span>
      </div>
      <span>共 <strong class="font-semibold text-highlighted">{{ total }}</strong> 条 · 第 <strong class="font-semibold text-highlighted">{{ page }}</strong> 页</span>
    </div>
  </div>
</template>
