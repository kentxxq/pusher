<script setup lang="ts">
import { listUrl } from '../shared/ui-navigation';

const props = defineProps<{
  page: number;
  pageSize: number;
  total: number;
  path?: string;
  search?: string;
  disabled?: boolean;
}>();
const emit = defineEmits<{ 'update:page': [page: number] }>();
const pageUrl = (page: number) => listUrl(props.path!, page, props.search);
</script>

<template>
  <div class="flex min-w-0 flex-wrap items-center gap-3 text-xs text-muted">
    <UPagination
      v-if="total > pageSize"
      :page="page"
      :items-per-page="pageSize"
      :total="total"
      :disabled="disabled"
      :to="path ? pageUrl : undefined"
      show-edges
      :sibling-count="1"
      size="xs"
      :ui="{ first: 'hidden', last: 'hidden', list: 'flex-wrap' }"
      @update:page="emit('update:page', $event)"
    />
    <slot>
      <span>共 <strong class="font-semibold text-highlighted">{{ total }}</strong> 条</span>
    </slot>
  </div>
</template>
