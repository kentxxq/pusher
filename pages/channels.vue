<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { logger } from 'void/log';
import { Form, useForm, useRouter } from '@void/vue';
import { useToast } from '@nuxt/ui/composables/useToast';
import ConfirmModal from '../components/ConfirmModal.vue';
import Pagination from '../components/Pagination.vue';
import { channelNames, channelStyles, defaultChannelStyle } from '../shared/domain';
import { disabledProxy } from '../shared/proxy';
import { channelKeys, channelFields, messageFields } from '../shared/channels';
import { listUrl } from '../shared/ui-navigation';
import { actionErrorMessage } from '../shared/action-error';
import type { TableColumn } from '@nuxt/ui';
import type { Props } from './channels.server';

const log = logger.child({ component: 'channels-page' });
const props = defineProps<Props>();
const router = useRouter();

// 搜索与刷新逻辑
const searchValue = ref(props.search);
watch(() => props.search, (s) => {
  if (typeof document !== 'undefined') {
    const inputEl = document.querySelector('input[name="search"]') as HTMLInputElement | null;
    if (document.activeElement === inputEl) return;
  }
  searchValue.value = s;
});

let searchDebounceTimer: any = null;
function onSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    triggerSearch(searchValue.value);
  }, 350);
}

async function triggerSearch(keyword: string) {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  let isFocused = false;
  let selectionStart: number | null = null;
  let selectionEnd: number | null = null;

  if (typeof document !== 'undefined') {
    const inputEl = document.querySelector('input[name="search"]') as HTMLInputElement | null;
    isFocused = document.activeElement === inputEl;
    selectionStart = inputEl?.selectionStart ?? null;
    selectionEnd = inputEl?.selectionEnd ?? null;
  }

  await (router as any).visit(listUrl('/channels', 1, keyword), { preserveState: true, replace: true });

  if (isFocused && typeof document !== 'undefined') {
    nextTick(() => {
      const el = document.querySelector('input[name="search"]') as HTMLInputElement | null;
      if (el) {
        el.focus();
        if (selectionStart !== null && selectionEnd !== null) {
          try {
            el.setSelectionRange(selectionStart, selectionEnd);
          } catch {}
        }
      }
    });
  }
}

function refreshChannels() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchValue.value = '';
  (router as any).visit(listUrl('/channels', 1, ''), { preserveState: true, replace: true });
  showToast('已清空搜索并刷新数据');
}

// 表单 Actions
const form = useForm('/channels?save', { id: 0, name: '', type: 0, url: '', ...disabledProxy, config: '', resetConfig: false, csrf: props.csrf });
const settingsDraft = reactive<Record<string, string>>({});
const defaultsDraft = reactive<Record<string, string>>({});
const invalidConfiguration = ref(false);
const retainedDefaults = ref<Record<string, unknown>>({});
const currentKey = computed(() => channelKeys[form.data.type]!);
const settingsFields = computed(() => channelFields[currentKey.value]);
const defaultFields = computed(() => messageFields[currentKey.value]);
const defaultOptionValue = '__default__';
const booleanChoices = [{ label: '默认', value: defaultOptionValue }, { label: '是', value: 'true' }, { label: '否', value: 'false' }];
function resetConfiguration() {
  for (const draft of [settingsDraft, defaultsDraft]) for (const key of Object.keys(draft)) delete draft[key];
  invalidConfiguration.value = false;
  form.data.resetConfig = false;
  retainedDefaults.value = {};
  for (const field of settingsFields.value) {
    settingsDraft[field.key] = field.key === 'encryptionMode' ? 'None' : '';
  }
  for (const field of defaultFields.value) defaultsDraft[field.key] = field.kind === 'boolean' || field.kind === 'choice' ? defaultOptionValue : '';
}
watch(() => form.data.type, () => { resetConfiguration(); form.data.url = ''; }, { flush: 'sync' });
const deletion = useForm('/channels?delete', { id: 0, csrf: props.csrf });
const testForm = useForm('/channels?test', { id: 0, csrf: props.csrf });
const roomForm = useForm('/channels?rooms', { id: 0, roomIds: [] as number[], csrf: props.csrf });

const types = channelNames.map((label, value) => ({ label, value }));

// 弹窗状态
const editModalOpen = ref(false);
const roomsModalOpen = ref(false);
const historyModalOpen = ref(false);

