<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    color?: 'error' | 'warning' | 'primary' | 'neutral';
    icon?: string;
    loading?: boolean;
  }>(),
  {
    title: '确认操作',
    confirmText: '确认',
    cancelText: '取消',
    color: 'error',
    icon: 'i-lucide-alert-triangle',
    loading: false,
  }
);

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm'): void;
}>();
</script>

<template>
  <UModal
    :open="open"
    :ui="{ content: 'max-w-md' }"
    :dismissible="!loading"
    :close="!loading"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-4">
        <div class="flex items-start gap-3.5">
          <div
            class="p-2.5 rounded-full shrink-0 flex items-center justify-center"
            :class="color === 'error' ? 'bg-error/10 text-error' : color === 'warning' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'"
          >
            <UIcon :name="icon" class="size-5" />
          </div>
          <div class="space-y-1 pt-0.5 text-sm">
            <h4 class="font-semibold text-highlighted">{{ title }}</h4>
            <p class="text-xs text-muted leading-relaxed whitespace-pre-wrap">{{ description }}</p>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-default">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="loading"
            @click="emit('update:open', false)"
          >
            {{ cancelText }}
          </UButton>
          <UButton
            size="xs"
            :color="color"
            :loading="loading"
            @click="emit('confirm')"
          >
            {{ confirmText }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
