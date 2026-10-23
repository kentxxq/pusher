<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { Form, Link, useForm, useRouter } from '@void/vue';
import { listUrl } from '../shared/ui-navigation';
import { actionErrorMessage } from '../shared/action-error';
import type { TableColumn } from '@nuxt/ui';
import type { Props } from './rooms.server';

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

  await (router as any).visit(listUrl('/rooms', 1, keyword), { preserveState: true, replace: true });

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

function refreshRooms() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchValue.value = '';
  (router as any).visit(listUrl('/rooms', 1, ''), { preserveState: true, replace: true });
  showToast('已清空搜索并刷新数据');
}

// 表单 Actions
const roomForm = useForm('/rooms?save', { id: 0, name: '', code: '', key: '', csrf: props.csrf });
const deleteForm = useForm('/rooms?delete', { id: 0, csrf: props.csrf });
const channelForm = useForm('/rooms?channels', { id: 0, channelIds: [] as number[], csrf: props.csrf });
const sendForm = useForm('/rooms?send', { id: 0, content: '', templateCode: '', csrf: props.csrf });
const clearKeyForm = useForm('/rooms?clearKey', { id: 0, csrf: props.csrf });

// 弹窗状态 (Element-Plus 弹窗流)
const editModalOpen = ref(false);
const channelModalOpen = ref(false);
const historyModalOpen = ref(false);
const sendModalOpen = ref(false);

// 当前操作选中的房间
const activeRoom = ref<Props['list']['items'][number] | null>(null);

// Toast 提示
const toastMessage = ref('');
let toastTimer: any = null;
function showToast(msg: string) {
  toastMessage.value = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMessage.value = ''; }, 2600);
}

// 复制推送地址并触发 Toast
async function copyPushUrl(room: Props['list']['items'][number], method: 'GET' | 'POST') {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = method === 'GET'
    ? `${origin}/pusher.webapi/Room/SendMessageByGet/${room.code}?content=消息内容`
    : `${origin}/pusher.webapi/Room/SendMessageByPost/${room.code}`;

  let copied = false;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      copied = fallbackCopy(url);
    }
  } else {
    copied = fallbackCopy(url);
  }

  if (copied) {
    showToast(`已复制 ${method} 请求地址到剪贴板！`);
  }
}

function fallbackCopy(text: string): boolean {
  try {
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(input);
    return successful;
  } catch {
    return false;
  }
}

// 新建 / 编辑房间
function openEdit(room?: Props['list']['items'][number]) {
  roomForm.clearError();
  roomForm.clearErrors();
  Object.assign(roomForm.data, {
    id: room?.id ?? 0,
    name: room?.name ?? '',
    code: room?.code ?? '',
    key: ''
  });
  editModalOpen.value = true;
}

async function saveRoom() {
  roomForm.data.csrf = props.csrf;
  await roomForm.post();
  if (roomForm.wasSuccessful) {
    showToast(roomForm.data.id ? '房间信息已更新' : '新建房间成功');
    editModalOpen.value = false;
  }
}

// 删除房间
async function removeRoom(id: number, name: string) {
  if (confirm(`确认删除房间【${name}】及其所有消息记录？此操作不可恢复。`)) {
    deleteForm.data.id = id;
    deleteForm.data.csrf = props.csrf;
    await deleteForm.post();
    if (deleteForm.wasSuccessful) {
      showToast(`房间【${name}】已成功删除`);
    }
  }
}

// 关联管道弹窗
function openChannelsDialog(room: Props['list']['items'][number]) {
  activeRoom.value = room;
  channelForm.clearError();
  channelForm.clearErrors();
  channelForm.data.id = room.id;
  channelForm.data.csrf = props.csrf;
  channelForm.data.channelIds = [...(props.relations[room.id] || [])];
  channelModalOpen.value = true;
}

async function saveChannels() {
  channelForm.data.csrf = props.csrf;
  await channelForm.post();
  if (channelForm.wasSuccessful) {
    showToast('管道关联已成功更新！');
    channelModalOpen.value = false;
  }
}

// 发送测试弹窗
function openSendDialog(room: Props['list']['items'][number]) {
  activeRoom.value = room;
  sendForm.clearError();
  sendForm.clearErrors();
  sendForm.data.id = room.id;
  sendForm.data.csrf = props.csrf;
  sendForm.data.content = '测试消息\nby pusher';
  sendForm.data.templateCode = '';
  sendModalOpen.value = true;
}

async function submitSend() {
  sendForm.data.csrf = props.csrf;
  await sendForm.post();
  if (sendForm.wasSuccessful) {
    showToast('测试消息已成功发送至关联管道！');
    sendModalOpen.value = false;
  }
}