// 当前聚焦选中的管道
const activeChannel = ref<Props['list']['items'][number] | null>(null);

// Nuxt UI Toast
const toast = useToast();
function showToast(msg: string, color: 'success' | 'error' | 'primary' = 'success') {
  toast.add({
    title: msg,
    color,
    icon: color === 'error' ? 'i-lucide-alert-circle' : 'i-lucide-check-circle-2',
  });
}

// 确认操作弹窗状态 (Nuxt UI ConfirmModal)
const confirmState = ref<{
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  color: 'error' | 'warning' | 'primary';
  icon: string;
  loading: boolean;
  action: () => Promise<void> | void;
}>({
  open: false,
  title: '',
  description: '',
  confirmText: '确认',
  color: 'error',
  icon: 'i-lucide-alert-triangle',
  loading: false,
  action: () => {}
});

async function handleConfirm() {
  confirmState.value.loading = true;
  try {
    await confirmState.value.action();
  } finally {
    confirmState.value.loading = false;
  }
}

// 编辑 / 新建管道
function edit(row?: Props['list']['items'][number]) {
  form.clearError();
  form.clearErrors();
  Object.assign(form.data, {
    id: row?.id ?? 0,
    name: row?.name ?? '',
    type: row?.type ?? 0,
    url: row?.url ?? '',
    proxyEnabled: row?.proxyEnabled ?? false,
    proxyProtocol: row?.proxyProtocol ?? 'http',
    proxyHost: row?.proxyHost ?? '',
    proxyPort: row?.proxyPort ?? 8080,
    proxyUsername: row?.proxyUsername ?? '',
    proxyPassword: row?.proxyPassword ?? '',
    config: ''
  });
  resetConfiguration();
  if (row) {
    invalidConfiguration.value = row.configuration.invalid;
    retainedDefaults.value = { ...row.configuration.defaults };
    for (const field of settingsFields.value) {
      if (row.configuration.settings[field.key] !== undefined) settingsDraft[field.key] = String(row.configuration.settings[field.key]);
    }
    for (const field of defaultFields.value) if (row.configuration.defaults[field.key] !== undefined) defaultsDraft[field.key] = String(row.configuration.defaults[field.key]);
  }
  editModalOpen.value = true;
}

async function save() {
  if (!form.data.proxyEnabled) Object.assign(form.data, disabledProxy);
  const settings: Record<string, unknown> = {};
  const defaults = { ...retainedDefaults.value };
  for (const field of settingsFields.value) {
    if (settingsDraft[field.key] !== '') settings[field.key] = settingsDraft[field.key];
  }
  for (const field of defaultFields.value) {
    const value = defaultsDraft[field.key];
    delete defaults[field.key];
    if ((field.kind === 'boolean' || field.kind === 'choice') && value === defaultOptionValue) continue;
    if (value !== '' && value !== undefined) defaults[field.key] = field.kind === 'boolean' ? value === 'true' : value;
  }
  form.data.config = JSON.stringify({ settings, defaults });
  form.data.csrf = props.csrf;
  await form.post();
  if (form.wasSuccessful) {
    showToast(form.data.id ? '管道信息已更新' : '新建管道成功');
    editModalOpen.value = false;
  }
}

// 删除管道（使用 Nuxt UI 弹窗）
function remove(id: number, name: string) {
  confirmState.value = {
    open: true,
    title: '删除管道',
    description: `确认删除管道【${name}】及其所有关联？此操作不可恢复。`,
    confirmText: '确认删除',
    color: 'error',
    icon: 'i-lucide-trash-2',
    loading: false,
    action: async () => {
      deletion.data.id = id;
      deletion.data.csrf = props.csrf;
      await deletion.post();
      if (deletion.wasSuccessful) {
        showToast(`管道【${name}】已成功删除`);
        confirmState.value.open = false;
      }
    }
  };
}

// 发送测试消息
async function sendTest(channel: Props['list']['items'][number]) {
  testForm.clearError();
  testForm.clearErrors();
  testForm.data.id = channel.id;
  testForm.data.csrf = props.csrf;
  await testForm.post();
  if (testForm.wasSuccessful) {
    showToast(`管道【${channel.name}】测试消息发送成功！`);
  } else if (testForm.error) {
    showToast(`发送失败: ${actionErrorMessage(testForm.error)}`, 'error');
  }
}

