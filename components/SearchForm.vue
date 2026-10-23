<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from '@void/vue';
import { listUrl } from '../shared/ui-navigation';
const props = defineProps<{ path: string; search: string; placeholder: string }>();
const router = useRouter();
const value = ref(props.search);
watch(() => props.search, search => { value.value = search; });
function submit() { router.visit(listUrl(props.path, 1, value.value)); }
</script>
<template>
  <form method="get" :action="path" class="mb-6 flex flex-wrap items-center gap-2" @submit.prevent="submit">
    <UInput v-model="value" name="search" :placeholder="placeholder" :aria-label="placeholder" />
    <UButton type="submit" variant="outline">搜索</UButton>
  </form>
</template>