// 1-click 直接快速测试推送
async function sendOneClickTest(room: Props['list']['items'][number]) {
  sendForm.clearError();
  sendForm.clearErrors();
  sendForm.data.id = room.id;
  sendForm.data.csrf = props.csrf;
  sendForm.data.content = `测试消息\n来自房间: ${room.name}\nby pusher`;
  sendForm.data.templateCode = '';
  await sendForm.post();
  if (sendForm.wasSuccessful) {
    showToast(`已向房间【${room.name}】发送测试消息！`);
  }
}

// 清除密钥
async function clearKey(roomId: number, roomName: string) {
  if (confirm(`清除房间【${roomName}】的密钥后，无需密钥即可推送。确认清除？`)) {
    clearKeyForm.data.id = roomId;
    clearKeyForm.data.csrf = props.csrf;
    await clearKeyForm.post();
    if (clearKeyForm.wasSuccessful) {
      showToast('房间密钥已清除');
    }
  }
}

// 消息记录弹窗
function openHistoryDialog(room: Props['list']['items'][number]) {
  activeRoom.value = room;
  historyModalOpen.value = true;
}

// 表格列定义
type Row = Props['list']['items'][number];
const columns: TableColumn<Row>[] = [
  { accessorKey: 'name', header: '房间名称' },
  { accessorKey: 'code', header: '房间代码' },
  { accessorKey: 'hasKey', header: '安全密钥' },
  { id: 'actions', header: '操作' }
];
</script>