// 打开关联房间弹窗并初始化数据
function openRoomsDialog(channel: Props['list']['items'][number]) {
  activeChannel.value = channel;
  roomForm.clearError();
  roomForm.clearErrors();
  roomForm.data.id = channel.id;
  const currentLinked = props.roomsMap[channel.id] || [];
  roomForm.data.roomIds = currentLinked.map(r => r.id);
  roomsModalOpen.value = true;
}

// 保存管道关联房间
async function saveRooms() {
  roomForm.data.csrf = props.csrf;
  await roomForm.post();
  if (roomForm.wasSuccessful) {
    showToast('管道关联房间已成功更新！');
    roomsModalOpen.value = false;
  } else if (roomForm.error) {
    showToast(`保存失败: ${actionErrorMessage(roomForm.error)}`);
  }
}

// 复制剪贴板辅助
function fallbackCopy(text: string): boolean {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
    return true;
  }
  if (typeof document === 'undefined') return false;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const successful = document.execCommand('copy');
  document.body.removeChild(textarea);
  return successful;
}

// 管道发送历史与分页
const channelHistoryLoading = ref(false);
const channelHistoryData = ref<{
  items: Array<{ id: number; messageId: number; status: number; success: boolean; result: string | null; recordedAt: string; content: string }>;
  total: number;
  page: number;
  pageSize: number;
}>({ items: [], total: 0, page: 1, pageSize: 20 });

const totalChannelHistoryPages = computed(() => Math.max(1, Math.ceil((channelHistoryData.value.total || 0) / (channelHistoryData.value.pageSize || 20))));

async function loadChannelHistory(channelId: number, page = 1) {
  channelHistoryLoading.value = true;
  try {
    const res = await fetch(`/channels/${channelId}?page=${page}`, {
      headers: { 'X-VoidPages': 'true' }
    });
    if (res.ok) {
      const json = await res.json();
      const h = json.props?.history || json.history;
      if (h) {
        channelHistoryData.value = {
          items: (h.items || []).map((item: any) => ({
            id: item.id,
            messageId: item.messageId,
            status: item.status,
            success: item.success,
            result: item.result,
            recordedAt: item.recordedAt || '',
            content: item.content || ''
          })),
          total: h.total || 0,
          page: h.page || 1,
          pageSize: h.pageSize || 20
        };
      }
    }
  } catch {
    log.error('渠道历史加载失败', { channelId, page });
  } finally {
    channelHistoryLoading.value = false;
  }
}

function openHistoryDialog(channel: Props['list']['items'][number]) {
  activeChannel.value = channel;
  const cached = props.recentHistories[channel.id] || [];
  channelHistoryData.value = {
    items: [...cached],
    total: cached.length,
    page: 1,
    pageSize: 20
  };
  historyModalOpen.value = true;
  loadChannelHistory(channel.id, 1);
}

function changeChannelHistoryPage(targetPage: number) {
  if (!activeChannel.value || channelHistoryLoading.value || targetPage === channelHistoryData.value.page) return;
  if (targetPage < 1 || targetPage > totalChannelHistoryPages.value) return;
  loadChannelHistory(activeChannel.value.id, targetPage);
}

// 管道发送历史表格列定义
type ChannelHistoryRow = { id: number; messageId: number; status: number; success: boolean; result: string | null; recordedAt: string; content: string };
const historyColumns: TableColumn<ChannelHistoryRow>[] = [
  { accessorKey: 'id', header: 'ID', meta: { class: { th: 'w-24' } } },
  { accessorKey: 'recordedAt', header: '发送时间', meta: { class: { th: 'w-48' } } },
  { accessorKey: 'status', header: '状态', meta: { class: { th: 'w-56' } } },
  { accessorKey: 'content', header: '消息内容' },
  { id: 'actions', header: '操作', meta: { class: { th: 'w-24' } } }
];

type Row = Props['list']['items'][number];
const columns: TableColumn<Row>[] = [
  { accessorKey: 'name', header: '管道名称' },
  { accessorKey: 'type', header: '管道类型', meta: { class: { th: 'w-36' } } },
  { id: 'config', header: '配置状态', meta: { class: { th: 'w-56' } } },
  { id: 'actions', header: '操作', meta: { class: { th: 'w-[32rem]' } } }
];
</script>

<template>
  <div class="w-full space-y-4">
    <!-- 顶部标题栏 -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-semibold text-highlighted">推送管道</h1>
      <UButton icon="i-lucide-plus" @click="edit()">新建管道</UButton>
    </div>

    <!-- 主表格卡片：默认撑满所有空间 -->
    <UCard class="w-full overflow-hidden" :ui="{ body: 'p-0 sm:p-0' }">
      <div class="p-4 sm:p-5 border-b border-default">
        <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
          <form method="get" action="/channels" class="flex items-center gap-2 m-0" @submit.prevent="triggerSearch(searchValue)">
            <UInput
              v-model="searchValue"
              name="search"
              placeholder="搜索管道名称"
              aria-label="搜索管道名称"
              class="w-56 sm:w-64"
              @input="onSearchInput"
            />
            <UButton
              type="button"
              variant="outline"
              color="neutral"
              icon="i-lucide-refresh-cw"
              title="刷新列表并清空搜索"
              @click="refreshChannels"
            >
              刷新
            </UButton>
          </form>

          <Pagination v-bind="list" path="/channels" :search="search">
            <span>共 <strong class="font-semibold text-highlighted">{{ list.total }}</strong> 个管道</span>
          </Pagination>
        </div>
        <p v-if="deletion.error" class="whitespace-pre-wrap text-sm text-error mt-2">{{ actionErrorMessage(deletion.error) }}</p>
        <p v-if="testForm.error" class="whitespace-pre-wrap text-sm text-error mt-2">{{ actionErrorMessage(testForm.error) }}</p>
      </div>

      <!-- 表格全宽自适应展示 -->
      <div class="w-full overflow-x-auto">
        <UTable
          :data="list.items"
          :columns="columns"
          empty="暂无管道"
          :sorting-options="{ enableSorting: false }"
          class="w-full"
          :ui="{
            base: 'w-full min-w-[68rem] table-fixed',
            th: 'py-3.5 px-4 text-xs font-semibold text-muted bg-muted/20 border-b border-default whitespace-nowrap',
            td: 'py-3.5 px-4 text-sm border-b border-default whitespace-normal wrap-anywhere'
          }"
        >
          <!-- 管道名称列：不再使用二级页面链接，纯文本展示 -->
          <template #name-cell="{ row }">
            <span class="font-medium text-highlighted">{{ row.original.name }}</span>
          </template>

          <!-- 管道类型列：固定颜色标签 -->
          <template #type-cell="{ row }">
            <UBadge
              variant="subtle"
              size="xs"
              :class="channelStyles[row.original.type]?.badgeClass || defaultChannelStyle.badgeClass"
            >
              <span
                class="size-1.5 rounded-full mr-1 shrink-0"
                :class="channelStyles[row.original.type]?.dotClass || defaultChannelStyle.dotClass"
              />
              {{ channelNames[row.original.type] }}
            </UBadge>
          </template>

          <!-- 配置状态列 -->
          <template #config-cell="{ row }">
            <div class="flex items-center gap-2 whitespace-nowrap">
              <UBadge v-if="row.original.configuration.invalid" color="error" variant="subtle" size="xs">配置无效</UBadge>
              <UBadge :color="row.original.hasUrl ? 'success' : 'warning'" variant="subtle" size="xs">
                {{ row.original.hasUrl ? '地址已设置' : '地址未设置' }}
              </UBadge>
              <div class="flex items-center gap-1.5">
                <UBadge :color="row.original.hasProxy ? 'info' : 'neutral'" variant="subtle" size="xs">
                  {{ row.original.hasProxy ? '使用代理' : '直连' }}
                </UBadge>
              </div>
            </div>
          </template>

          <!-- 操作列表头：靠右对齐 -->
          <template #actions-header>
            <div class="w-full text-right pr-2 whitespace-nowrap">操作</div>
          </template>

          <!-- 操作按钮栏：靠右定格对齐，弹窗流交互 -->
          <template #actions-cell="{ row }">
            <div class="flex items-center justify-end gap-1.5 flex-nowrap whitespace-nowrap pl-6 ml-auto shrink-0">
              <UButton
                size="xs"
                variant="soft"
                color="success"
                icon="i-lucide-send"
                :loading="testForm.pending && testForm.data.id === row.original.id"
                @click="sendTest(row.original)"
              >
                发送测试
              </UButton>
              <UButton
                size="xs"
                variant="outline"
                color="neutral"
                icon="i-lucide-pencil"
                @click="edit(row.original)"
              >
                编辑
              </UButton>
              <UButton
                size="xs"
                variant="soft"
                color="primary"
                icon="i-lucide-door-open"
                @click="openRoomsDialog(row.original)"
              >
                关联房间 ({{ props.roomsMap[row.original.id]?.length || 0 }})
              </UButton>
              <UButton
                size="xs"
                variant="soft"
                color="neutral"
                icon="i-lucide-history"
                @click="openHistoryDialog(row.original)"
              >
                发送记录
              </UButton>
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                @click="remove(row.original.id, row.original.name)"
              >
                删除
              </UButton>
            </div>
          </template>
        </UTable>
      </div>
    </UCard>

    <!-- 1. 编辑 / 新建管道弹窗 -->
    <UModal
      v-model:open="editModalOpen"
      :title="form.data.id ? '编辑管道' : '新建管道'"
      :dismissible="!form.pending"
      :close="form.pending ? false : { type: 'button', onClick: () => { editModalOpen = false; } }"
      :ui="{ header: 'shrink-0', wrapper: 'min-w-0 flex-1', close: 'static shrink-0', body: 'min-h-0' }"
    >
      <template #body>
        <Form :form="{ ...form, post: save }" :render-error="actionErrorMessage" class="grid gap-4">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField label="名称" :error="form.errors.name">
              <UInput v-model="form.data.name" placeholder="请输入管道名称" class="w-full" />
            </UFormField>
            <UFormField label="类型" :error="form.errors.type">
              <USelect v-model="form.data.type" :items="types" class="w-full" />
            </UFormField>
          </div>
          <UFormField label="管道地址" :error="form.errors.url">
            <UInput v-model="form.data.url" type="text" autocomplete="off" class="w-full" />
          </UFormField>
          <UFormField label="使用代理">
            <USwitch v-model="form.data.proxyEnabled" aria-label="使用代理" />
          </UFormField>
          <div v-if="form.data.proxyEnabled" class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField label="代理协议" :error="form.errors.proxyProtocol">
              <USelect v-model="form.data.proxyProtocol" :items="[{ label: 'HTTP', value: 'http' }, { label: 'HTTPS', value: 'https' }]" class="w-full" />
            </UFormField>
            <UFormField label="代理服务器" :error="form.errors.proxyHost">
              <UInput v-model="form.data.proxyHost" autocomplete="off" class="w-full" />
            </UFormField>
            <UFormField label="端口" :error="form.errors.proxyPort">
              <UInput v-model.number="form.data.proxyPort" type="number" :min="1" :max="65535" class="w-full" />
            </UFormField>
            <UFormField label="用户名" :error="form.errors.proxyUsername">
              <UInput v-model="form.data.proxyUsername" autocomplete="off" class="w-full" />
            </UFormField>
            <UFormField label="密码" :error="form.errors.proxyPassword">
              <UInput v-model="form.data.proxyPassword" type="text" autocomplete="off" class="w-full" />
            </UFormField>
          </div>
          <UButton v-if="invalidConfiguration" type="button" color="warning" variant="outline" @click="invalidConfiguration = false; form.data.resetConfig = true">重置无效配置</UButton>
          <p v-if="form.errors.config" class="text-sm text-error">{{ form.errors.config }}</p>
          <UFormField v-for="field in settingsFields" :key="field.key" :label="field.label">
            <USelect v-if="field.kind === 'choice'" v-model="settingsDraft[field.key]" :items="[...(field.values ?? [])]" class="w-full" />
            <UInput v-else v-model="settingsDraft[field.key]" class="w-full" />
          </UFormField>
          <UFormField v-for="field in defaultFields" :key="field.key" :label="`默认${field.label}`">
            <USelect v-if="field.kind === 'boolean'" v-model="defaultsDraft[field.key]" :items="booleanChoices" class="w-full" />
            <USelect v-else-if="field.kind === 'choice'" v-model="defaultsDraft[field.key]" :items="[{ label: '默认', value: defaultOptionValue }, ...(field.values ?? []).map(value => ({ label: value, value }))]" class="w-full" />
            <UInput v-else v-model="defaultsDraft[field.key]" :type="field.kind === 'number' ? 'number' : 'text'" class="w-full" />
          </UFormField>
          <div class="flex justify-end gap-2 pt-2">
            <UButton type="button" color="neutral" variant="ghost" :disabled="form.pending" @click="editModalOpen = false">取消</UButton>
            <UButton type="submit" :loading="form.pending" :disabled="invalidConfiguration">保存</UButton>
          </div>
        </Form>
      </template>
    </UModal>

    <!-- 2. 关联房间管理弹窗（大视窗下拉滚动选择，单处显示已加入统计） -->
    <UModal
      v-model:open="roomsModalOpen"
      :ui="{ content: 'w-[calc(100vw-2rem)] sm:max-w-2xl' }"
    >
      <template #title>
        <div class="flex items-center gap-2">
          <span>{{ activeChannel ? `关联房间 - ${activeChannel.name}` : '关联房间' }}</span>
          <UBadge
            v-if="activeChannel"
            variant="subtle"
            size="xs"
            :class="channelStyles[activeChannel.type]?.badgeClass || defaultChannelStyle.badgeClass"
          >
            <span
              class="size-1.5 rounded-full mr-1 shrink-0"
              :class="channelStyles[activeChannel.type]?.dotClass || defaultChannelStyle.dotClass"
            />
            {{ channelNames[activeChannel.type] }}
          </UBadge>
        </div>
      </template>

      <!-- 仅在右上角唯一展示：已加入 2 / 11 个房间 -->
      <template #actions>
        <div class="text-xs text-muted mr-1">
          已加入 <strong class="text-highlighted font-semibold">{{ roomForm.data.roomIds.length }} / {{ props.allRooms.length }}</strong> 个房间
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <!-- 核心：大视窗房间选择下拉/滚动列表 -->
          <UListbox
            v-model="roomForm.data.roomIds"
            :items="props.allRooms"
            value-key="id"
            label-key="name"
            multiple
            selection-behavior="toggle"
            :filter="{ placeholder: '输入房间名或房间代码搜索...', disabled: roomForm.pending }"
            :disabled="roomForm.pending"
            virtualize
            aria-label="关联房间"
            class="w-full"
            :ui="{ content: 'h-[28rem] max-h-[60vh] overflow-y-auto' }"
          >
            <template #item-label="{ item }">
              <div class="flex items-center justify-between w-full pr-2">
                <span class="truncate font-medium text-sm">{{ item.name }}</span>
                <UBadge variant="subtle" size="xs" class="font-mono text-xs ml-2 shrink-0">{{ item.code }}</UBadge>
              </div>
            </template>
            <template #empty="{ searchTerm }">
              <div class="text-center py-16 text-xs text-muted">
                {{ searchTerm ? '未找到匹配房间' : '尚未创建任何房间' }}
              </div>
            </template>
          </UListbox>

          <!-- 弹窗底部操作栏（仅保留取消和保存） -->
          <div class="flex items-center justify-end gap-2 pt-2 border-t border-default">
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              size="xs"
              :disabled="roomForm.pending"
              @click="roomsModalOpen = false"
            >
              取消
            </UButton>
            <UButton
              size="xs"
              color="primary"
              :loading="roomForm.pending"
              @click="saveRooms"
            >
              保存关联
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- 3. 发送历史记录弹窗（复刻房间页消息弹窗样式，右上角整合翻页与总数） -->
    <UModal
      v-model:open="historyModalOpen"
      :ui="{
        content: 'w-[calc(100vw-2rem)] sm:max-w-4xl',
        header: 'flex flex-wrap items-center justify-between',
        wrapper: 'flex-1'
      }"
    >
      <template #title>
        <div class="flex items-center gap-2">
          <span>{{ activeChannel ? `发送记录 - ${activeChannel.name}` : '发送记录' }}</span>
          <UBadge
            v-if="activeChannel"
            variant="subtle"
            size="xs"
            :class="channelStyles[activeChannel.type]?.badgeClass || defaultChannelStyle.badgeClass"
          >
            <span
              class="size-1.5 rounded-full mr-1 shrink-0"
              :class="channelStyles[activeChannel.type]?.dotClass || defaultChannelStyle.dotClass"
            />
            {{ channelNames[activeChannel.type] }}
          </UBadge>
        </div>
      </template>

      <!-- 右上角翻页控制与总条数（靠右侧关闭按钮对齐，翻页在左，页码在右缓冲防误触） -->
      <template #actions>
        <div class="flex min-w-0 flex-wrap items-center gap-2.5 text-xs ml-auto mr-8">
          <UIcon v-if="channelHistoryLoading" name="i-lucide-loader-2" class="size-3.5 animate-spin text-primary" />
          <Pagination v-bind="channelHistoryData" :disabled="channelHistoryLoading" @update:page="changeChannelHistoryPage">
            <span class="text-muted whitespace-nowrap">
              共 <strong class="text-highlighted font-semibold">{{ channelHistoryData.total }}</strong> 条
            </span>
          </Pagination>
        </div>
      </template>

      <template #body>
        <div class="space-y-3">
          <!-- 消息内容展示区 (经典紧凑表格) -->
          <div class="min-h-72 max-h-[60vh] overflow-y-auto pr-0.5">
            <!-- 加载骨架占位 -->
            <div v-if="channelHistoryLoading && !channelHistoryData.items.length" class="text-center py-20 text-xs text-muted flex flex-col items-center gap-2">
              <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-primary" />
              <span>正在拉取发送记录...</span>
            </div>

            <!-- 空状态 -->
            <div v-else-if="!channelHistoryData.items.length" class="text-center py-20 text-xs text-muted border border-dashed border-default rounded-xl">
              该管道暂无任何发送记录
            </div>

            <!-- 经典紧凑二维表格 -->
            <div v-else class="rounded-xl border border-default overflow-hidden">
              <UTable
                :data="channelHistoryData.items"
                :columns="historyColumns"
                class="w-full"
                :ui="{
                  base: 'w-full min-w-[56rem] table-fixed',
                  th: 'py-2.5 px-3 text-xs font-semibold text-muted bg-muted/20 border-b border-default whitespace-nowrap',
                  td: 'py-2.5 px-3 text-xs border-b border-default whitespace-normal wrap-anywhere'
                }"
              >
                <template #id-cell="{ row }">
                  <span class="font-mono text-xs font-semibold text-muted">#{{ row.original.id }}</span>
                </template>
                <template #recordedAt-cell="{ row }">
                  <span class="font-mono text-xs text-muted whitespace-nowrap">{{ row.original.recordedAt || '-' }}</span>
                </template>
                <template #status-cell="{ row }">
                  <div class="flex items-center gap-1.5">
                    <UBadge
                      :color="row.original.status === 0 ? 'neutral' : row.original.success ? 'success' : 'error'"
                      variant="subtle"
                      size="xs"
                    >
                      {{ row.original.status === 0 ? '待发送' : row.original.success ? '成功' : '失败' }}
                    </UBadge>
                    <span v-if="row.original.result && !row.original.success" :title="row.original.result" class="text-[11px] text-error font-mono truncate max-w-[120px]">
                      {{ row.original.result }}
                    </span>
                  </div>
                </template>
                <template #content-cell="{ row }">
                  <div class="text-xs whitespace-pre-wrap font-sans bg-muted/15 p-2 rounded-md break-all max-h-28 overflow-y-auto text-highlighted">
                    {{ row.original.content || '（无消息内容）' }}
                  </div>
                </template>
                <template #actions-header>
                  <div class="w-full text-right pr-2">操作</div>
                </template>
                <template #actions-cell="{ row }">
                  <div class="flex items-center justify-end">
                    <UButton
                      v-if="row.original.content"
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-copy"
                      title="复制消息内容"
                      @click="fallbackCopy(row.original.content) && showToast('消息内容已复制！')"
                    >
                      复制
                    </UButton>
                    <span v-else class="text-muted text-xs">-</span>
                  </div>
                </template>
              </UTable>
            </div>
          </div>

          <!-- 底部关闭按钮栏 -->
          <div class="flex items-center justify-end pt-2 border-t border-default">
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              @click="historyModalOpen = false"
            >
              关闭
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- 统一确认操作弹窗 -->
    <ConfirmModal
      v-model:open="confirmState.open"
      :title="confirmState.title"
      :description="confirmState.description"
      :confirm-text="confirmState.confirmText"
      :color="confirmState.color"
      :icon="confirmState.icon"
      :loading="confirmState.loading"
      @confirm="handleConfirm"
    />
  </div>
</template>