<template>
  <div class="w-full space-y-4">
    <!-- 顶部标题栏 -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-semibold text-highlighted">房间管理</h1>
      <UButton icon="i-lucide-plus" @click="openEdit()">新建房间</UButton>
    </div>

    <!-- 主表格卡片：默认使用所有的空间 w-full -->
    <UCard class="w-full overflow-hidden" :ui="{ body: 'p-0 sm:p-0' }">
      <div class="p-4 sm:p-5 border-b border-default">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <form method="get" action="/rooms" class="flex items-center gap-2 m-0" @submit.prevent="triggerSearch(searchValue)">
            <UInput
              v-model="searchValue"
              name="search"
              placeholder="搜索房间名称或代码"
              aria-label="搜索房间名称或代码"
              class="w-56 sm:w-64"
              @input="onSearchInput"
            />
            <UButton
              type="button"
              variant="outline"
              color="neutral"
              icon="i-lucide-refresh-cw"
              title="刷新列表并清空搜索"
              @click="refreshRooms"
            >
              刷新
            </UButton>
          </form>
          <div class="flex items-center gap-3 text-xs text-muted whitespace-nowrap">
            <span>共 <span class="font-semibold text-highlighted">{{ list.total }}</span> 个房间 · 第 <span class="font-semibold text-highlighted">{{ list.page }}</span> 页</span>
            <div class="flex items-center gap-1.5">
              <Link
                v-if="list.page > 1"
                :href="listUrl('/rooms', list.page - 1, search)"
                class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-default bg-elevated hover:bg-muted/40 text-highlighted transition-colors"
              >
                <UIcon name="i-lucide-chevron-left" class="size-3.5" />
                <span>上一页</span>
              </Link>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-default/40 bg-muted/10 text-muted/40 cursor-not-allowed"
              >
                <UIcon name="i-lucide-chevron-left" class="size-3.5" />
                <span>上一页</span>
              </span>

              <Link
                v-if="list.page * list.pageSize < list.total"
                :href="listUrl('/rooms', list.page + 1, search)"
                class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-default bg-elevated hover:bg-muted/40 text-highlighted transition-colors"
              >
                <span>下一页</span>
                <UIcon name="i-lucide-chevron-right" class="size-3.5" />
              </Link>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-default/40 bg-muted/10 text-muted/40 cursor-not-allowed"
              >
                <span>下一页</span>
                <UIcon name="i-lucide-chevron-right" class="size-3.5" />
              </span>
            </div>
          </div>
        </div>
        <p v-if="deleteForm.error" class="whitespace-pre-wrap text-sm text-error mt-2">{{ actionErrorMessage(deleteForm.error) }}</p>
      </div>

      <!-- 表格全宽展示 -->
      <div class="w-full overflow-x-auto">
        <UTable
          :data="list.items"
          :columns="columns"
          empty="暂无房间记录"
          :sorting-options="{ enableSorting: false }"
          class="w-full"
          :ui="{
            base: 'w-full min-w-full table-auto',
            th: 'py-3.5 px-4 text-xs font-semibold text-muted bg-muted/20 border-b border-default whitespace-nowrap',
            td: 'py-3.5 px-4 text-sm border-b border-default'
          }"
        >
          <!-- 房间名称列：不再包含进入详情页的链接，也不再显示管道数量徽标 -->
          <template #name-cell="{ row }">
            <span class="font-medium text-highlighted whitespace-normal">{{ row.original.name }}</span>
          </template>

          <!-- 房间代码列 -->
          <template #code-cell="{ row }">
            <div class="flex items-center gap-1.5 font-mono text-xs text-muted whitespace-nowrap">
              <span>{{ row.original.code }}</span>
              <UButton
                icon="i-lucide-copy"
                size="xs"
                color="neutral"
                variant="ghost"
                title="复制房间代码"
                @click="fallbackCopy(row.original.code) && showToast('房间代码已复制！')"
              />
            </div>
          </template>

          <!-- 安全密钥列：保持不折行，避免与操作栏挤压 -->
          <template #hasKey-cell="{ row }">
            <div class="flex items-center gap-2 whitespace-nowrap shrink-0">
              <UBadge :color="row.original.hasKey ? 'warning' : 'neutral'" variant="subtle" size="xs">
                {{ row.original.hasKey ? '已加密' : '公开' }}
              </UBadge>
              <UButton
                v-if="row.original.hasKey"
                size="xs"
                color="error"
                variant="ghost"
                title="清除房间密钥"
                @click="clearKey(row.original.id, row.original.name)"
              >
                清除
              </UButton>
            </div>
          </template>

          <!-- 操作列表头：靠右对齐 -->
          <template #actions-header>
            <div class="w-full text-right pr-2 whitespace-nowrap">操作</div>
          </template>

          <!-- 操作按钮栏：靠右定格对齐，增加左侧间距防止挤压，管道数直接显示在按钮上 -->
          <template #actions-cell="{ row }">
            <div class="flex items-center justify-end gap-1.5 flex-nowrap whitespace-nowrap pl-6 ml-auto shrink-0">
              <UButton size="xs" variant="soft" color="primary" icon="i-lucide-cable" @click="openChannelsDialog(row.original)">
                关联管道 ({{ props.relations[row.original.id]?.length || 0 }})
              </UButton>
              <UButton size="xs" variant="outline" color="neutral" icon="i-lucide-pencil" @click="openEdit(row.original)">
                修改
              </UButton>
              <UButton
                size="xs"
                variant="soft"
                color="success"
                icon="i-lucide-send"
                :loading="sendForm.pending && sendForm.data.id === row.original.id"
                @click="sendOneClickTest(row.original)"
              >
                发送测试
              </UButton>
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-lucide-link"
                title="复制 GET 请求地址"
                @click="copyPushUrl(row.original, 'GET')"
              >
                复制 GET
              </UButton>
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-lucide-terminal"
                title="复制 POST 请求地址"
                @click="copyPushUrl(row.original, 'POST')"
              >
                复制 POST
              </UButton>
              <UButton size="xs" variant="soft" color="neutral" icon="i-lucide-history" @click="openHistoryDialog(row.original)">
                消息记录
              </UButton>
              <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="removeRoom(row.original.id, row.original.name)">
                删除
              </UButton>
            </div>
          </template>
        </UTable>
      </div>
    </UCard>

    <!-- ======================================================== -->
    <!-- Element-Plus 经典弹窗群                                   -->
    <!-- ======================================================== -->

    <!-- 1. 新建 / 修改房间弹窗 -->
    <UModal
      v-model:open="editModalOpen"
      :title="roomForm.data.id ? '修改房间' : '新建房间'"
      :dismissible="!roomForm.pending"
      :close="!roomForm.pending"
    >
      <template #body>
        <Form :form="{ ...roomForm, post: saveRoom }" :render-error="actionErrorMessage" class="grid gap-4">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField label="房间名称" :error="roomForm.errors.name">
              <UInput v-model="roomForm.data.name" placeholder="请输入房间名称" class="w-full" />
            </UFormField>
            <UFormField label="房间代码（留空自动生成）" :error="roomForm.errors.code">
              <UInput v-model="roomForm.data.code" placeholder="如：my-room" class="w-full" />
            </UFormField>
          </div>
          <UFormField label="房间密钥（留空则不设密钥，修改时留空保留旧密码）" :error="roomForm.errors.key">
            <UInput v-model="roomForm.data.key" type="password" autocomplete="new-password" placeholder="推送时需携带 roomKey 参数" class="w-full" />
          </UFormField>
          <div class="flex justify-end gap-2 pt-2">
            <UButton type="button" color="neutral" variant="ghost" :disabled="roomForm.pending" @click="editModalOpen = false">取消</UButton>
            <UButton type="submit" :loading="roomForm.pending">确认保存</UButton>
          </div>
        </Form>
      </template>
    </UModal>

    <!-- 2. 关联管道弹窗 -->
    <UModal
      v-model:open="channelModalOpen"
      :title="activeRoom ? `关联管道 - ${activeRoom.name}` : '关联管道'"
      :ui="{ content: 'max-w-lg' }"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-xs text-muted">勾选该房间需要向哪些管道广播推送消息：</p>
          <UListbox
            v-model="channelForm.data.channelIds"
            :items="props.channels"
            value-key="id"
            label-key="name"
            multiple
            selection-behavior="toggle"
            :filter="{ placeholder: '搜索管道名称', disabled: channelForm.pending }"
            :disabled="channelForm.pending"
            virtualize
            aria-label="关联管道"
            :ui="{ content: 'h-64 overflow-y-auto' }"
          >
            <template #item-label="{ item }"><span :title="item.name">{{ item.name }}</span></template>
            <template #empty="{ searchTerm }">{{ searchTerm ? '未找到匹配管道' : '尚未创建任何管道' }}</template>
          </UListbox>
          <div class="flex items-center justify-between pt-2">
            <span class="text-xs text-muted">已选 {{ channelForm.data.channelIds.length }} 个管道</span>
            <div class="flex gap-2">
              <UButton type="button" color="neutral" variant="ghost" :disabled="channelForm.pending" @click="channelModalOpen = false">取消</UButton>
              <UButton :loading="channelForm.pending" @click="saveChannels">保存关联</UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- 3. 发送测试消息弹窗 -->
    <UModal
      v-model:open="sendModalOpen"
      :title="activeRoom ? `发送测试信息 - ${activeRoom.name}` : '发送测试信息'"
    >
      <template #body>
        <Form :form="{ ...sendForm, post: submitSend }" :render-error="actionErrorMessage" class="grid gap-4">
          <UFormField label="消息内容" :error="sendForm.errors.content">
            <UTextarea v-model="sendForm.data.content" rows="4" class="w-full" />
          </UFormField>
          <UFormField label="模板代码（可选）">
            <UInput v-model="sendForm.data.templateCode" placeholder="留空使用原始正文" class="w-full" />
          </UFormField>
          <div class="flex justify-end gap-2 pt-2">
            <UButton type="button" color="neutral" variant="ghost" :disabled="sendForm.pending" @click="sendModalOpen = false">取消</UButton>
            <UButton type="submit" :loading="sendForm.pending">立即发送</UButton>
          </div>
        </Form>
      </template>
    </UModal>

    <!-- 4. 消息记录弹窗 -->
    <UModal
      v-model:open="historyModalOpen"
      :title="activeRoom ? `消息记录 - ${activeRoom.name}` : '消息记录'"
      :ui="{ content: 'max-w-2xl' }"
    >
      <template #body>
        <div class="space-y-3">
          <div v-if="activeRoom && props.recentMessages[activeRoom.id]?.length" class="divide-y divide-default max-h-96 overflow-y-auto">
            <div v-for="m in props.recentMessages[activeRoom.id]" :key="m.id" class="py-2.5 space-y-1">
              <div class="flex items-center justify-between text-xs text-muted">
                <span class="font-mono">ID: #{{ m.id }}</span>
                <span>{{ m.recordedAt }}</span>
              </div>
              <div class="text-xs text-highlighted whitespace-pre-wrap bg-muted/20 p-2.5 rounded-md font-sans">
                {{ m.content }}
              </div>
            </div>
          </div>
          <div v-else class="text-center py-10 text-xs text-muted">
            暂无消息记录
          </div>
          <div class="flex justify-end items-center pt-2">
            <UButton color="neutral" variant="ghost" size="xs" @click="historyModalOpen = false">关闭</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- 顶层 Toast 消息提示通知（复制 URL、操作反馈） -->
    <transition
      enter-active-class="transform ease-out duration-250 transition"
      enter-from-class="-translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="-translate-y-4 opacity-0"
    >
      <div
        v-if="toastMessage"
        class="fixed top-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-neutral-900/95 text-white dark:bg-white dark:text-neutral-950 px-4 py-3 shadow-2xl backdrop-blur-md text-xs font-medium border border-white/10 dark:border-neutral-900/10 pointer-events-none"
      >
        <UIcon name="i-lucide-check-circle-2" class="size-4.5 text-green-500 shrink-0" />
        <span>{{ toastMessage }}</span>
      </div>
    </transition>
  </div>
</template>
